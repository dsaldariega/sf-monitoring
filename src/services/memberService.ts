import type { SQLiteDatabase } from 'expo-sqlite';
import type { MemberRecord } from '../database/database.types';

export type CreateMemberInput = {
  memberCode: string;
  fullName?: string;
  heads: number;
  contactNumber?: string;
};

export async function listMembers(db: SQLiteDatabase): Promise<MemberRecord[]> {
  return db.getAllAsync<MemberRecord>(
    `SELECT id, member_code, full_name, heads, contact_number, reference_note,
            is_active, created_at, updated_at
     FROM members
     ORDER BY is_active DESC, member_code COLLATE NOCASE ASC`
  );
}

export async function listActiveMembers(db: SQLiteDatabase): Promise<MemberRecord[]> {
  return db.getAllAsync<MemberRecord>(
    `SELECT id, member_code, full_name, heads, contact_number, reference_note,
            is_active, created_at, updated_at
     FROM members
     WHERE is_active = 1
     ORDER BY member_code COLLATE NOCASE ASC`
  );
}

export async function createMember(
  db: SQLiteDatabase,
  input: CreateMemberInput
): Promise<number> {
  const memberCode = input.memberCode.trim();
  const fullName = input.fullName?.trim() ?? '';

  if (!memberCode) {
    throw new Error('Enter a member ID, such as 1.');
  }
  if (!/^\d{1,10}$/.test(memberCode)) {
    throw new Error('Member ID must contain numbers only.');
  }

  if (!Number.isSafeInteger(input.heads) || input.heads < 1 || input.heads > 999) {
    throw new Error('Heads must be a whole number from 1 to 999.');
  }

  let memberId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO members (member_code, full_name, heads, contact_number, reference_note)
       VALUES (?, ?, ?, ?, NULL)`,
      memberCode,
      fullName,
      input.heads,
      input.contactNumber?.trim() || null
    );
    memberId = result.lastInsertRowId;

    await db.runAsync(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?)`,
      'created',
      'member',
      memberId,
      JSON.stringify({ memberCode, heads: input.heads })
    );
  });

  return memberId;
}

export async function setMemberActive(
  db: SQLiteDatabase,
  memberId: number,
  isActive: boolean
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE members
       SET is_active = ?, updated_at = datetime('now')
       WHERE id = ?`,
      isActive ? 1 : 0,
      memberId
    );
    await db.runAsync(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?)`,
      isActive ? 'reactivated' : 'deactivated',
      'member',
      memberId,
      null
    );
  });
}


export async function updateMemberHeads(
  db: SQLiteDatabase,
  memberId: number,
  heads: number,
): Promise<void> {
  if (!Number.isSafeInteger(memberId) || memberId <= 0) {
    throw new Error('Select a valid member.');
  }
  if (!Number.isSafeInteger(heads) || heads < 1 || heads > 999) {
    throw new Error('Heads must be a whole number from 1 to 999.');
  }

  await db.withTransactionAsync(async () => {
    const member = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM members WHERE id = ?',
      memberId,
    );
    if (!member) throw new Error('Member record was not found.');

    await db.runAsync(
      `UPDATE members
       SET heads = ?, updated_at = datetime('now')
       WHERE id = ?`,
      heads,
      memberId,
    );

    await db.runAsync(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details)
       VALUES ('updated', 'member', ?, ?)`,
      memberId,
      JSON.stringify({ heads }),
    );
  });
}


export async function deleteMember(db: SQLiteDatabase, memberId: number): Promise<void> {
  if (!Number.isSafeInteger(memberId) || memberId <= 0) throw new Error('Select a valid member.');

  await db.withTransactionAsync(async () => {
    const member = await db.getFirstAsync<{ id: number; member_code: string }>(
      'SELECT id, member_code FROM members WHERE id = ?', memberId
    );
    if (!member) throw new Error('Member record was not found.');

    const loanCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM loans WHERE member_id = ?', memberId
    );
    const weeklyPaymentCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM sinking_fund_payments WHERE member_id = ?', memberId
    );
    const weeklyAllocationCount = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count
       FROM sinking_fund_allocations a
       INNER JOIN sinking_fund_weeks w ON w.id = a.week_id
       WHERE w.member_id = ?`,
      memberId
    );

    if ((loanCount?.count ?? 0) > 0 || (weeklyPaymentCount?.count ?? 0) > 0 || (weeklyAllocationCount?.count ?? 0) > 0) {
      throw new Error('This member has financial history. Permanent deletion is blocked to protect records. Delete the related financial records first.');
    }

    // Empty weekly placeholder rows are not financial history and may be safely removed.
    await db.runAsync('DELETE FROM sinking_fund_weeks WHERE member_id = ?', memberId);

    await db.runAsync('DELETE FROM audit_logs WHERE entity_type = ? AND entity_id = ?', 'member', memberId);
    await db.runAsync('DELETE FROM members WHERE id = ?', memberId);
    await db.runAsync(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details)
       VALUES ('deleted', 'member', NULL, ?)`,
      JSON.stringify({ memberCode: member.member_code, deletedMemberId: memberId })
    );
  });
}
