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

The application has eight main sections:

1. **Dashboard** - quick overview of the weekly fund collection and loan portfolio.
2. **Members** - add and view members and their registered heads.
3. **Loans** - create and manage loans.
4. **Payments** - record loan payments.
5. **Sinking Fund** - record and review the strict weekly ₱50-per-head collection.
6. **Loan Reports** - review and finalize monthly loan collection reports.
7. **Fund** - manage the fund ledger and balance.
8. **Settings** - backup and restore the database.

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

### Heads

Enter the number of registered heads for the member. The weekly Sinking Fund due is automatically calculated as **₱50 × heads**.

Example:

- 2 heads = ₱100/week
- 5 heads = ₱250/week
- 20 heads = ₱1,000/week

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

## 7. Sinking Fund — Weekly Collection

The Sinking Fund is collected **strictly every week** at **₱50 per registered head**. The weekly collection is tracked using a Sunday week.

### Weekly target

The application calculates:

**Weekly target = Total active heads × ₱50**

For example:

- 35 members
- 210 total heads
- Weekly target = 210 × ₱50 = **₱10,500**

### Recording a weekly collection

1. Open **Sinking Fund**.
2. Select the collection week.
3. Select the member.
4. Review the member's heads and weekly due.
5. Enter the amount actually collected.
6. Save the collection.

The weekly status shows each member's due, amount collected, and remaining amount.

### Advance payments

Advance payments are supported.

If a member pays more than the current week's due, the application automatically applies the payment to consecutive future weekly dues.

Example:

- Weekly due: ₱250
- Member pays: ₱600
- Current week: ₱250 covered
- Next week: ₱250 covered
- Remaining ₱100: carried to the following week

This keeps the weekly obligation intact while allowing advance payment.

### Weekly report

The Sinking Fund screen shows:

- Collection week
- Total members
- Total heads
- Weekly target
- Amount collected
- Remaining amount
- Member-by-member weekly status
- Recent Sinking Fund collections

The weekly Sinking Fund collection is separate from loan repayments.

> **Screenshot placeholder:** Weekly Sinking Fund screen

---

## 8. Dashboard

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

## 9. Loan Reports

The Loan Reports section is used for monthly loan collection monitoring. It is separate from the weekly Sinking Fund collection report.

### Reviewing a month

1. Open **Loan Reports**.
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

### Exporting the monthly loan report

The application can export the selected month's report as a **CSV file**.

This is an export function for reporting purposes.

---

## 10. Fund

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

## 11. Loan Archiving

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

## 12. Backup and Restore

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

## 13. Importing Data

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

## 14. Monthly Operating Routine

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

## 15. Backup Safety

The database backup may contain confidential financial information.

Treat backup files like the physical loan records.

Recommended practices:

- Keep backups in a secure location.
- Do not upload them to public websites.
- Do not share them through unsecured channels.
- Keep at least one reliable backup copy.
- Before restoring, verify that the backup belongs to the correct application and period.

---

## 16. Common Situations

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

## 17. Important Rules to Remember

| Item | Rule |
|---|---|
| Member ID | Numbers only |
| Member name | Optional |
| Heads | Required whole number; ₱50 per head per week |
| Weekly Sinking Fund | ₱50 per head, collected weekly |
| Advance weekly payment | Supported; carries forward to consecutive future weeks |
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

## 18. Before Using the App for Actual Records

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

## 19. Support / Troubleshooting

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

## 20. Screenshot Guide

Screenshots will be added to this guide after the custodian's first round of testing and feedback.

Recommended screenshots:

1. Main Dashboard
2. Add Member with Heads
3. Member list with weekly due
4. Weekly Sinking Fund
5. Add Loan
6. Loan calculation/payment schedule
7. Loan Payments selector
8. Payment recording/history
9. Monthly Loan Report
10. Fund ledger
11. Archived Loans
12. Backup/Restore settings

Screenshots should use sample/test records rather than real confidential member information.

---

## Quick Reference

**Add member:** Members → Add Member → Enter ID → Optional name/contact → Save

**Create loan:** Loans → Add Loan → Select Member → Optional Alias → Enter Loan Details → Save

**Review weekly collection:** Sinking Fund → Select Sunday Week → Review → Record Collections

**Record loan payment:** Payments → Select Member/Loan → Review Payment per Due Date → Enter Amount → Save

**Review loan month:** Loan Reports → Select Month → Review → Finalize when complete

**Export loan report:** Loan Reports → Select Month → Export CSV

**Backup:** Settings → Backup Database

**Restore:** Settings → Restore Database → Select valid database backup → Confirm

**Important:** There is currently no CSV/Excel data import feature.
