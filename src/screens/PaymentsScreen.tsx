import { Text } from 'react-native';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';

export function PaymentsScreen() {
  return (
    <ScreenLayout
      title="Payments"
      description="Record collections and track how each payment is allocated."
    >
      <SectionCard title="Payment records" subtitle="Payment entry and allocation will be implemented in a later phase.">
        <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 20 }}>
          No payments recorded. Partial and multiple payments will be supported.
        </Text>
      </SectionCard>
    </ScreenLayout>
  );
}
