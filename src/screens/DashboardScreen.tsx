import { useCallback, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { MetricCard } from '../components/MetricCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';
import { currentPeriodMonth, getMonthlySummary, type MonthlySummary } from '../services/reportService';
import { formatCentavos } from '../utils/money';
import { getFundSummary, type FundSummary } from '../services/fundService';

export function DashboardScreen() {
  const db = useSQLiteContext();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [fund, setFund] = useState<FundSummary | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setError('');
      const [nextSummary, nextFund] = await Promise.all([
        getMonthlySummary(db, currentPeriodMonth()),
        getFundSummary(db),
      ]);
      setSummary(nextSummary);
      setFund(nextFund);
    } catch {
      setError('Unable to load dashboard figures from this device.');
    }
  }, [db]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const target = summary?.installmentTargetCentavos ?? 0;
  const collected = summary?.collectedCentavos ?? 0;
  const progress = target > 0 ? Math.min(100, (collected / target) * 100) : 0;

  return (
    <ScreenLayout title="Dashboard" description="A clear overview of the sinking fund and current loan portfolio.">
      <View style={styles.monthBanner}>
        <Text style={styles.monthLabel}>MONITORING PERIOD</Text>
        <Text style={styles.monthValue}>{new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</Text>
        <Text style={styles.monthHint}>Figures are calculated from the records stored on this device.</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.metrics}>
        <MetricCard label="Active loans" value={String(summary?.activeLoans ?? 0)} helper="Current borrowers" />
        <MetricCard label="Monthly target" value={formatCentavos(target)} helper="Scheduled installments" />
        <MetricCard label="Actual collected" value={formatCentavos(collected)} helper="Payments received this month" emphasized />
        <MetricCard label="Outstanding" value={formatCentavos(summary?.portfolioOutstandingCentavos ?? 0)} helper="Remaining loan portfolio" />
        <MetricCard label="Available fund" value={formatCentavos(fund?.availableBalanceCentavos ?? 0)} helper="Current ledger balance" emphasized />
      </View>
      <SectionCard title="Monthly collection" subtitle="Cash collections compared with installment amounts scheduled for this month.">
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.muted}>{formatCentavos(collected)} collected</Text>
          <Text style={styles.muted}>{formatCentavos(target)} target</Text>
        </View>
        <Text style={styles.progressPercent}>{progress.toFixed(1)}% of scheduled installments collected</Text>
      </SectionCard>
      <View style={styles.metrics}>
        <MetricCard label="Interest expected" value={formatCentavos(summary?.interestExpectedCentavos ?? 0)} helper="Monthly interest estimate" />
        <MetricCard label="Overdue installments" value={String(summary?.overdueInstallments ?? 0)} helper="Unpaid installments before this month" />
      </View>
      <SectionCard title="Portfolio snapshot" subtitle="The outstanding figure includes unpaid scheduled amounts and assessed penalties.">
        <View style={styles.row}><Text style={styles.rowLabel}>Principal released this month</Text><Text style={styles.rowValue}>{formatCentavos(summary?.principalReleasedCentavos ?? 0)}</Text></View>
        <View style={styles.row}><Text style={styles.rowLabel}>Remaining due gap this month*</Text><Text style={styles.rowValue}>{formatCentavos(summary?.dueGapCentavos ?? 0)}</Text></View>
        <Text style={styles.footnote}>*This is a simple comparison of monthly cash collections against installments scheduled this month. Payments may also settle earlier installments.</Text>
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  monthBanner: { backgroundColor: theme.colors.accent, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: 6 },
  monthLabel: { color: theme.colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  monthValue: { color: theme.colors.primaryDark, fontSize: 21, fontWeight: '800' },
  monthHint: { color: theme.colors.muted, fontSize: 12, lineHeight: 18 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  progressTrack: { height: 9, backgroundColor: theme.colors.accent, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: theme.colors.muted, fontSize: 11 },
  progressPercent: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  rowLabel: { color: theme.colors.muted, fontSize: 12, flex: 1 },
  rowValue: { color: theme.colors.text, fontSize: 12, fontWeight: '800' },
  footnote: { color: theme.colors.muted, fontSize: 10, lineHeight: 15 },
  error: { color: '#B42318', fontSize: 12 },
});
