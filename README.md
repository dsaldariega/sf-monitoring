# Sinking Fund Monthly Monitor

An offline-first Android application for weekly Sinking Fund collection tracking, loan monitoring, portfolio summaries, fund balance management, and end-of-month loan reporting.

## Project principles

- Local-first: all operational records are stored on the device in SQLite.
- No backend, Firebase, Supabase, or cloud database.
- No mandatory authentication.
- Financial calculations run locally and use integer centavos.
- Finalized monthly loan reports preserve historical snapshots.
- Weekly Sinking Fund collection is strictly ₱50 per registered head and is tracked by Sunday collection week.
- Advance weekly contributions can cover consecutive future weeks and carry the remaining amount forward.
- Keep the scope focused on loan monitoring and reporting, not full lending management.

## Technology

- React Native + TypeScript
- Expo development builds
- React Navigation
- SQLite via Expo SQLite
- Android APK distribution

## Development workflow

- `main`: stable release branch.
- `dev`: active development and testing.
- Complete and verify one development phase before committing it.
- Do not merge to `main` until the changes have been tested and approved.

## Planned delivery

1. Project initialization, navigation, theme, and app structure
2. SQLite schema, migrations, and financial data models
3. Member and loan registration
4. Automatic monthly monitoring and interest calculations
5. Payment recording and loan allocation
6. Weekly Sinking Fund collection and advance allocation
7. Monthly Loan Collection reporting
8. Dashboard and fund balance monitoring
9. Historical loan reports and finalization
10. Database backup and restore
11. Testing, APK generation, and documentation

## Financial data rules

- Store monetary values as integer centavos.
- Use consistent ISO date formats.
- Enforce unique monthly monitoring records per loan and reporting month.
- Use transaction-safe database operations for financial writes.
- Never silently recalculate finalized historical reports after loan or payment edits.

## Status

Phases 1-10 are implemented on the `dev` branch. Current work is testing the separated weekly Sinking Fund and monthly Loan Collection workflow, final documentation, and APK testing before the custodian handoff.
