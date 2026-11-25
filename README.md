# Sinking Fund Monthly Monitor

An offline-first Android application for monthly Sinking Fund loan monitoring, collection tracking, portfolio summaries, and end-of-month reporting.

## Project principles

- Local-first: all operational records are stored on the device in SQLite.
- No backend, Firebase, Supabase, or cloud database.
- No mandatory authentication.
- Financial calculations run locally and use integer centavos.
- Finalized monthly reports preserve historical snapshots.
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
5. Payment recording and allocation
6. Monthly Sinking Fund Report
7. Dashboard and portfolio monitoring
8. Actual Pondo monitoring
9. Historical reports and finalization
10. Database backup and restore
11. Testing, APK generation, and documentation

## Financial data rules

- Store monetary values as integer centavos.
- Use consistent ISO date formats.
- Enforce unique monthly monitoring records per loan and reporting month.
- Use transaction-safe database operations for financial writes.
- Never silently recalculate finalized historical reports after loan or payment edits.

## Status

Project repository initialized. Phase 1 is next.
