import type { SQLiteDatabase } from 'expo-sqlite';

export type MonthlyLoanLine = {
  loanId: number;
  memberCode: string;
  memberName: string;
  alias: string | null;
  principalCentavos: number;
  installmentTargetCentavos: number;
  collectedCentavos: number;
  outstandingCentavos: number;
  interestExpectedCentavos: number;
};

export type MonthlySummary = {
  periodMonth: string;
  activeLoans: number;
  principalReleasedCentavos: number;
  interestExpectedCentavos: number;
  installmentTargetCentavos: number;
  collectedCentavos: number;
  dueGapCentavos: number;
  portfolioOutstandingCentavos: number;
  overdueInstallments: number;
  loanLines: MonthlyLoanLine[];
};

export type MonthlyReportRecord = {
  id: number;
  period_month: string;
  total_principal_centavos: number;
  total_interest_centavos: number;
  total_target_centavos: number;
  total_collected_centavos: number;
  total_outstanding_centavos: number;
  finalized_at: string;
  report_snapshot_json: string;
};

export function currentPeriodMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthBounds(periodMonth: string): { start: string; end: string } {
  if (!/^\d{4}-\d{2}$/.test(periodMonth)) throw new Error('Select a valid report month.');
  const [year, month] = periodMonth.split('-').map(Number);
  if (month < 1 || month > 12) throw new Error('Select a valid report month.');
  const start = `${periodMonth}-01`;
  const endDate = new Date(year, month, 0, 12);
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return { start, end };
}

