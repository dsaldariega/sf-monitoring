# SF Monitoring
## Custodian User Guide

**Version:** 1.1  
**Platform:** Android / Web  
**Installation name:** **SF Monitoring**  
**Data storage:** Local device only (offline-first)

---

## 1. About the App

**SF Monitoring** is an offline application for managing Sinking Fund collections, loan records, loan payments, monthly loan reports, and Fund balances.

Normal record keeping does not require an internet connection. Records are stored locally on the device.

### Privacy

Please keep the device and database backups secure.

- Do not share confidential screenshots unnecessarily.
- Do not upload database backups to public locations.
- Treat database backups as confidential financial records.

---

## 2. Main Menu

The application has eight main sections:

1. **Dashboard** — quick view of the current weekly Sinking Fund collection and loan portfolio.
2. **Members** — add and view members.
3. **Loans** — create and manage loans.
4. **Payments** — record loan payments.
5. **Sinking Fund** — record the strict weekly ₱50-per-head collection.
6. **Loan Reports** — review and finalize monthly loan collection reports.
7. **Fund** — review the Fund balance and ledger.
8. **Settings** — backup and restore the database.

> **Screenshot placeholder:** Dashboard / Main menu

---

## 3. Members

### Add a member

Member creation now opens in a **modal form** so the main Members screen stays simple.

1. Open **Members**.
2. Tap **+ Add member**.
3. Enter **Member ID** using numbers only.
   - Examples: 1, 2, 3, 10, 25.
4. Enter **Heads**.
5. Enter **Full name** if appropriate.
   - Full name is optional for privacy.
6. Enter **Contact number** if needed.
7. Review the fields.
8. Tap **Save member**.

The modal has **Save** and **Cancel** actions.

### Heads

Heads determine the weekly Sinking Fund obligation.

**Weekly due = Heads × ₱50**

Examples:

- 2 heads = ₱100/week
- 5 heads = ₱250/week
- 20 heads = ₱1,000/week

### Full name

The name may be left blank. The application displays **Name not provided** when no name is stored.

### Delete a member

Members now use **Delete** instead of Deactivate.

1. Find the member.
2. Tap **Delete**.
3. Review the warning.
4. Tap **Delete member** only if you are certain.

Deletion is permanent.

To protect financial history, the application blocks permanent deletion when the member already has loan or Sinking Fund financial records. In that situation, create a new member record instead of trying to erase historical financial data.

> **Screenshot placeholder:** Members screen  
> **Screenshot placeholder:** Add Member modal  
> **Screenshot placeholder:** Delete Member confirmation

---

## 4. Loans

### Register a loan

Loan creation now opens in a **modal form**.

1. Open **Loans**.
2. Tap **+ Register loan**.
3. Select the member.
4. Enter an optional **Loan Alias**.
5. Enter the loan amount.
6. Select the loan release date.
7. Enter the term in months.
8. Review the calculated payment summary and schedule.
9. Enter optional remarks if needed.
10. Tap **Save loan**.

The modal keeps the form, calculated preview, and Save/Cancel actions together.

### Loan alias

The alias is an optional short reference such as:

- A1
- B1
- C1
- A2

Use whatever short reference system the custodian prefers.

> **Screenshot placeholder:** Register Loan modal  
> **Screenshot placeholder:** Loan calculation preview

---

## 5. Loan Calculation Rules

The existing loan calculation rules are unchanged.

### Monthly interest

Monthly interest is **5% of the original principal**.

Interest is simple and does not compound.

Example:

- Principal: ₱10,000
- Term: 2 months
- Total interest: ₱1,000
- Total payable: ₱11,000

### Payment schedule

Payments are due every **15 calendar days**, starting 15 days after the loan release date.

For a 2-month loan:

- 4 scheduled installments
- ₱11,000 ÷ 4 = ₱2,750 per due date

### Missed-payment penalty

A missed installment receives a penalty of **2.5% of the original principal**.

For a ₱10,000 loan:

- ₱10,000 × 2.5% = **₱250 penalty**

The penalty is assessed once per missed due date and is not compounded.

---

## 6. Payments

### Record a payment

Payment recording now opens in a **modal form**.

1. Open **Payments**.
2. Tap **+ Record payment**.
3. Select the loan.
4. Review the loan information.
5. Review the **Payment per due date** and next payment date.
6. Enter the amount received.
7. Select the payment date.
8. Add an optional note.
9. Tap **Save payment**.

### Loan selector

Loans are displayed as:

**Member number · Loan alias**

Example:

**Member 1 · A1**

If no alias exists:

**Member 1 · No alias**

### Payment information

The modal shows:

- Original principal
- **Payment per due date**
- Next payment date
- Scheduled amount paid
- Penalties outstanding
- Outstanding balance

### Partial and multiple payments

Partial payments are supported.

Multiple payments can also be recorded against the same loan.

