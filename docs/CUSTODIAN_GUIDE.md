# Sinking Fund Monthly Monitor
## Custodian User Guide

**Version:** 1.0  
**Platform:** Android  
**Data storage:** Local device only (offline-first)

---

## 1. About the App

Sinking Fund Monthly Monitor is a simple offline application for managing sinking fund loan records, payments, monthly monitoring, and fund balances.

The application is designed so that the records entered by the custodian remain on the device. The application does not require an internet connection for normal record keeping.

### Important privacy note

The application is intended to keep confidential member and loan information on the custodian's device.

Please:
- Keep the phone/tablet secure.
- Do not share the database backup with unauthorized people.
- Do not send screenshots containing confidential records to people who should not see them.
- Keep backup files in a secure location.

---

## 2. Main Menu

The application has seven main sections:

1. **Dashboard** - quick overview of the fund and loan portfolio.
2. **Members** - add and view members.
3. **Loans** - create and manage loans.
4. **Payments** - record loan payments.
5. **Reports** - review and finalize monthly monitoring.
6. **Fund** - manage the fund ledger and balance.
7. **Settings** - backup and restore the database.

> **Screenshot placeholder:** Main menu / Dashboard

---

## 3. Members

Use the Members section to create and view member records.

### Adding a member

1. Open **Members**.
2. Tap **Add Member**.
3. Enter the **Member ID**.
   - Use numbers only.
   - Examples: 1, 2, 3, 10, 25.
4. Enter the **Full Name** if it is appropriate to store it.
   - The name is optional for privacy.
5. Enter the **Contact Number** if needed.
6. Save the member.

### Member ID

The Member ID is the main identifier used by the application.

For example:

- Member 1
- Member 2
- Member 3

Use a consistent numbering system.

### Full name

The full name can be left blank. When no name is provided, the application displays **Name not provided**.

This allows the custodian to operate the loan monitor without unnecessarily storing identifying information.

> **Screenshot placeholder:** Add Member screen

---

## 4. Loans

The Loans section is used to create and manage the loan portfolio.

### Creating a loan

1. Open **Loans**.
2. Tap **Add Loan**.
3. Select the member.
4. Enter an optional **Loan Alias**.
5. Enter the loan amount.
6. Enter the loan term in months.
7. Select the loan/release date.
8. Review the calculated payment information.
9. Save the loan.

### Loan alias

The Loan Alias is an optional short reference used by the custodian.

Examples:

- A1
- B1
- C1
- A2

The alias can be assigned according to the custodian's preferred system.

It is recommended to keep aliases short and consistent.

> **Screenshot placeholder:** Loan creation / calculated schedule

---

## 5. Loan Calculation Rules

The application automatically calculates the loan schedule.

### Monthly interest

The fixed monthly interest is **5% of the original principal**.

Interest is simple and does not compound.

Example:

- Original loan: PHP 10,000
- Monthly interest: 5%
- Term: 2 months
- Total interest: PHP 1,000
- Total payable: PHP 11,000

### Payment schedule

Payments are scheduled every **15 calendar days**, starting 15 days after the loan release date.

For a 2-month loan:

- 2 months x 2 payment periods = 4 scheduled payments

Using the PHP 10,000 example:

- Total payable: PHP 11,000
- Number of payments: 4
- Payment per due date: PHP 2,750

The application displays the scheduled payment on the Payments screen.

### Penalty

A missed installment is assessed a penalty equal to **2.5% of the original principal**.

For a PHP 10,000 loan:

- 2.5% x PHP 10,000 = PHP 250 penalty per missed installment

The penalty is assessed once for each missed due date and does not compound.

> **Screenshot placeholder:** Loan creation / calculated schedule

---

## 6. Payments

Use the Payments section to record payments made against active loans.

### Selecting a loan

The payment selector identifies the loan using:

**Member number · Loan alias**

Example:

**Member 1 · A1**

If a loan does not have an alias, the application displays **No alias**.

### Reviewing the next payment