export async function getMonthlySummary(
  db: SQLiteDatabase,
  periodMonth: string
): Promise<MonthlySummary> {
  const { start, end } = monthBounds(periodMonth);
  const [portfolio, monthly, lines, overdue] = await Promise.all([
    db.getFirstAsync<{ active_loans: number; outstanding: number }>(
      `SELECT
         COUNT(DISTINCT loans.id) AS active_loans,
         COALESCE(SUM(
           (COALESCE(loan_installments.scheduled_amount_centavos, 0) - COALESCE(loan_installments.paid_amount_centavos, 0))
           + (COALESCE(loan_installments.penalty_amount_centavos, 0) - COALESCE(loan_installments.penalty_paid_centavos, 0))
         ), 0) AS outstanding
       FROM loans
       LEFT JOIN loan_installments ON loan_installments.loan_id = loans.id
       WHERE loans.status = 'active' AND loans.archived_at IS NULL`
    ),
    db.getFirstAsync<{
      principal_released: number;
      interest_expected: number;
      installment_target: number;
      collected: number;
    }>(
      `SELECT
         COALESCE((SELECT SUM(principal_amount_centavos) FROM loans
           WHERE loan_date BETWEEN ? AND ?), 0) AS principal_released,
         COALESCE((SELECT SUM(CAST(ROUND(loans.principal_amount_centavos
           * COALESCE(loans.monthly_rate_basis_points, 0) / 10000.0) AS INTEGER))
           FROM loans WHERE loans.status != 'cancelled' AND loans.archived_at IS NULL
           AND EXISTS (SELECT 1 FROM loan_installments i WHERE i.loan_id = loans.id
             AND i.due_date BETWEEN ? AND ?)), 0) AS interest_expected,
         COALESCE((SELECT SUM(i.scheduled_amount_centavos) FROM loan_installments i
           INNER JOIN loans l ON l.id = i.loan_id
           WHERE l.status != 'cancelled' AND l.archived_at IS NULL AND i.due_date BETWEEN ? AND ?), 0) AS installment_target,
         COALESCE((SELECT SUM(amount_centavos) FROM payments
           WHERE paid_on BETWEEN ? AND ?), 0) AS collected`,
      start, end, start, end, start, end, start, end
    ),
    db.getAllAsync<{
      loan_id: number;
      member_code: string;
      member_name: string;
      alias: string | null;
      principal: number;
      installment_target: number;
      collected: number;
      outstanding: number;
      interest_expected: number;
    }>(
      `SELECT loans.id AS loan_id, members.member_code, members.full_name AS member_name,
         loans.alias, loans.principal_amount_centavos AS principal,
         COALESCE((SELECT SUM(i.scheduled_amount_centavos) FROM loan_installments i
           WHERE i.loan_id = loans.id AND i.due_date BETWEEN ? AND ?), 0) AS installment_target,
         COALESCE((SELECT SUM(p.amount_centavos) FROM payments p
           WHERE p.loan_id = loans.id AND p.paid_on BETWEEN ? AND ?), 0) AS collected,
         COALESCE((SELECT SUM((i.scheduled_amount_centavos - i.paid_amount_centavos)
           + (i.penalty_amount_centavos - i.penalty_paid_centavos))
           FROM loan_installments i WHERE i.loan_id = loans.id), 0) AS outstanding,
         CASE WHEN EXISTS (SELECT 1 FROM loan_installments i WHERE i.loan_id = loans.id
           AND i.due_date BETWEEN ? AND ?)
           THEN CAST(ROUND(loans.principal_amount_centavos
             * COALESCE(loans.monthly_rate_basis_points, 0) / 10000.0) AS INTEGER)
           ELSE 0 END AS interest_expected
       FROM loans INNER JOIN members ON members.id = loans.member_id
       WHERE loans.status != 'cancelled'
         AND (loans.loan_date BETWEEN ? AND ?
           OR EXISTS (SELECT 1 FROM loan_installments i WHERE i.loan_id = loans.id
             AND i.due_date BETWEEN ? AND ?)
           OR EXISTS (SELECT 1 FROM payments p WHERE p.loan_id = loans.id
             AND p.paid_on BETWEEN ? AND ?))
       ORDER BY members.member_code COLLATE NOCASE, loans.loan_date`,
      start, end, start, end, start, end, start, end, start, end, start, end
    ),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM loan_installments i
       INNER JOIN loans l ON l.id = i.loan_id
       WHERE l.status = 'active' AND l.archived_at IS NULL AND i.due_date < ?
         AND i.paid_amount_centavos < i.scheduled_amount_centavos`,
      start
    ),
  ]);

  return {
    periodMonth,
    activeLoans: portfolio?.active_loans ?? 0,
    principalReleasedCentavos: monthly?.principal_released ?? 0,
    interestExpectedCentavos: monthly?.interest_expected ?? 0,
    installmentTargetCentavos: monthly?.installment_target ?? 0,
    collectedCentavos: monthly?.collected ?? 0,
    dueGapCentavos: Math.max(0, (monthly?.installment_target ?? 0) - (monthly?.collected ?? 0)),
    portfolioOutstandingCentavos: portfolio?.outstanding ?? 0,
    overdueInstallments: overdue?.count ?? 0,
    loanLines: lines.map(line => ({
      loanId: line.loan_id,
      memberCode: line.member_code,
      memberName: line.member_name,
      alias: line.alias,
      principalCentavos: line.principal,
      installmentTargetCentavos: line.installment_target,
      collectedCentavos: line.collected,
      outstandingCentavos: line.outstanding,
      interestExpectedCentavos: line.interest_expected,
    })),
  };
}

export async function listMonthlyReports(db: SQLiteDatabase): Promise<MonthlyReportRecord[]> {
  return db.getAllAsync<MonthlyReportRecord>(
    `SELECT id, period_month, total_principal_centavos, total_interest_centavos,
       total_target_centavos, total_collected_centavos, total_outstanding_centavos,
       finalized_at, report_snapshot_json
     FROM monthly_reports ORDER BY period_month DESC`
  );
}

export async function finalizeMonthlyReport(
  db: SQLiteDatabase,
  periodMonth: string
): Promise<number> {
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM monthly_reports WHERE period_month = ?', periodMonth
  );
  if (existing) throw new Error('This month already has a finalized report. Historical reports cannot be overwritten.');

  const summary = await getMonthlySummary(db, periodMonth);
  const snapshot = {
    version: 1,
    periodMonth: summary.periodMonth,
    finalizedAt: new Date().toISOString(),
    metrics: {
      activeLoans: summary.activeLoans,
      principalReleasedCentavos: summary.principalReleasedCentavos,
      interestExpectedCentavos: summary.interestExpectedCentavos,
      installmentTargetCentavos: summary.installmentTargetCentavos,
      collectedCentavos: summary.collectedCentavos,
      dueGapCentavos: summary.dueGapCentavos,
      portfolioOutstandingCentavos: summary.portfolioOutstandingCentavos,
      overdueInstallments: summary.overdueInstallments,
    },
    loans: summary.loanLines,
  };

  let reportId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO monthly_reports (
        period_month, report_snapshot_json, total_principal_centavos,
        total_interest_centavos, total_target_centavos, total_collected_centavos,
        total_outstanding_centavos
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      periodMonth,
      JSON.stringify(snapshot),
      summary.principalReleasedCentavos,
      summary.interestExpectedCentavos,
      summary.installmentTargetCentavos,
      summary.collectedCentavos,
      summary.portfolioOutstandingCentavos
    );
    reportId = result.lastInsertRowId;
    await db.runAsync(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details)
       VALUES ('finalized', 'monthly_report', ?, ?)`,
      reportId,
      JSON.stringify({ periodMonth })
    );
  });
  return reportId;
}
