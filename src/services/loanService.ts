import type { SQLiteDatabase } from 'expo-sqlite';
import type { LoanRecord } from '../database/database.types';

export const MONTHLY_INTEREST_BASIS_POINTS = 500;
export const LATE_PENALTY_BASIS_POINTS = 250;

export type CreateLoanInput = {
  memberId: number;
  principalAmountCentavos: number;
  alias?: string;
  loanDate: string;
  termMonths: number;
  remarks?: string;
};

export type LoanListItem = LoanRecord & {
  member_code: string;
  member_name: string;
};

export type InstallmentPreview = {
  installmentNumber: number;
  dueDate: string;
  scheduledAmountCentavos: number;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error('Enter a valid loan date.');
  }
  return date;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addMonthsToMonth(value: string, months: number): string {
  const [year, month] = value.split('-').map(Number);
  const absoluteMonth = year * 12 + (month - 1) + months;
  const resultYear = Math.floor(absoluteMonth / 12);
  const resultMonth = (absoluteMonth % 12) + 1;
  return `${resultYear}-${String(resultMonth).padStart(2, '0')}`;
}

export function calculateLoanTerms(principalCentavos: number, termMonths: number) {
  const totalInterestCentavos = Math.round(
    (principalCentavos * MONTHLY_INTEREST_BASIS_POINTS * termMonths) / 10000
  );
  const totalPayableCentavos = principalCentavos + totalInterestCentavos;
  const installmentCount = termMonths * 2;
  const baseInstallment = Math.floor(totalPayableCentavos / installmentCount);
  const penaltyCentavos = Math.round((principalCentavos * LATE_PENALTY_BASIS_POINTS) / 10000);\n  return { totalInterestCentavos, totalPayableCentavos, installmentCount, baseInstallment, penaltyCentavos };
}

export function buildInstallmentSchedule(
  principalCentavos: number,
  termMonths: number,
  loanDate: string
): InstallmentPreview[] {
  const { totalPayableCentavos, installmentCount, baseInstallment } =
    calculateLoanTerms(principalCentavos, termMonths);
  const date = parseDate(loanDate);
  let allocated = 0;
  return Array.from({ length: installmentCount }, (_, index) => {
    date.setDate(date.getDate() + 15);
    const amount = index === installmentCount - 1
      ? totalPayableCentavos - allocated
      : baseInstallment;
    allocated += amount;
    return {
      installmentNumber: index + 1,
      dueDate: formatDate(date),
      scheduledAmountCentavos: amount,
    };
  });
}

export async function listLoans(db: SQLiteDatabase): Promise<LoanListItem[]> {
  return db.getAllAsync<LoanListItem>(
    `SELECT loans.*, members.member_code, members.full_name AS member_name
     FROM loans
     INNER JOIN members ON members.id = loans.member_id
     ORDER BY CASE loans.status WHEN 'active' THEN 0 WHEN 'paid' THEN 1 ELSE 2 END,
       loans.loan_date DESC, loans.id DESC`
  );
}

export async function assessOverdueInstallments(
  db: SQLiteDatabase,
  asOfDate = formatDate(new Date())
): Promise<number> {
  let changed = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `UPDATE loan_installments
       SET penalty_amount_centavos = (
         SELECT CAST(ROUND(loans.principal_amount_centavos * ? / 10000.0) AS INTEGER)
         FROM loans WHERE loans.id = loan_installments.loan_id
       ),
       penalty_assessed_at = datetime('now')
       WHERE due_date < ?
         AND penalty_assessed_at IS NULL
         AND paid_amount_centavos < scheduled_amount_centavos`,
      LATE_PENALTY_BASIS_POINTS,
      asOfDate
    );
    changed = result.changes;
  });
  return changed;
}

export async function createLoan(db: SQLiteDatabase, input: CreateLoanInput): Promise<number> {
  if (!Number.isSafeInteger(input.memberId) || input.memberId <= 0) throw new Error('Select a valid member.');
  if (!Number.isSafeInteger(input.principalAmountCentavos) || input.principalAmountCentavos <= 0) {
    throw new Error('Enter a loan amount greater than zero.');
  }
  if (!DATE_PATTERN.test(input.loanDate)) throw new Error('Loan date must use YYYY-MM-DD format.');
  parseDate(input.loanDate);
  if (!Number.isSafeInteger(input.termMonths) || input.termMonths < 1 || input.termMonths > 36) {
    throw new Error('Loan term must be between 1 and 36 months.');
  }

  const member = await db.getFirstAsync<{ id: number; is_active: number }>(
    'SELECT id, is_active FROM members WHERE id = ?', input.memberId
  );
  if (!member || member.is_active !== 1) throw new Error('The selected member is unavailable or inactive.');

  const schedule = buildInstallmentSchedule(input.principalAmountCentavos, input.termMonths, input.loanDate);
  const { totalInterestCentavos, totalPayableCentavos } =
    calculateLoanTerms(input.principalAmountCentavos, input.termMonths);
  const expectedEndMonth = addMonthsToMonth(input.loanDate.slice(0, 7), input.termMonths);

  let loanId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO loans (
        member_id, principal_amount_centavos, interest_method,
        monthly_rate_basis_points, fixed_interest_centavos,
        loan_date, start_month, expected_end_month,
        allocation_method, remarks, alias, term_months
      ) VALUES (?, ?, 'monthly_rate', ?, NULL, ?, ?, ?, 'interest_first', ?, ?, ?)`,
      input.memberId,
      input.principalAmountCentavos,
      MONTHLY_INTEREST_BASIS_POINTS,
      input.loanDate,
      input.loanDate.slice(0, 7),
      expectedEndMonth,
      input.remarks?.trim() || null,
      input.alias?.trim() || null,
      input.termMonths
    );
    loanId = result.lastInsertRowId;

    for (const installment of schedule) {
      await db.runAsync(
        `INSERT INTO loan_installments
         (loan_id, installment_number, due_date, scheduled_amount_centavos)
         VALUES (?, ?, ?, ?)`,
        loanId,
        installment.installmentNumber,
        installment.dueDate,
        installment.scheduledAmountCentavos
      );
    }

    await db.runAsync(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?)`,
      'created', 'loan', loanId,
      JSON.stringify({
        memberId: input.memberId,
        principalAmountCentavos: input.principalAmountCentavos,
        termMonths: input.termMonths,
        monthlyInterestBasisPoints: MONTHLY_INTEREST_BASIS_POINTS,
        totalInterestCentavos,
        totalPayableCentavos,
        installmentCount: schedule.length,
        latePenaltyBasisPoints: LATE_PENALTY_BASIS_POINTS,
      })
    );
  });
  return loanId;
}
