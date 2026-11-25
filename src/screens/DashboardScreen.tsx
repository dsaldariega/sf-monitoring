import { useCallback, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { MetricCard } from '../components/MetricCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';
import { currentPeriodMonth, getMonthlySummary, type MonthlySummary } from '../services/reportService';
import { currentSinkingFundWeek, getWeeklySinkingFundSummary, type WeeklySinkingFundSummary } from '../services/sinkingFundService';
import { formatCentavos } from '../utils/money';
import { getFundSummary, type FundSummary } from '../services/fundService';

export function DashboardScreen() {
  const db = useSQLiteContext();
  const [loanSummary, setLoanSummary] = useState<MonthlySummary | null>(null);
  const [sinkingFund, setSinkingFund] = useState<WeeklySinkingFundSummary | null>(null);
  const [fund, setFund] = useState<FundSummary | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setError('');
      const [nextLoanSummary, nextSinkingFund, nextFund] = await Promise.all([
        getMonthlySummary(db, currentPeriodMonth()),
        getWeeklySinkingFundSummary(db, currentSinkingFundWeek()),
        getFundSummary(db),
      ]);
      setLoanSummary(nextLoanSummary);
      setSinkingFund(nextSinkingFund);
      setFund(nextFund);
    } catch {
      setError('Unable to load dashboard figures from this device.');
    }
  }, [db]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const weeklyTarget = sinkingFund?.targetCentavos ?? 0;
  const weeklyCollected = sinkingFund?.collectedCentavos ?? 0;
  const weeklyProgress = weeklyTarget > 0
    ? Math.min(100, (weeklyCollected / weeklyTarget) * 100)
    : 0;

  const monthlyLoanTarget = loanSummary?.installmentTargetCentavos ?? 0;
  const monthlyLoanCollected = loanSummary?.collectedCentavos ?? 0;

  return (
    <ScreenLayout
      title="Dashboard"
      description="Weekly Sinking Fund collection at a glance, with the loan portfolio and fund balance kept separate."
    >
      <View style={styles.weekBanner}>
        <Text style={styles.bannerLabel}>CURRENT SINKING FUND WEEK</Text>
        <Text style={styles.bannerValue}>{sinkingFund?.weekStart ?? currentSinkingFundWeek()}</Text>
        <Text style={styles.bannerHint}>Strict weekly contribution: ₱50 per registered head.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.metrics}>
        <MetricCard label="Total heads" value={String(sinkingFund?.totalHeads ?? 0)} helper="Active registered heads" />
        <MetricCard label="Weekly target" value={formatCentavos(weeklyTarget)} helper="₱50 × total heads" />
        <MetricCard label="Weekly collected" value={formatCentavos(weeklyCollected)} helper="Current week" emphasized />
        <MetricCard label="Weekly remaining" value={formatCentavos(sinkingFund?.remainingCentavos ?? 0)} helper="Still to collect" />
      </View>

      <SectionCard title="Sinking Fund collection" subtitle="The weekly contribution is the recurring source of funds that builds the pool available for loans.">
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${weeklyProgress}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.muted}>{formatCentavos(weeklyCollected)} collected</Text>
          <Text style={styles.muted}>{formatCentavos(weeklyTarget)} target</Text>
        </View>
        <Text style={styles.progressPercent}>{weeklyProgress.toFixed(1)}% collected this week</Text>
      </SectionCard>

      <View style={styles.metrics}>
        <MetricCard label="Active loans" value={String(loanSummary?.activeLoans ?? 0)} helper="Current borrowers" />
        <MetricCard label="Loan monthly target" value={formatCentavos(monthlyLoanTarget)} helper="Scheduled loan installments" />
        <MetricCard label="Loan collected" value={formatCentavos(monthlyLoanCollected)} helper="Loan payments this month" />
        <MetricCard label="Available fund" value={formatCentavos(fund?.availableBalanceCentavos ?? 0)} helper="Current ledger balance" emphasized />
      </View>

      <SectionCard title="Loan portfolio" subtitle="Loan reporting is separate from the weekly Sinking Fund collection.">
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Principal released this month</Text>
          <Text style={styles.rowValue}>{formatCentavos(loanSummary?.principalReleasedCentavos ?? 0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Interest expected this month</Text>
          <Text style={styles.rowValue}>{formatCentavos(loanSummary?.interestExpectedCentavos ?? 0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Outstanding loan portfolio</Text>
          <Text style={styles.rowValue}>{formatCentavos(loanSummary?.portfolioOutstandingCentavos ?? 0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Overdue installments</Text>
          <Text style={styles.rowValue}>{String(loanSummary?.overdueInstallments ?? 0)}</Text>
        </View>
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  weekBanner: { backgroundColor: theme.colors.accent, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: 6 },
  bannerLabel: { color: theme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  bannerValue: { color: theme.colors.primaryDark, fontSize: 21, fontWeight: '900' },
  bannerHint: { color: theme.colors.muted, fontSize: 12, lineHeight: 18 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  progressTrack: { height: 9, backgroundColor: theme.colors.accent, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: theme.colors.muted, fontSize: 11 },
  progressPercent: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  rowLabel: { color: theme.colors.muted, fontSize: 12, flex: 1 },
  rowValue: { color: theme.colors.text, fontSize: 12, fontWeight: '800' },
  error: { color: '#B42318', fontSize: 12 },
});
