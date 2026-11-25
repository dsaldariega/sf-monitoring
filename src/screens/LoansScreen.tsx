import { Text } from 'react-native';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';

export function LoansScreen() {
  return (
    <ScreenLayout
      title="Loans"
      description="Register and review member loans, terms, and outstanding balances."
    >
      <SectionCard title="Loan records" subtitle="Loan registration and editing will be added in a later phase.">
        <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 20 }}>
          No loan records yet. Your member and loan information will be stored locally on this device.
        </Text>
      </SectionCard>
    </ScreenLayout>
  );
}
