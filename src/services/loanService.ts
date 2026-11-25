import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  InterestMethod,
  LoanRecord,
  PaymentAllocationMethod,
} from '../database/database.types';

export type CreateLoanInput = {
  memberId: number;
  principalAmountCentavos: number;
  interestMethod: InterestMethod;
  monthlyRateBasisPoints?: number;
  fixedInterestCentavos?: number;
  loanDate: string;
  startMonth: string;
  expectedEndMonth?: string;
  allocationMethod: PaymentAllocationMethod;
  remarks?: string;
};

export type LoanListItem = LoanRecord & {
  member_code: string;
  member_name: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function listLoans(db: SQLiteDatabase): Promise<LoanListItem[]> {
  return db.getAllAsync<LoanListItem>(
    `SELECT
       loans.*,
       members.member_code,
       members.full_name AS member_name
     FROM loans
     INNER JOIN members ON members.id = loans.member_id
     ORDER BY
       CASE loans.status WHEN 'active' THEN 0 WHEN 'paid' THEN 1 ELSE 2 END,
       loans.loan_date DESC,
       loans.id DESC`
  );
}

export async function createLoan(
  db: SQLiteDatabase,
  input: CreateLoanInput
): Promise<number> {
  if (!Number.isSafeInteger(input.memberId) || input.memberId <= 0) {
    throw new Error('Select a valid member.');
  }
  if (!Number.isSafeInteger(input.principalAmountCentavos) || input.principalAmountCentavos <= 0) {
    throw new Error('Enter a loan amount greater than zero.');
  }
  if (!DATE_PATTERN.test(input.loanDate)) {
    throw new Error('Loan date must use YYYY-MM-DD format.');
  }
  if (!MONTH_PATTERN.test(input.startMonth)) {
    throw new Error('Starting month must use YYYY-MM format.');
  }
  if (input.expectedEndMonth && !MONTH_PATTERN.test(input.expectedEndMonth)) {
    throw new Error('Expected end month must use YYYY-MM format.');
  }
  if (input.expectedEndMonth && input.expectedEndMonth < input.startMonth) {
    throw new Error('Expected end month cannot be earlier than the starting month.');
  }

  if (input.interestMethod === 'monthly_rate') {
    if (!Number.isSafeInteger(input.monthlyRateBasisPoints) || (input.monthlyRateBasisPoints ?? -1) < 0) {
      throw new Error('Enter a valid monthly interest rate.');
    }
  } else if (
    !Number.isSafeInteger(input.fixedInterestCentavos) ||
    (input.fixedInterestCentavos ?? -1) < 0
  ) {
    throw new Error('Enter a valid fixed interest amount.');
  }

  const member = await db.getFirstAsync<{ id: number; is_active: number }>(
    'SELECT id, is_active FROM members WHERE id = ?',
    input.memberId
  );
  if (!member || member.is_active !== 1) {
    throw new Error('The selected member is unavailable or inactive.');
  }

  let loanId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO loans (
         member_id, principal_amount_centavos, interest_method,
         monthly_rate_basis_points, fixed_interest_centavos,
         loan_date, start_month, expected_end_month,
         allocation_method, remarks
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.memberId,
      input.principalAmountCentavos,
      input.interestMethod,
      input.interestMethod === 'monthly_rate' ? input.monthlyRateBasisPoints ?? null : null,
      input.interestMethod === 'fixed_total' ? input.fixedInterestCentavos ?? null : null,
      input.loanDate,
      input.startMonth,
      input.expectedEndMonth || null,
      input.allocationMethod,
      input.remarks?.trim() || null
    );
    loanId = result.lastInsertRowId;

    await db.runAsync(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?)`,
      'created',
      'loan',
      loanId,
      JSON.stringify({
        memberId: input.memberId,
        principalAmountCentavos: input.principalAmountCentavos,
        interestMethod: input.interestMethod,
      })
    );
  });

  return loanId;
}