The existing payment allocation rules remain unchanged.

When all installments and applicable penalties are settled, the loan becomes **Paid**.

> **Screenshot placeholder:** Record Payment modal  
> **Screenshot placeholder:** Payment history

---

## 7. Sinking Fund — Weekly Collection

The Sinking Fund is the recurring weekly collection that builds the Fund used for loans.

The rule is strict:

**₱50 per registered head per week**

### Weekly target

The application calculates:

**Weekly target = Total active heads × ₱50**

Example:

- 35 members
- 210 total heads
- Weekly target = **₱10,500**

### Record a weekly collection

The collection form is now inside a **modal**.

1. Open **Sinking Fund**.
2. Select the collection week.
3. Tap **+ Record weekly collection**.
4. Select the member.
5. Review the member's heads and weekly due.
6. Enter the amount collected.
7. Select the payment date.
8. Add an optional note.
9. Tap **Save collection**.

The main screen remains focused on weekly collection status.

### Advance payments

Advance payments remain supported.

Example:

- Weekly due: ₱250
- Amount received: ₱600

The application applies:

- Current week: ₱250
- Next week: ₱250
- Following week: ₱100

The remaining ₱100 becomes advance credit for the following week.

### Weekly status

The Sinking Fund screen shows:

- Collection week
- Total heads
- Weekly target
- Collected amount
- Remaining amount
- Member-by-member status
- Recent Sinking Fund collections

The Sinking Fund collection is separate from loan repayments and monthly Loan Reports.

> **Screenshot placeholder:** Sinking Fund screen  
> **Screenshot placeholder:** Weekly Collection modal

---

## 8. Dashboard

The Dashboard now gives priority to the current weekly Sinking Fund collection.

It shows:

- Total heads
- Weekly target
- Weekly collected
- Weekly remaining
- Weekly collection progress
- Active loans
- Monthly loan target
- Loan collections
- Available Fund balance
- Loan portfolio figures

The weekly Sinking Fund and loan portfolio are intentionally shown as separate areas.

> **Screenshot placeholder:** Dashboard

---

## 9. Loan Reports

**Loan Reports** are monthly reports for the loan portfolio.

They are separate from the weekly Sinking Fund collection.

### Review a month

1. Open **Loan Reports**.
2. Select the month.
3. Review the monthly figures.
4. Review the individual loan activity.

### Finalize a report

When the month has been reviewed and is complete:

1. Review the report carefully.
2. Tap **Finalize report**.
3. Confirm the finalization.

Finalization creates a preserved historical snapshot.

### Export this month as CSV

Exporting now uses a **review modal** instead of immediately starting the export.

1. Open **Loan Reports**.
2. Select the month.
3. Tap **Export this month as CSV**.
4. Review what will be exported.
5. Tap **Export CSV** to continue, or **Cancel** to close the modal.
6. The Android share sheet is then used to save/share the CSV.

The CSV contains the selected month's loan collection summary and per-loan collection details.

> **Screenshot placeholder:** Loan Reports screen  
> **Screenshot placeholder:** CSV Export confirmation modal

---

## 10. Fund

The terminology is now simply **Fund**.

The application currently manages one fund:

**Sinking Fund**

### Add a Fund record

1. Open **Fund**.
2. Tap **+ Add Fund record**.
3. Review the fixed **Fund type: Sinking Fund**.
4. Select the transaction/movement:
   - Initial fund
   - Other income
   - Other expense
5. Enter the amount.
6. Select the transaction date.
7. Add an optional description.
8. Tap **Save Fund**.

Weekly Sinking Fund collections, loan releases, and loan collections are recorded automatically from their respective workflows.

### Fund balance

The Fund screen shows:

- Available balance
- Total inflow
- Total outflow
- Fund ledger

Loan releases reduce the available balance.

Loan collections and Sinking Fund contributions increase the available balance.

> **Screenshot placeholder:** Fund screen  
> **Screenshot placeholder:** Fund modal

---

## 11. Deleting Loans

Loans now use **Delete loan** instead of Archive.

### Delete a loan

1. Open **Loans**.
2. Find the loan.
3. Tap **Delete loan**.
4. Carefully read the confirmation.
5. Tap **Delete loan** only when you are certain.

Deleting a loan is permanent.

The deletion removes the loan's live payment/installment records and related Fund transactions. Finalized report snapshots are not rewritten.

Because this is destructive, always verify the loan and member before confirming.

> **Screenshot placeholder:** Delete Loan confirmation

---

## 12. Database Backup and Restore

### Backup Database

Backup now has a dedicated confirmation step.

1. Open **Settings**.
2. Tap **Backup database**.
3. Review the confirmation message.
4. Tap **Create backup**.
5. Use the Android share sheet to save the database backup securely.

A backup does not modify the current database.

The backup may contain confidential:

- Members
- Loans
- Payments
- Sinking Fund collections
- Fund transactions
- Reports
- Audit records

