# Local database

The app uses one device-local SQLite database named `sinking-fund-monitor.db`.

- `SQLiteProvider` opens the database before navigation renders.
- `initializeDatabase` enables WAL and foreign-key enforcement for the connection.
- `runMigrations` applies ordered schema migrations using SQLite's `user_version`.
- Monetary columns use integer centavos. Convert to pesos only at the presentation boundary.
- The loan/month unique constraint prevents duplicate monthly monitoring rows.
- Finalized monthly report data is stored as a JSON snapshot so later edits to live records do not rewrite historical reports.

Do not delete the database to recover from a migration error. Add a new migration and preserve existing records.
