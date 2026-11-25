import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
  emphasized?: boolean;
};

export function MetricCard({ label, value, helper, emphasized = false }: MetricCardProps) {
  return (
    <View style={[styles.card, emphasized && styles.emphasized]}>
      <Text style={[styles.label, emphasized && styles.emphasizedText]}>{label}</Text>
      <Text style={[styles.value, emphasized && styles.emphasizedText]}>{value}</Text>
      <Text style={[styles.helper, emphasized && styles.emphasizedHelper]}>{helper}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: 7,
  },
  emphasized: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  label: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  helper: {
    color: theme.colors.muted,
    fontSize: 11,
  },
  emphasizedText: {
    color: '#FFFFFF',
  },
  emphasizedHelper: {
    color: '#D6EAE2',
  },
});