### Restore Database

Restore is intentionally more strongly protected because it can replace the current database.

1. Open **Settings**.
2. Tap **Restore database**.
3. Read the warning carefully.
4. If you need the current data, create a backup first.
5. Tap **Choose backup**.
6. Select the correct database backup.
7. The application validates the backup before restoring it.

### Important

Restoring a database replaces the current local database with the selected backup.

Any current records that are not contained in the selected backup can be lost.

**Do not restore a backup unless you are certain it is the correct file.**

> **Screenshot placeholder:** Settings screen  
> **Screenshot placeholder:** Backup confirmation  
> **Screenshot placeholder:** Restore confirmation

---

## 13. Importing Data

There is currently **no general CSV or Excel import feature**.

The application does not currently import:

- Excel member lists
- CSV member lists
- CSV loan lists
- CSV payment lists

Records are entered manually.

**Restore Database** is different from importing data. Restore replaces the complete local database using an application database backup.

---

## 14. Recommended Operating Routine

### Every week

1. Open **Sinking Fund**.
2. Select the correct Sunday collection week.
3. Review the weekly target.
4. Record member collections.
5. Check remaining amounts.
6. Check advance payments.

### During loan operations

1. Add new members when needed.
2. Register new loans.
3. Review the calculated payment schedule.
4. Record loan payments as they are received.
5. Review overdue amounts and penalties.

### At month end

1. Review Payments.
2. Review the Fund balance.
3. Open Loan Reports.
4. Review the selected month.
5. Finalize the monthly report when complete.
6. Export the CSV if needed.
7. Create a database backup.

---

## 15. Important Rules

| Item | Rule |
|---|---|
| App installation name | **SF Monitoring** |
| Member ID | Numbers only |
| Full name | Optional |
| Heads | Required whole number |
| Weekly Sinking Fund | **₱50 per head per week** |
| Weekly collection | Sunday-based week |
| Advance weekly payment | Supported |
| Loan monthly interest | 5% of original principal |
| Loan payment interval | Every 15 calendar days |
| Loan penalty | 2.5% of original principal per missed due date |
| Penalty compounding | No |
| Partial loan payments | Supported |
| Multiple loan payments | Supported |
| Data storage | Local device |
| Normal internet requirement | None |
| Loan report CSV export | Yes |
| CSV/Excel data import | No |
| Database backup | Yes |
| Database restore | Yes |

---

## 16. Before Using Live Records

Before using the application for actual records:

1. Confirm Member IDs.
2. Confirm each member's Heads.
3. Confirm the weekly Sinking Fund target.
4. Confirm loan amounts and terms.
5. Review calculated loan schedules.
6. Use clear loan aliases such as A1, B1, C1.
7. Record payments carefully.
8. Review monthly Loan Reports before finalizing.
9. Keep regular database backups.
10. Test the restore process with a safe backup when appropriate.

---

## 17. Troubleshooting

If something appears incorrect:

1. Do not immediately delete a record.
2. Check the member record.
3. Check the loan details.
4. Check the payment history.
5. Check the Sinking Fund weekly status.
6. Check the Fund ledger.
7. Check the selected Loan Report month.
8. Create a backup before attempting major corrective work.

When reporting an issue, describe what happened and provide a screenshot only after removing or avoiding confidential information.

---

## 18. Screenshot Guide

Screenshots should be captured after live custodian testing using sample records.

Recommended screenshots:

1. Dashboard
2. Members list
3. Add Member modal
4. Delete Member confirmation
5. Loans list
6. Register Loan modal
7. Delete Loan confirmation
8. Payments list
9. Record Payment modal
10. Sinking Fund weekly screen
11. Weekly Collection modal
12. Loan Reports
13. CSV Export confirmation
14. Fund screen
15. Fund modal
16. Backup confirmation
17. Restore confirmation

Do not use real confidential member records for documentation screenshots.

---

## Quick Reference

**Add member:** Members → + Add member → Fill form → Save member

**Delete member:** Members → Delete → Review warning → Delete member

**Register loan:** Loans → + Register loan → Fill form → Review schedule → Save loan

**Delete loan:** Loans → Delete loan → Review warning → Delete loan

**Record loan payment:** Payments → + Record payment → Select loan → Review → Enter amount → Save payment

**Record weekly Sinking Fund:** Sinking Fund → Select Sunday week → + Record weekly collection → Review → Save collection

**Review loan month:** Loan Reports → Select month → Review → Finalize report

**Export loan CSV:** Loan Reports → Select month → Export this month as CSV → Review → Export CSV

**Add Fund record:** Fund → + Add Fund record → Select movement → Fill form → Save Fund

**Backup:** Settings → Backup database → Review → Create backup

**Restore:** Settings → Restore database → Review warning → Choose backup

**Important:** There is currently no CSV/Excel data import feature.
