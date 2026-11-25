import type { SQLiteDatabase } from 'expo-sqlite';
import type { FundTransactionRecord } from '../database/database.types';

export type ManualFundTransactionType = 'initial_fund' | 'other_in' | 'other_out';

export type FundSummary = {
  initialFundCentavos: number;
  totalInflowCentavos: number;
  totalOutflowCentavos: number;
  availableBalanceCentavos: number;
  initialFundCount: number;
};

export async function getFundSummary(db: SQLiteDatabase): Promise<FundSummary> {
  const row = await db.getFirstAsync<{
    initial_fund: number;
    total_inflow: number;
    total_outflow: number;
    initial_count: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN transaction_type = 'initial_fund' THEN amount_centavos ELSE 0 END), 0) AS initial_fund,
       COALESCE(SUM(CASE WHEN transaction_type IN ('initial_fund', 'contribution', 'loan_collection', 'other_in')
         THEN amount_centavos ELSE 0 END), 0) AS total_inflow,
       COALESCE(SUM(CASE WHEN transaction_type IN ('loan_release', 'other_out')
         THEN amount_centavos ELSE 0 END), 0) AS total_outflow,
       COALESCE(SUM(CASE WHEN transaction_type = 'initial_fund' THEN 1 ELSE 0 END), 0) AS initial_count
     FROM fund_transactions`
  );

  const totalInflowCentavos = row?.total_inflow ?? 0;
  const totalOutflowCentavos = row?.total_outflow ?? 0;
  return {
    initialFundCentavos: row?.initial_fund ?? 0,
    totalInflowCentavos,
    totalOutflowCentavos,
    availableBalanceCentavos: totalInflowCentavos - totalOutflowCentavos,
    initialFundCount: row?.initial_count ?? 0,
  };
}

export async function listFundTransactions(
  db: SQLiteDatabase,
  limit = 100
): Promise<FundTransactionRecord[]> {
  return db.getAllAsync<FundTransactionRecord>(
    `SELECT id, transaction_type, amount_centavos, transaction_date,
       reference_type, reference_id, notes, created_at
     FROM fund_transactions
     ORDER BY transaction_date DESC, id DESC
     LIMIT ?`,
    limit
  );
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export async function addManualFundTransaction(
  db: SQLiteDatabase,
  input: {
    type: ManualFundTransactionType;
    amountCentavos: number;
    transactionDate: string;
    notes?: string;
  }
): Promise<number> {
  if (!['initial_fund', 'other_in', 'other_out'].includes(input.type)) {
    throw new Error('Select a valid fund transaction type.');
  }
  if (!Number.isSafeInteger(input.amountCentavos) || input.amountCentavos <= 0) {
    throw new Error('Enter an amount greater than zero.');
  }
  if (!validDate(input.transactionDate)) throw new Error('Enter a valid transaction date.');

  let transactionId = 0;
  await db.withTransactionAsync(async () => {
    if (input.type === 'initial_fund') {
      const existing = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM fund_transactions WHERE transaction_type = 'initial_fund' LIMIT 1"
      );
      if (existing) throw new Error('The initial fund has already been recorded. Use Other income for an additional amount.');
    }

    const result = await db.runAsync(
      `INSERT INTO fund_transactions (
        transaction_type, amount_centavos, transaction_date, notes
      ) VALUES (?, ?, ?, ?)`,
      input.type,
      input.amountCentavos,
      input.transactionDate,
      input.notes?.trim() || null
    );
    transactionId = result.lastInsertRowId;

    await db.runAsync(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details)
       VALUES ('created', 'fund_transaction', ?, ?)`,
      transactionId,
      JSON.stringify({
        type: input.type,
        amountCentavos: input.amountCentavos,
        transactionDate: input.transactionDate,
        notes: input.notes?.trim() || null,
      })
    );
  });
  return transactionId;
}
