import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getMonthlySummary } from './reportService';

const DATABASE_NAME = 'sinking-fund-monitor.db';
const DATABASE_VERSION = 5;
const BACKUP_DIRECTORY = new Directory(Paths.document, 'backups');

export type DatabaseBackupFile = {
  name: string;
  sizeBytes: number;
  modifiedAt: number | null;
};

function ensureBackupDirectory(): void {
  BACKUP_DIRECTORY.create({ idempotent: true, intermediates: true });
}

export function listDatabaseBackups(): DatabaseBackupFile[] {
  ensureBackupDirectory();
  return BACKUP_DIRECTORY
    .list()
    .filter(item => item instanceof File && item.name.toLowerCase().endsWith('.db'))
    .map(item => {
      const file = item as File;
      return { name: file.name, sizeBytes: file.size, modifiedAt: file.modificationTime };
    })
    .sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
}

function getSavedBackupFile(name: string): File {
  if (!/^sinking-fund-backup-\d{8}-\d{6}\.db$/.test(name)) {
    throw new Error('Select a valid saved backup.');
  }
  ensureBackupDirectory();
  return new File(BACKUP_DIRECTORY, name);
}

function timestampForFilename(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    '-',
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ].join('');
}

async function shareFile(file: File, dialogTitle: string, mimeType: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is not available on this device.');
  }

  await Sharing.shareAsync(file.uri, {
    dialogTitle,
    mimeType,
  });
}

export async function exportDatabaseBackup(db: SQLiteDatabase): Promise<void> {
  const bytes = await db.serializeAsync('main');
  const file = new File(
    BACKUP_DIRECTORY,
    `sinking-fund-backup-${timestampForFilename()}.db`,
  );
  file.create({ overwrite: true });
  await file.write(bytes);
  await shareFile(file, 'Save sinking fund database backup', 'application/octet-stream');
}

export async function restoreDatabaseBackup(
  db: SQLiteDatabase,
  savedBackupName?: string,
): Promise<boolean> {
  const bytes = savedBackupName
    ? await getSavedBackupFile(savedBackupName).bytes()
    : await (async () => {
        const picked = await File.pickFileAsync();
        if (picked.canceled) return null;
        return picked.result.bytes();
      })();

  if (!bytes) return false;
  if (bytes.byteLength < 16) {
    throw new Error('The selected file is not a valid SQLite database backup.');
  }

  const importedDb = await SQLite.deserializeDatabaseAsync(bytes);

  try {
    const version = await importedDb.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version',
    );
    if (version?.user_version !== DATABASE_VERSION) {
      throw new Error(
        `Backup version ${version?.user_version ?? 0} is not compatible with this app version.`,
      );
    }

    const tables = await importedDb.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('members', 'loans', 'loan_installments', 'payments', 'fund_transactions', 'monthly_reports', 'sinking_fund_weeks', 'sinking_fund_payments', 'sinking_fund_allocations', 'audit_logs')",
    );
    const requiredTables = [
      'members',
      'loans',
      'loan_installments',
      'payments',
      'fund_transactions',
      'monthly_reports',
      'sinking_fund_weeks',
      'sinking_fund_payments',
      'sinking_fund_allocations',
      'audit_logs',
    ];
    const found = new Set(tables.map(table => table.name));
    const missing = requiredTables.filter(name => !found.has(name));
    if (missing.length > 0) {
      throw new Error(`Backup is missing required tables: ${missing.join(', ')}.`);
    }

    await SQLite.backupDatabaseAsync({
      sourceDatabase: importedDb,
      sourceDatabaseName: 'main',
      destDatabase: db,
      destDatabaseName: 'main',
    });
    return true;
  } finally {
    await importedDb.closeAsync();
  }
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function exportMonthlyReportCsv(
  db: SQLiteDatabase,
  periodMonth: string,
): Promise<void> {
  const summary = await getMonthlySummary(db, periodMonth);
  const rows: string[] = [
    ['Period', periodMonth].map(csvEscape).join(','),
    ['Principal released', summary.principalReleasedCentavos / 100].map(csvEscape).join(','),
    ['Interest expected', summary.interestExpectedCentavos / 100].map(csvEscape).join(','),
    ['Installments scheduled', summary.installmentTargetCentavos / 100].map(csvEscape).join(','),
    ['Payments received', summary.collectedCentavos / 100].map(csvEscape).join(','),
    ['Due gap', summary.dueGapCentavos / 100].map(csvEscape).join(','),
    ['Portfolio outstanding', summary.portfolioOutstandingCentavos / 100].map(csvEscape).join(','),
    ['Overdue installments', summary.overdueInstallments].map(csvEscape).join(','),
    '',
    ['Member code', 'Member name', 'Alias', 'Principal', 'Installment target', 'Collected', 'Outstanding', 'Interest expected']
      .map(csvEscape)
      .join(','),
  ];

  for (const line of summary.loanLines) {
    rows.push([
      line.memberCode,
      line.memberName,
      line.alias ?? '',
      line.principalCentavos / 100,
      line.installmentTargetCentavos / 100,
      line.collectedCentavos / 100,
      line.outstandingCentavos / 100,
      line.interestExpectedCentavos / 100,
    ].map(csvEscape).join(','));
  }

  const file = new File(Paths.cache, `loan-collection-report-${periodMonth}.csv`);
  file.create({ overwrite: true });
  await file.write(rows.join('\n'));
  await shareFile(file, 'Export loan collection report', 'text/csv');
}
