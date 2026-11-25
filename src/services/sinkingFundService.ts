import type { SQLiteDatabase } from 'expo-sqlite';

const WEEKLY_RATE_CENTAVOS_PER_HEAD = 5000;

export type WeeklySinkingFundMemberRow = {
  memberId: number;
  memberCode: string;
  memberName: string;
  heads: number;
  dueCentavos: number;
  paidCentavos: number;
  remainingCentavos: number;
};

export type WeeklySinkingFundSummary = {
  weekStart: string;
  totalMembers: number;
  totalHeads: number;
  targetCentavos: number;
  collectedCentavos: number;
  remainingCentavos: number;
  memberRows: WeeklySinkingFundMemberRow[];
};

export type WeeklySinkingFundPayment = {
  id: number;
  memberCode: string;
  memberName: string;
  paidOn: string;
  amountCentavos: number;
  notes: string | null;
};

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Enter a valid date.');
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error('Enter a valid date.');
  }
  return date;
}

export function sundayOfWeek(value: string): string {
  const date = parseDate(value);
  date.setDate(date.getDate() - date.getDay());
  return formatDate(date);
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

async function ensureWeekRecords(db: SQLiteDatabase, weekStart: string): Promise<void> {
  const members = await db.getAllAsync<{ id: number; heads: number }>(
    `SELECT id, heads FROM members WHERE is_active = 1 ORDER BY member_code COLLATE NOCASE`
  );

  for (const member of members) {
    await db.runAsync(
      `INSERT INTO sinking_fund_weeks (member_id, week_start, due_centavos)
       VALUES (?, ?, ?)
       ON CONFLICT(member_id, week_start) DO NOTHING`,
      member.id,
      weekStart,
      member.heads * WEEKLY_RATE_CENTAVOS_PER_HEAD,
    );
  }
}

export async function getWeeklySinkingFundSummary(
  db: SQLiteDatabase,
  weekStartInput: string,
): Promise<WeeklySinkingFundSummary> {
  const weekStart = sundayOfWeek(weekStartInput);
  await ensureWeekRecords(db, weekStart);

  const rows = await db.getAllAsync<{
    member_id: number;
    member_code: string;
    member_name: string;
    heads: number;
    due_centavos: number;
    paid_centavos: number;
  }>(
    `SELECT
       m.id AS member_id,
       m.member_code,
       m.full_name AS member_name,
       m.heads,
       w.due_centavos,
       COALESCE(SUM(a.amount_centavos), 0) AS paid_centavos
     FROM members m
     INNER JOIN sinking_fund_weeks w
       ON w.member_id = m.id AND w.week_start = ?
     LEFT JOIN sinking_fund_allocations a ON a.week_id = w.id
     WHERE m.is_active = 1
     GROUP BY m.id, m.member_code, m.full_name, m.heads, w.due_centavos
     ORDER BY m.member_code COLLATE NOCASE`,
    weekStart,
  );

  const memberRows = rows.map(row => ({
    memberId: row.member_id,
    memberCode: row.member_code,
    memberName: row.member_name,
    heads: row.heads,
    dueCentavos: row.due_centavos,
    paidCentavos: row.paid_centavos,
    remainingCentavos: Math.max(0, row.due_centavos - row.paid_centavos),
  }));

  return {
    weekStart,
    totalMembers: memberRows.length,
    totalHeads: memberRows.reduce((sum, row) => sum + row.heads, 0),
    targetCentavos: memberRows.reduce((sum, row) => sum + row.dueCentavos, 0),
    collectedCentavos: memberRows.reduce((sum, row) => sum + row.paidCentavos, 0),
    remainingCentavos: memberRows.reduce((sum, row) => sum + row.remainingCentavos, 0),
    memberRows,
  };
}

export async function recordSinkingFundPayment(
  db: SQLiteDatabase,
  input: {
    memberId: number;
    weekStart: string;
    amountCentavos: number;
    paidOn: string;
    notes?: string;
  },
): Promise<number> {
  if (!Number.isSafeInteger(input.memberId) || input.memberId <= 0) {
    throw new Error('Select a valid member.');
  }
  if (!Number.isSafeInteger(input.amountCentavos) || input.amountCentavos <= 0) {
    throw new Error('Enter a collection amount greater than zero.');
  }

  const weekStart = sundayOfWeek(input.weekStart);
  parseDate(input.paidOn);

  let paymentId = 0;

  await db.withTransactionAsync(async () => {
    const member = await db.getFirstAsync<{ id: number; heads: number; is_active: number }>(
      `SELECT id, heads, is_active FROM members WHERE id = ?`,
      input.memberId,
    );
    if (!member || member.is_active !== 1) {
      throw new Error('The selected member is unavailable or inactive.');
    }

    const payment = await db.runAsync(
      `INSERT INTO sinking_fund_payments (member_id, paid_on, amount_centavos, notes)
       VALUES (?, ?, ?, ?)`,
      input.memberId,
      input.paidOn,
      input.amountCentavos,
      input.notes?.trim() || null,
    );
    paymentId = payment.lastInsertRowId;

    let remaining = input.amountCentavos;
    let cursor = weekStart;

    for (let index = 0; index < 520 && remaining > 0; index += 1) {
      await db.runAsync(
        `INSERT INTO sinking_fund_weeks (member_id, week_start, due_centavos)
         VALUES (?, ?, ?)
         ON CONFLICT(member_id, week_start) DO NOTHING`,
        input.memberId,
        cursor,
        member.heads * WEEKLY_RATE_CENTAVOS_PER_HEAD,
      );

      const week = await db.getFirstAsync<{ id: number; due_centavos: number }>(
        `SELECT id, due_centavos FROM sinking_fund_weeks
         WHERE member_id = ? AND week_start = ?`,
        input.memberId,
        cursor,
      );
      if (!week) throw new Error('Unable to create the weekly sinking fund record.');

      const allocated = await db.getFirstAsync<{ amount: number }>(
        `SELECT COALESCE(SUM(amount_centavos), 0) AS amount
         FROM sinking_fund_allocations
         WHERE week_id = ?`,
        week.id,
      );

      const alreadyCovered = allocated?.amount ?? 0;
      const weekRemaining = Math.max(0, week.due_centavos - alreadyCovered);
      const allocation = Math.min(remaining, weekRemaining);

      if (allocation > 0) {
        await db.runAsync(
          `INSERT INTO sinking_fund_allocations (payment_id, week_id, amount_centavos)
           VALUES (?, ?, ?)`,
          paymentId,
          week.id,
          allocation,
        );
        remaining -= allocation;
      }

      cursor = addDays(cursor, 7);
    }

    if (remaining > 0) {
      throw new Error('The collection amount is too large to allocate across future weekly dues.');
    }

    await db.runAsync(
      `INSERT INTO fund_transactions (
         transaction_type, amount_centavos, transaction_date,
         reference_type, reference_id, notes
       ) VALUES ('contribution', ?, ?, 'sinking_fund_payment', ?, ?)`,
      input.amountCentavos,
      input.paidOn,
      paymentId,
      input.notes?.trim() || 'Weekly sinking fund contribution',
    );

    await db.runAsync(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details)
       VALUES ('recorded', 'sinking_fund_payment', ?, ?)`,
      paymentId,
      JSON.stringify({
        memberId: input.memberId,
        weekStart,
        amountCentavos: input.amountCentavos,
        paidOn: input.paidOn,
        allocation: 'oldest_week_first_with_future_advance',
      }),
    );
  });

  return paymentId;
}

export async function listRecentSinkingFundPayments(
  db: SQLiteDatabase,
  limit = 50,
): Promise<WeeklySinkingFundPayment[]> {
  return db.getAllAsync<WeeklySinkingFundPayment>(
    `SELECT
       p.id,
       m.member_code,
       m.full_name AS member_name,
       p.paid_on,
       p.amount_centavos,
       p.notes
     FROM sinking_fund_payments p
     INNER JOIN members m ON m.id = p.member_id
     ORDER BY p.paid_on DESC, p.id DESC
     LIMIT ?`,
    limit,
  );
}

export function currentSinkingFundWeek(date = new Date()): string {
  return sundayOfWeek(formatDate(date));
}

export const SINKING_FUND_RATE_CENTAVOS_PER_HEAD = WEEKLY_RATE_CENTAVOS_PER_HEAD;
