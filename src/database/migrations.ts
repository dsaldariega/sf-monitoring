import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_VERSION = 4;

type Migration = {
  version: number;
  sql: string;
};

const migrations: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_code TEXT NOT NULL COLLATE NOCASE UNIQUE,
        full_name TEXT NOT NULL,
        contact_number TEXT,
        reference_note TEXT,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL REFERENCES members(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        principal_amount_centavos INTEGER NOT NULL CHECK (principal_amount_centavos > 0),
        interest_method TEXT NOT NULL CHECK (interest_method IN ('monthly_rate', 'fixed_total')),
        monthly_rate_basis_points INTEGER CHECK (monthly_rate_basis_points IS NULL OR monthly_rate_basis_points >= 0),
        fixed_interest_centavos INTEGER CHECK (fixed_interest_centavos IS NULL OR fixed_interest_centavos >= 0),
        loan_date TEXT NOT NULL,
        start_month TEXT NOT NULL CHECK (length(start_month) = 7),
        expected_end_month TEXT CHECK (expected_end_month IS NULL OR length(expected_end_month) = 7),
        allocation_method TEXT NOT NULL DEFAULT 'interest_first'
          CHECK (allocation_method IN ('interest_first', 'principal_first', 'manual')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'cancelled')),
        remarks TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        CHECK (
          (interest_method = 'monthly_rate' AND monthly_rate_basis_points IS NOT NULL AND fixed_interest_centavos IS NULL)
          OR
          (interest_method = 'fixed_total' AND fixed_interest_centavos IS NOT NULL AND monthly_rate_basis_points IS NULL)
        )
      );

      CREATE INDEX idx_loans_member_id ON loans(member_id);
      CREATE INDEX idx_loans_status ON loans(status);

      CREATE TABLE monthly_monitoring (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL REFERENCES loans(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        period_month TEXT NOT NULL CHECK (length(period_month) = 7),
        expected_principal_centavos INTEGER NOT NULL DEFAULT 0 CHECK (expected_principal_centavos >= 0),
        expected_interest_centavos INTEGER NOT NULL DEFAULT 0 CHECK (expected_interest_centavos >= 0),
        expected_total_centavos INTEGER NOT NULL DEFAULT 0 CHECK (expected_total_centavos >= 0),
        actual_collected_centavos INTEGER NOT NULL DEFAULT 0 CHECK (actual_collected_centavos >= 0),
        outstanding_centavos INTEGER NOT NULL DEFAULT 0 CHECK (outstanding_centavos >= 0),
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'paid', 'finalized')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (loan_id, period_month)
      );

      CREATE INDEX idx_monthly_monitoring_period ON monthly_monitoring(period_month);

      CREATE TABLE payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL REFERENCES loans(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        paid_on TEXT NOT NULL,
        amount_centavos INTEGER NOT NULL CHECK (amount_centavos > 0),
        interest_allocated_centavos INTEGER NOT NULL DEFAULT 0 CHECK (interest_allocated_centavos >= 0),
        principal_allocated_centavos INTEGER NOT NULL DEFAULT 0 CHECK (principal_allocated_centavos >= 0),
        allocation_method TEXT NOT NULL CHECK (allocation_method IN ('interest_first', 'principal_first', 'manual')),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        CHECK (interest_allocated_centavos + principal_allocated_centavos <= amount_centavos)
      );

      CREATE INDEX idx_payments_loan_id ON payments(loan_id);
      CREATE INDEX idx_payments_paid_on ON payments(paid_on);

      CREATE TABLE fund_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_type TEXT NOT NULL CHECK (
          transaction_type IN ('initial_fund', 'contribution', 'loan_release', 'loan_collection', 'other_in', 'other_out')
        ),
        amount_centavos INTEGER NOT NULL CHECK (amount_centavos > 0),
        transaction_date TEXT NOT NULL,
        reference_type TEXT,
        reference_id INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_fund_transactions_date ON fund_transactions(transaction_date);

      CREATE TABLE monthly_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_month TEXT NOT NULL UNIQUE CHECK (length(period_month) = 7),
        report_snapshot_json TEXT NOT NULL,
        total_principal_centavos INTEGER NOT NULL DEFAULT 0,
        total_interest_centavos INTEGER NOT NULL DEFAULT 0,
        total_target_centavos INTEGER NOT NULL DEFAULT 0,
        total_collected_centavos INTEGER NOT NULL DEFAULT 0,
        total_outstanding_centavos INTEGER NOT NULL DEFAULT 0,
        finalized_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE app_settings (
        setting_key TEXT PRIMARY KEY NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        details TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
    `,
  },
  {
    version: 2,
    sql: `
      ALTER TABLE loans ADD COLUMN alias TEXT;
      ALTER TABLE loans ADD COLUMN term_months INTEGER NOT NULL DEFAULT 1 CHECK (term_months > 0);
      CREATE TABLE loan_installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL REFERENCES loans(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        installment_number INTEGER NOT NULL CHECK (installment_number > 0),
        due_date TEXT NOT NULL,
        scheduled_amount_centavos INTEGER NOT NULL CHECK (scheduled_amount_centavos >= 0),
        penalty_amount_centavos INTEGER NOT NULL DEFAULT 0 CHECK (penalty_amount_centavos >= 0),
        paid_amount_centavos INTEGER NOT NULL DEFAULT 0 CHECK (paid_amount_centavos >= 0),
        penalty_assessed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (loan_id, installment_number),
        UNIQUE (loan_id, due_date)
      );
      CREATE INDEX idx_loan_installments_due_date ON loan_installments(due_date);
      CREATE INDEX idx_loan_installments_loan_id ON loan_installments(loan_id);
    `,
  },
  {
    version: 3,
    sql: `
      ALTER TABLE loan_installments
        ADD COLUMN penalty_paid_centavos INTEGER NOT NULL DEFAULT 0 CHECK (penalty_paid_centavos >= 0);
      ALTER TABLE payments
        ADD COLUMN penalty_allocated_centavos INTEGER NOT NULL DEFAULT 0 CHECK (penalty_allocated_centavos >= 0);
    `,
  },
  {
    version: 4,
    sql: `
      ALTER TABLE loans ADD COLUMN archived_at TEXT;
      ALTER TABLE loans ADD COLUMN archive_reason TEXT;
      CREATE INDEX idx_loans_archived_at ON loans(archived_at);

      CREATE UNIQUE INDEX idx_fund_transactions_reference_unique
        ON fund_transactions(transaction_type, reference_type, reference_id)
        WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

      INSERT INTO fund_transactions (
        transaction_type, amount_centavos, transaction_date,
        reference_type, reference_id, notes
      )
      SELECT 'loan_release', loans.principal_amount_centavos, loans.loan_date,
        'loan', loans.id, COALESCE(loans.alias, 'Loan release')
      FROM loans
      WHERE NOT EXISTS (
        SELECT 1 FROM fund_transactions
        WHERE transaction_type = 'loan_release'
          AND reference_type = 'loan'
          AND reference_id = loans.id
      );
    `,
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const versionResult = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  let currentVersion = versionResult?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });

    currentVersion = migration.version;
  }

  if (currentVersion !== DATABASE_VERSION) {
    throw new Error(
      `Database migration stopped at version ${currentVersion}; expected ${DATABASE_VERSION}.`
    );
  }
}
