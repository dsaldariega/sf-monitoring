import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';
import {
  exportDatabaseBackup,
  restoreDatabaseBackup,
} from '../services/backupService';

export function SettingsScreen() {
  const db = useSQLiteContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleBackup = async () => {
    setError('');
    setBusy(true);
    try {
      await exportDatabaseBackup(db);
      Alert.alert(
        'Backup ready',
        'The database backup was prepared. Use the Android share sheet to save it somewhere secure.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create the database backup.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore database?',
      'This replaces all current local records with the selected backup. The current data cannot be recovered unless you have another backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose backup',
          style: 'destructive',
          onPress: async () => {
            setError('');
            setBusy(true);
            try {
              await restoreDatabaseBackup(db);
              Alert.alert('Database restored', 'The selected backup is now the active local database.');
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Unable to restore the selected backup.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenLayout
      title="Settings"
      description="Manage local data protection and database backups."
    >
      <SectionCard
        title="Database backup"
        subtitle="Create a complete SQLite backup containing members, loans, payments, fund records, and reports."
      >
        <Pressable
          style={[styles.primaryButton, busy && styles.disabled]}
          disabled={busy}
          onPress={() => void handleBackup()}
        >
          <Text style={styles.primaryButtonText}>
            {busy ? 'Working…' : 'Backup database'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, busy && styles.disabled]}
          disabled={busy}
          onPress={handleRestore}
        >
          <Text style={styles.secondaryButtonText}>Restore database</Text>
        </Pressable>

        <Text style={styles.hint}>
          Backups are full local database snapshots. Store them somewhere secure and test a restore periodically.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </SectionCard>

      <SectionCard
        title="Privacy by design"
        subtitle="No cloud sync or remote database is configured."
      >
        <Text style={styles.hint}>
          Financial records are intended to remain on the custodian's device. Database backups contain confidential financial data and should be handled securely.
        </Text>
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: theme.colors.primary, fontSize: 14, fontWeight: '800' },
  hint: { color: theme.colors.muted, fontSize: 12, lineHeight: 18 },
  error: { color: '#B42318', fontSize: 12, lineHeight: 18 },
  disabled: { opacity: 0.45 },
});