After selecting a loan, review:

- Original principal
- **Payment per due date**
- Next payment date
- Scheduled amount paid
- Penalties outstanding
- Outstanding balance

The **Payment per due date** is the scheduled installment amount for the next outstanding payment period.

> **Screenshot placeholder:** Payments screen with selected loan

### Recording a payment

1. Open **Payments**.
2. Select the member/loan.
3. Review the next payment information.
4. Enter the amount actually received.
5. Tap the save/record payment action.
6. Confirm that the payment appears in the payment history.

### Partial payments

Partial payments are supported.

If a member cannot pay the entire scheduled amount, record the amount actually received. The remaining amount stays outstanding.

Additional payments can be recorded later.

### Multiple payments

More than one payment can be recorded against the same loan.

The application applies payments to the outstanding loan schedule automatically.

### Payment completion

When all required installments and applicable penalties have been settled, the loan is marked as paid.

---

## 7. Dashboard

The Dashboard provides a quick overview of the current fund and loan portfolio.

Use it to check:

- Active loans
- Principal released
- Expected interest
- Installment targets
- Actual collections
- Outstanding portfolio
- Overdue installments
- Available fund balance

The Dashboard is intended as a quick status screen. Use the Reports and Fund sections for more detailed review.

> **Screenshot placeholder:** Dashboard

---

## 8. Monthly Reports

The Reports section is used for monthly monitoring.

### Reviewing a month

1. Open **Reports**.
2. Select the month to review.
3. Review the monthly summary.
4. Review the individual loan activity.
5. Confirm that the figures are correct.

### Finalizing a month

A month can be finalized after the custodian has completed the monthly review.

Finalization creates a preserved snapshot of the report.

Once finalized, the historical report is not silently rewritten by later changes to the active records.

### Important

Review the month's records carefully before finalizing.

> **Screenshot placeholder:** Monthly Reports screen

### Exporting the monthly report

The application can export the selected month's report as a **CSV file**.

This is an export function for reporting purposes.

---

## 9. Fund

The Fund section provides a ledger of fund movements.

It can include:

- Initial fund
- Member contributions
- Other income
- Other expenses
- Loan releases
- Loan collections
- Current available balance
- Transaction history

Loan releases automatically reduce the available fund balance.

Loan collections automatically increase the available fund balance.

> **Screenshot placeholder:** Fund screen

### Checking the available balance

Use the Fund section when you need to verify how much money is currently available after recorded fund movements.

---

## 10. Loan Archiving

Completed or inactive loans can be archived.

### Archive a loan

1. Open **Loans**.
2. Select the appropriate loan.
3. Choose the archive action.
4. Confirm the action.

Archived loans are removed from the active portfolio view but their financial history is retained.

### Restore an archived loan

If an archived loan needs to return to the active portfolio, use the restore action from the archived loans area.

---

## 11. Backup and Restore

The application stores its working database locally on the device.

Regular backups are strongly recommended.

### Creating a database backup

1. Open **Settings**.
2. Select **Backup Database**.
3. Choose where to save/share the backup.
4. Store the backup in a secure location.

The backup is a complete SQLite database backup.

### When to make a backup

Recommended times:

- Before major changes.
- After completing an important reporting period.
- Before changing or replacing the device.
- Before reinstalling the application.
- Regularly as part of normal record keeping.

### Restoring a database

1. Open **Settings**.
2. Select **Restore Database**.
3. Choose a previously created database backup.
4. Review the restore confirmation.
5. Confirm only if you are sure the selected backup is the correct one.

### Important restore warning

Restoring a database replaces the application's current database with the selected backup.

Always make a fresh backup of the current database before restoring another backup.

### Backup compatibility

The restore function validates the selected database before attempting to restore it. A normal CSV or Excel file cannot be used as a database restore file.

---

## 12. Importing Data

There is currently **no general data import feature**.

The application does not currently support importing:

- Excel files
- CSV member lists
- CSV loan lists
- CSV payment lists
- Other external data files

