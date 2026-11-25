import type { SQLiteDatabase } from 'expo-sqlite';

export type PaymentLoanOption = {
  id: number;
  alias: string | null;
  loan_date: string;
  principal_amount_centavos: number;
  member_code: string;
  member_name: string;
  next_payment_centavos: number;
  next_due_date: string | null;
  total_scheduled_centavos: number;
  total_paid_centavos: number;
  total_penalties_centavos: number;
  total_penalties_paid_centavos: number;
  outstanding_centavos: number;
};

export type PaymentHistoryItem = {
  id: number;
  loan_id: number;
  paid_on: string;
  amount_centavos: number;
  penalty_allocated_centavos: number;
  notes: string | null;
  alias: string | null;
  member_code: string;
  member_name: string;
};

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export async function listLoansForPayment(db: SQLiteDatabase): Promise<PaymentLoanOption[]> {
  return db.getAllAsync<PaymentLoanOption>(
    `SELECT
       loans.id, loans.alias, loans.loan_date, loans.principal_amount_centavos,
       members.member_code, members.full_name AS member_name,
       COALESCE((
         SELECT li.scheduled_amount_centavos
         FROM loan_installments AS li
         WHERE li.loan_id = loans.id
           AND (
             li.paid_amount_centavos < li.scheduled_amount_centavos
             OR li.penalty_paid_centavos < li.penalty_amount_centavos
           )
         ORDER BY li.due_date ASC, li.installment_number ASC
         LIMIT 1
       ), 0) AS next_payment_centavos,
       (
         SELECT li.due_date
         FROM loan_installments AS li
         WHERE li.loan_id = loans.id
           AND (
             li.paid_amount_centavos < li.scheduled_amount_centavos
             OR li.penalty_paid_centavos < li.penalty_amount_centavos
           )
         ORDER BY li.due_date ASC, li.installment_number ASC
         LIMIT 1
       ) AS next_due_date,
       COALESCE(SUM(installments.scheduled_amount_centavos), 0) AS total_scheduled_centavos,
       COALESCE(SUM(installments.paid_amount_centavos), 0) AS total_paid_centavos,
       COALESCE(SUM(installments.penalty_amount_centavos), 0) AS total_penalties_centavos,
       COALESCE(SUM(installments.penalty_paid_centavos), 0) AS total_penalties_paid_centavos,
       COALESCE(SUM(
         (installments.scheduled_amount_centavos - installments.paid_amount_centavos)
         + (installments.penalty_amount_centavos - installments.penalty_paid_centavos)
       ), 0) AS outstanding_centavos
     FROM loans
     INNER JOIN members ON members.id = loans.member_id
     INNER JOIN loan_installments AS installments ON installments.loan_id = loans.id
     WHERE loans.status = 'active' AND loans.archived_at IS NULL
     GROUP BY loans.id
     HAVING outstanding_centavos > 0
     ORDER BY loans.loan_date ASC, members.member_code COLLATE NOCASE ASC`
  );
}

export async function listPaymentHistory(db: SQLiteDatabase): Promise<PaymentHistoryItem[]> {
  return db.getAllAsync<PaymentHistoryItem>(
    `SELECT payments.id, payments.loan_id, payments.paid_on, payments.amount_centavos,
       payments.penalty_allocated_centavos, payments.notes,
       loans.alias, members.member_code, members.full_name AS member_name
     FROM payments
     INNER JOIN loans ON loans.id = payments.loan_id
     INNER JOIN members ON members.id = loans.member_id
     ORDER BY payments.paid_on DESC, payments.id DESC
     LIMIT 50`
  );
}

