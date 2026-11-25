import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { ConfirmModal } from '../components/ConfirmModal';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';
import { exportDatabaseBackup, restoreDatabaseBackup } from '../services/backupService';

export function SettingsScreen() {
  const db = useSQLiteContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [backupConfirmVisible, setBackupConfirmVisible] = useState(false);
  const [restoreConfirmVisible, setRestoreConfirmVisible] = useState(false);

  const handleBackup = async () => {
    setBackupConfirmVisible(false);
    setError('');
    setBusy(true);
    try {
      await exportDatabaseBackup(db);
      Alert.alert('Backup ready', 'The database backup was prepared. Use the Android share sheet to save it somewhere secure.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create the database backup.');
    } finally { setBusy(false); }
  };

  const handleRestore = async () => {
    setRestoreConfirmVisible(false);
    setError('');
    setBusy(true);
    try {
      const restored = await restoreDatabaseBackup(db);
      if (restored) {
        Alert.alert('Database restored', 'The selected backup is now the active local database.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to restore the selected backup.');
    } finally { setBusy(false); }
  };

  return (
    <ScreenLayout title="Settings" description="Manage local data protection and database backups.">
      <SectionCard title="Database backup" subtitle="Create or restore a complete SQLite database containing members, loans, payments, Fund records, and reports.">
        <Pressable style={[styles.primaryButton, busy && styles.disabled]} disabled={busy} onPress={() => setBackupConfirmVisible(true)}>
          <Text style={styles.primaryButtonText}>{busy ? 'Working…' : 'Backup database'}</Text>
        </Pressable>
        <Pressable style={[styles.secondaryButton, busy && styles.disabled]} disabled={busy} onPress={() => setRestoreConfirmVisible(true)}>
          <Text style={styles.secondaryButtonText}>Restore database</Text>
        </Pressable>
        <Text style={styles.hint}>Backups are full local database snapshots. Store them somewhere secure and test a restore periodically.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </SectionCard>

      <SectionCard title="Privacy by design" subtitle="No cloud sync or remote database is configured.">
        <Text style={styles.hint}>Financial records are intended to remain on the custodian's device. Database backups contain confidential financial data and should be handled securely.</Text>
      </SectionCard>

      <ConfirmModal visible={backupConfirmVisible} title="Back up database?"
        message="A complete copy of the current local database will be prepared for sharing. The backup may contain confidential member, loan, payment, Fund, and report records. Nothing in the current database will be changed."
        confirmLabel="Create backup" onConfirm={() => void handleBackup()} onCancel={() => setBackupConfirmVisible(false)} busy={busy} />

      <ConfirmModal visible={restoreConfirmVisible} title="Restore database?"
        message="Restoring a backup will replace the current local database with the selected backup. Any records currently on this device that are not in the backup will be lost. If you need the current data, create a backup first."
        confirmLabel="Choose backup" onConfirm={() => void handleRestore()} onCancel={() => setRestoreConfirmVisible(false)} busy={busy} destructive />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  primaryButton: { minHeight: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondaryButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButtonText: { color: theme.colors.primary, fontSize: 14, fontWeight: '800' },
  hint: { color: theme.colors.muted, fontSize: 12, lineHeight: 18 },
  error: { color: '#B42318', fontSize: 12, lineHeight: 18 },
  disabled: { opacity: 0.45 },
});