Records are entered manually in the application.

The **Restore Database** function is different from importing data. It restores a complete database backup created by the application.

---

## 13. Monthly Operating Routine

A simple routine is recommended.

### During normal operations

1. Add new members when needed.
2. Create new loans when loans are released.
3. Record payments as they are received.
4. Review overdue payments.
5. Check the Dashboard and Fund balance when needed.

### At the end of the month

1. Review loan payments.
2. Check outstanding balances.
3. Review the monthly report.
4. Confirm fund movements.
5. Finalize the monthly report.
6. Export the monthly CSV if needed.
7. Create a database backup.

---

## 14. Backup Safety

The database backup may contain confidential financial information.

Treat backup files like the physical loan records.

Recommended practices:

- Keep backups in a secure location.
- Do not upload them to public websites.
- Do not share them through unsecured channels.
- Keep at least one reliable backup copy.
- Before restoring, verify that the backup belongs to the correct application and period.

---

## 15. Common Situations

### A member's name is unknown or should not be stored

Leave the Full Name field blank.

The member can still be identified by Member ID.

### A loan does not have an alias

The loan can still be recorded. The payment screen will display **No alias**.

### A member makes only a partial payment

Record the amount actually received. The remaining amount stays outstanding.

### A member misses a payment date

The application assesses the applicable missed-installment penalty according to the loan rules.

### The application is closed

The records remain stored locally. Open the application again to continue working.

### The phone is replaced

Create a database backup from the old device and keep it securely. Use the Restore Database function on the new installation when appropriate.

---

## 16. Important Rules to Remember

| Item | Rule |
|---|---|
| Member ID | Numbers only |
| Member name | Optional |
| Monthly interest | 5% of original principal |
| Payment interval | Every 15 calendar days |
| Penalty | 2.5% of original principal per missed installment |
| Penalty compounding | No |
| Partial payments | Supported |
| Multiple payments | Supported |
| Data storage | Local device |
| Internet required for normal operation | No |
| CSV export | Yes |
| CSV/Excel import | No |
| Database backup | Yes |
| Database restore | Yes |

---

## 17. Before Using the App for Actual Records

Before entering live records:

1. Confirm the correct Member ID.
2. Confirm the loan amount.
3. Confirm the loan term.
4. Confirm the loan/release date.
5. Review the calculated payment.
6. Check the loan alias.
7. Record payments carefully.
8. Review the monthly report before finalizing.
9. Keep regular database backups.

---

## 18. Support / Troubleshooting

If something appears incorrect:

1. Do not immediately delete records.
2. Check the member and loan information.
3. Check the payment history.
4. Check the Fund transaction history.
5. Check the selected reporting month.
6. Check whether the loan is archived.
7. If the issue involves the database, create a backup before attempting further changes.

When reporting a problem, provide a description of what happened and, if possible, a screenshot that does not expose confidential information.

---

## 19. Screenshot Guide

Screenshots will be added to this guide after the custodian's first round of testing and feedback.

Recommended screenshots:

1. Main Dashboard
2. Add Member
3. Member list
4. Add Loan
5. Loan calculation/payment schedule
6. Payments loan selector
7. Payment recording
8. Payment history
9. Monthly Report
10. Fund ledger
11. Archived Loans
12. Backup/Restore settings

Screenshots should use sample/test records rather than real confidential member information.

---

## Quick Reference

**Add member:** Members → Add Member → Enter ID → Optional name/contact → Save

**Create loan:** Loans → Add Loan → Select Member → Optional Alias → Enter Loan Details → Save

**Record payment:** Payments → Select Member/Loan → Review Payment per Due Date → Enter Amount → Save

**Review month:** Reports → Select Month → Review → Finalize when complete

**Export report:** Reports → Select Month → Export CSV

**Backup:** Settings → Backup Database

**Restore:** Settings → Restore Database → Select valid database backup → Confirm

**Important:** There is currently no CSV/Excel data import feature.
