import { Text } from 'react-native';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';

export function SettingsScreen() {
  return (
    <ScreenLayout
      title="Settings"
      description="Manage app preferences, data protection, and local backups."
    >
      <SectionCard title="Device storage" subtitle="The app is designed to work offline using a local database.">
        <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 20 }}>
          SQLite setup, database backup, and restore controls will be added in upcoming phases.
        </Text>
      </SectionCard>
      <SectionCard title="Privacy by design" subtitle="No cloud sync or remote database is configured.">
        <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 20 }}>
          Financial records are intended to remain on the custodian's device. Keep regular backups in a secure location.
        </Text>
      </SectionCard>
    </ScreenLayout>
  );
}
