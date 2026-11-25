import { Text } from 'react-native';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';

export function ReportsScreen() {
  return (
    <ScreenLayout
      title="Reports"
      description="Review monthly sinking fund summaries and historical reports."
    >
      <SectionCard title="Monthly reports" subtitle="Report generation and finalized monthly snapshots will be added in a later phase.">
        <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 20 }}>
          No monthly reports available yet. Finalized reports will preserve the figures recorded for that period.
        </Text>
      </SectionCard>
    </ScreenLayout>
  );
}
