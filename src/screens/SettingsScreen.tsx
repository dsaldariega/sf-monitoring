import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { ConfirmModal } from '../components/ConfirmModal';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';
import { useToast } from '../components/ToastProvider';
import { exportDatabaseBackup, listDatabaseBackups, restoreDatabaseBackup, type DatabaseBackupFile } from '../services/backupService';

export function SettingsScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [backupConfirmVisible, setBackupConfirmVisible] = useState(false);
  const [restoreConfirmVisible, setRestoreConfirmVisible] = useState(false);
  const [backups, setBackups] = useState<DatabaseBackupFile[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<DatabaseBackupFile | null>(null);

  const refreshBackups = () => {
    try {
      setBackups(listDatabaseBackups());
    } catch {
      setBackups([]);
    }
  };

  useEffect(() => {
    refreshBackups();
  }, []);

  const handleBackup = async () => {
    setBackupConfirmVisible(false);
    setError('');
    setBusy(true);
    try {
      await exportDatabaseBackup(db);
      refreshBackups();
      showToast('Database backup created and saved in the app backup folder.', 'success');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to create the database backup.';
      setError(message);
      showToast(message, 'error');
    } finally { setBusy(false); }
  };

  const handleRestore = async () => {
    setRestoreConfirmVisible(false);
    setError('');
    setBusy(true);
    try {
      const restored = await restoreDatabaseBackup(db, selectedBackup?.name);
      if (restored) {
        setSelectedBackup(null);
        showToast('Database restored successfully. The selected backup is now active.', 'success');
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to restore the selected backup.';
      setError(message);
      showToast(message, 'error');
    } finally { setBusy(false); }
  };

  return (
    <ScreenLayout title="Settings" description="Manage local data protection and database backups.">
      <SectionCard title="Database backup" subtitle="Create or restore a complete SQLite database containing members, loans, payments, Fund records, and reports.">
        <Text style={styles.folderLabel}>Saved backups on this device</Text>
        {backups.length === 0 ? (
          <Text style={styles.hint}>No saved database backups in the app backup folder yet.</Text>
        ) : (
          backups.map(backup => (
            <View key={backup.name} style={styles.backupRow}>
              <View style={styles.backupInfo}>
                <Text style={styles.backupName}>{backup.name}</Text>
                <Text style={styles.hint}>
                  {Math.max(1, Math.round(backup.sizeBytes / 1024))} KB
                  {backup.modifiedAt ? ` · ${new Date(backup.modifiedAt).toLocaleString('en-PH')}` : ''}
                </Text>
              </View>
              <Pressable
                style={styles.restoreSavedButton}
                disabled={busy}
                onPress={() => {
                  setSelectedBackup(backup);
                  setRestoreConfirmVisible(true);
                }}
              >
                <Text style={styles.restoreSavedButtonText}>Restore</Text>
              </Pressable>
            </View>
          ))
        }
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
        message="A complete copy of the current local database will be prepared for sharing and retained in the app's private backup folder. The backup may contain confidential member, loan, payment, Fund, and report records. Nothing in the current database will be changed."
        confirmLabel="Create backup" onConfirm={() => void handleBackup()} onCancel={() => setBackupConfirmVisible(false)} busy={busy} />

      <ConfirmModal visible={restoreConfirmVisible} title="Restore database?"
        message={selectedBackup
          ? `Restoring ${selectedBackup.name} will replace the current local database with that saved backup. Any records currently on this device that are not in the backup will be lost.`
          : "Restoring a backup will replace the current local database with the selected file. Any records currently on this device that are not in the backup will be lost. If you need the current data, create a backup first."}
        confirmLabel={selectedBackup ? 'Restore saved backup' : 'Choose backup'} onConfirm={() => void handleRestore()} onCancel={() => { setRestoreConfirmVisible(false); setSelectedBackup(null); }} busy={busy} destructive />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  folderLabel: { color: theme.colors.text, fontSize: 12, fontWeight: '900' },
  backupRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 10, gap: 7 },
  backupInfo: { gap: 3 },
  backupName: { color: theme.colors.text, fontSize: 11, fontWeight: '800' },
  restoreSavedButton: { alignSelf: 'flex-start', minHeight: 38, borderRadius: 10, backgroundColor: theme.colors.accent, borderWidth: 1, borderColor: theme.colors.primary, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  restoreSavedButtonText: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  primaryButton: { minHeight: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondaryButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButtonText: { color: theme.colors.primary, fontSize: 14, fontWeight: '800' },
  hint: { color: theme.colors.muted, fontSize: 12, lineHeight: 18 },
  error: { color: '#B42318', fontSize: 12, lineHeight: 18 },
  disabled: { opacity: 0.45 },
});