export async function recordLoanPayment(
  db: SQLiteDatabase,
  input: { loanId: number; amountCentavos: number; paidOn: string; notes?: string }
): Promise<number> {
  if (!Number.isSafeInteger(input.loanId) || input.loanId <= 0) {
    throw new Error('Select a valid loan.');
  }
  if (!Number.isSafeInteger(input.amountCentavos) || input.amountCentavos <= 0) {
    throw new Error('Enter a payment amount greater than zero.');
  }
  if (!isValidDate(input.paidOn)) {
    throw new Error('Enter a valid payment date.');
  }

  let paymentId = 0;
  await db.withTransactionAsync(async () => {
    const loan = await db.getFirstAsync<{
      id: number;
      status: string;
      archived_at: string | null;
      principal_amount_centavos: number;
      monthly_rate_basis_points: number | null;
      fixed_interest_centavos: number | null;
      term_months: number;
      interest_paid_centavos: number;
    }>(
      `SELECT loans.id, loans.status, loans.archived_at, loans.principal_amount_centavos,
         loans.monthly_rate_basis_points, loans.fixed_interest_centavos, loans.term_months,
         COALESCE(SUM(payments.interest_allocated_centavos), 0) AS interest_paid_centavos
       FROM loans
       LEFT JOIN payments ON payments.loan_id = loans.id
       WHERE loans.id = ?
       GROUP BY loans.id`,
      input.loanId
    );
    if (!loan || loan.status !== 'active' || loan.archived_at) {
      throw new Error('This loan is no longer available for payment.');
    }

    const installments = await db.getAllAsync<{
      id: number;
      installment_number: number;
      scheduled_amount_centavos: number;
      paid_amount_centavos: number;
      penalty_amount_centavos: number;
      penalty_paid_centavos: number;
    }>(
      `SELECT id, installment_number, scheduled_amount_centavos, paid_amount_centavos,
         penalty_amount_centavos, penalty_paid_centavos
       FROM loan_installments
       WHERE loan_id = ?
       ORDER BY due_date ASC, installment_number ASC`,
      input.loanId
    );

    const outstanding = installments.reduce((sum, item) =>
      sum + (item.scheduled_amount_centavos - item.paid_amount_centavos)
        + (item.penalty_amount_centavos - item.penalty_paid_centavos), 0);

    if (outstanding <= 0) throw new Error('This loan has no outstanding balance.');
    if (input.amountCentavos > outstanding) {
      throw new Error(`Payment exceeds the outstanding balance of ${(outstanding / 100).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}.`);
    }

    let remaining = input.amountCentavos;
    let penaltyAllocated = 0;

    for (const installment of installments) {
      if (remaining <= 0) break;

      const penaltyDue = installment.penalty_amount_centavos - installment.penalty_paid_centavos;
      const penaltyPayment = Math.min(remaining, penaltyDue);
      const scheduledDue = installment.scheduled_amount_centavos - installment.paid_amount_centavos;
      const scheduledPayment = Math.min(remaining - penaltyPayment, scheduledDue);

      if (penaltyPayment > 0 || scheduledPayment > 0) {
        await db.runAsync(
          `UPDATE loan_installments
           SET penalty_paid_centavos = penalty_paid_centavos + ?,
               paid_amount_centavos = paid_amount_centavos + ?
           WHERE id = ?`,
          penaltyPayment,
          scheduledPayment,
          installment.id
        );
        penaltyAllocated += penaltyPayment;
        remaining -= penaltyPayment + scheduledPayment;
      }
    }

    const scheduledAmountPaid = input.amountCentavos - penaltyAllocated;
    const totalInterestCentavos = loan.fixed_interest_centavos
      ?? Math.round((loan.principal_amount_centavos * (loan.monthly_rate_basis_points ?? 0) * loan.term_months) / 10000);
    const interestAllocated = Math.min(
      scheduledAmountPaid,
      Math.max(0, totalInterestCentavos - loan.interest_paid_centavos)
    );
    const principalAllocated = scheduledAmountPaid - interestAllocated;

    const result = await db.runAsync(
      `INSERT INTO payments (
         loan_id, paid_on, amount_centavos, interest_allocated_centavos,
         principal_allocated_centavos, allocation_method, notes, penalty_allocated_centavos
       ) VALUES (?, ?, ?, ?, ?, 'interest_first', ?, ?)`,
      input.loanId,
      input.paidOn,
      input.amountCentavos,
      interestAllocated,
      principalAllocated,
      input.notes?.trim() || null,
      penaltyAllocated
    );
    paymentId = result.lastInsertRowId;

    await db.runAsync(
      `INSERT INTO fund_transactions (
         transaction_type, amount_centavos, transaction_date, reference_type, reference_id, notes
       ) VALUES ('loan_collection', ?, ?, 'payment', ?, ?)`,
      input.amountCentavos,
      input.paidOn,
      paymentId,
      input.notes?.trim() || 'Loan payment'
    );

    const unpaid = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM loan_installments
       WHERE loan_id = ?
         AND (paid_amount_centavos < scheduled_amount_centavos
           OR penalty_paid_centavos < penalty_amount_centavos)`,
      input.loanId
    );

    if ((unpaid?.count ?? 0) === 0) {
      await db.runAsync(
        "UPDATE loans SET status = 'paid', updated_at = datetime('now') WHERE id = ?",
        input.loanId
      );
    }

    await db.runAsync(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details)
       VALUES ('recorded', 'payment', ?, ?)`,
      paymentId,
      JSON.stringify({
        loanId: input.loanId,
        amountCentavos: input.amountCentavos,
        paidOn: input.paidOn,
        penaltyAllocatedCentavos: penaltyAllocated,
      })
    );
  });

  return paymentId;
}
