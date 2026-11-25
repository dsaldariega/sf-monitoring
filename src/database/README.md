# Local database

The app uses one device-local SQLite database named `sinking-fund-monitor.db`.

- `SQLiteProvider` opens the database before navigation renders.
- `initializeDatabase` enables WAL and foreign-key enforcement for the connection.
- `runMigrations` applies ordered schema migrations using SQLite's `user_version`.
- Monetary columns use integer centavos. Convert to pesos only at the presentation boundary.
- The loan/month unique constraint prevents duplicate monthly monitoring rows.
- Finalized monthly report data is stored as a JSON snapshot so later edits to live records do not rewrite historical reports.

## Loan terms (schema v2)

- Monthly interest is a flat 5% of original principal for each loan month (simple, non-compounding interest).
- The loan term creates two installments per month, each due 15 calendar days after the previous date, starting 15 days after the loan date.
- The total payable is principal plus total term interest. Installments are split evenly in centavos; any rounding remainder is applied to the final installment.
- A missed installment incurs a one-time 2.5% penalty based on original principal. The penalty is stored on that installment and is not compounded.
- Loan aliases and installment schedules are stored locally in SQLite.

Do not delete the database to recover from a migration error. Add a new migration and preserve existing records.
