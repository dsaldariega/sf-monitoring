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
    `SELECT id, member_code, full_name, contact_number, reference_note,
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
