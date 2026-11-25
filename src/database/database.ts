import type { SQLiteDatabase } from 'expo-sqlite';
import { runMigrations } from './migrations';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  // Connection-level settings must be applied before migration transactions.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(db);
}
