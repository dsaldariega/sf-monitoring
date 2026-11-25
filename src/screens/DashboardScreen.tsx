import { StyleSheet, Text, View } from 'react-native';
import { MetricCard } from '../components/MetricCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';

export function DashboardScreen() {
  return (
    <ScreenLayout
      title="Dashboard"
      description="A clear overview of the sinking fund and current loan portfolio."
    >
      <View style={styles.monthBanner}>
        <Text style={styles.monthLabel}>MONITORING PERIOD</Text>
        <Text style={styles.monthValue}>Current month</Text>
        <Text style={styles.monthHint}>Monthly figures will appear here once records are added.</Text>
      </View>

      <View style={styles.metrics}>
        <MetricCard label="Active loans" value="—" helper="Current borrowers" />
        <MetricCard label="Monthly target" value="₱0.00" helper="Expected collection" />
        <MetricCard label="Actual collected" value="₱0.00" helper="Payments recorded" emphasized />
        <MetricCard label="Outstanding" value="₱0.00" helper="Remaining loan balance" />
      </View>

      <SectionCard title="Monthly collection" subtitle="Compare the expected amount with actual collections.">
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.muted}>₱0.00 collected</Text>
          <Text style={styles.muted}>₱0.00 target</Text>
        </View>
      </SectionCard>

      <SectionCard title="Quick overview" subtitle="Your records stay on this device. No cloud account is connected.">
        <Text style={styles.note}>Start by adding a loan in the Loans tab. Monthly monitoring and reports will use the records entered on this device.</Text>
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  monthBanner: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: 6,
  },
  monthLabel: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  monthValue: {
    color: theme.colors.primaryDark,
    fontSize: 21,
    fontWeight: '800',
  },
  monthHint: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  progressTrack: {
    height: 9,
    backgroundColor: theme.colors.accent,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    width: '0%',
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  muted: {
    color: theme.colors.muted,
    fontSize: 11,
  },
  note: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
});
