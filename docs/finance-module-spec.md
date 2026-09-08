# Finance Module Specification

**Status:** Ready for implementation  
**Prepared:** 2026-09-08  
**Module:** Finance  
**Reference:** `https://originalsfootball.club/ac/collections` and supplied screenshots

## 1. Purpose

The Finance module gives club members a transparent view of money collected and bills paid. Authorized staff can record and correct individual collection and bill-payment entries while all verified members can review the ledgers.

## 2. Scope Baseline

### In Scope

- A Finance navigation group with **Collections (+)** and **Bill Payment (-)** pages.
- A collection ledger, monthly collection chart, search, year/month filters, creation, and editing.
- A bill-payment ledger, monthly expense chart, search, year/month filters, creation, and editing.
- Player selection from the club roster when recording a collection.
- Generated transaction and voucher identifiers.
- Existing SDFC staff/member permissions and responsive application styling.

### Out of Scope

- Bulk collection.
- Finance configuration screens for cost types, bank/mobile accounts, or voucher types.
- Voucher register and account reports.
- Attachments, receipt uploads, approvals, refunds, and deletion.
- Importing data from the reference website.

## 3. Actors and Permissions

| Actor | Capabilities |
|---|---|
| Verified player | View collection and bill-payment pages, charts, filters, and records. |
| Moderator | All player capabilities plus create and edit collections and bill payments. |
| Administrator | All moderator capabilities. |

## 4. User Scenarios and Acceptance Criteria

### US1 - Review Collections (Priority P1)

As a verified member, I want to review payment collections so that I can understand who paid, when payment was collected, and where it was received.

**Acceptance scenarios**

1. **Given** collection records exist, **when** the member opens Collections, **then** the monthly chart and collection table are shown with the newest records first.
2. **Given** the member enters a complete or partial transaction ID or voucher, **when** the search is applied, **then** only matching records remain visible.
3. **Given** the member chooses a year and/or month, **when** the filter changes, **then** the table shows only records in that period.
4. **Given** no records match, **when** filtering finishes, **then** the page shows a clear empty state without hiding the filters.

### US2 - Add and Edit a Collection (Priority P1)

As an administrator or moderator, I want to record a player's collection so that the club ledger remains accurate.

**Acceptance scenarios**

1. **Given** staff opens New Collection, **when** the dialog appears, **then** it contains Player, Collection Date, Amount, Month of Collection, Received Into, and Comments fields.
2. **Given** valid required values, **when** staff selects Create, **then** one collection is stored with generated transaction/voucher IDs and immediately appears in the table and chart.
3. **Given** a required field is missing or Amount is not greater than zero, **when** staff submits, **then** the dialog remains open and identifies the invalid field.
4. **Given** staff selects Edit on an existing collection, **when** changes are saved, **then** that record and the chart reflect the corrected values.

### US3 - Review Bill Payments (Priority P1)

As a verified member, I want to review bill payments so that I can understand club expenses and their payment source.

**Acceptance scenarios**

1. **Given** bill-payment records exist, **when** the member opens Bill Payment, **then** the monthly expense chart and ledger are shown with the newest records first.
2. **Given** the member searches by Bill ID or voucher or applies year/month filters, **when** the criteria change, **then** the ledger shows only matching records.
3. **Given** no records exist or loading fails, **when** the page resolves, **then** a clear empty or error state is shown.

### US4 - Add and Edit a Bill Payment (Priority P1)

As an administrator or moderator, I want to record a bill payment so that club expenses are categorized and auditable.

**Acceptance scenarios**

1. **Given** staff opens New Bill Payment, **when** the dialog appears, **then** it contains Cost Type, Amount, Date, Paid From, and Comments fields.
2. **Given** valid required values, **when** staff selects Create, **then** one bill payment is stored with generated bill/voucher IDs and immediately appears in the ledger and chart.
3. **Given** staff selects Edit, **when** changes are saved, **then** the existing bill is updated without creating a duplicate.

### US5 - Enforce Finance Permissions (Priority P1)

As a club administrator, I want finance changes limited to staff so that ordinary members cannot alter financial records.

**Acceptance scenarios**

1. **Given** a verified player views either ledger, **when** the page loads, **then** create and edit controls are absent.
2. **Given** a player attempts a direct finance write, **when** authorization is evaluated, **then** the request is rejected.

## 5. Functional Requirements

### Navigation and Access

- **REQ-001:** The Finance navigation item MUST expand to show **Collections (+)** and **Bill Payment (-)** destinations and indicate the active destination.
- **REQ-002:** Every verified player, moderator, and administrator MUST be able to read collection and bill-payment records.
- **REQ-003:** Only moderators and administrators MUST be able to create or edit collection and bill-payment records.

### Collections

- **REQ-004:** The Collections ledger MUST show Transaction ID, Date, Month of Payment, Payer Name, Amount, Voucher, Received Into, and Total Amount; staff rows MUST also show an Edit action.
- **REQ-005:** Collection records MUST be ordered by collection date descending by default.
- **REQ-006:** Members MUST be able to perform case-insensitive partial search by Transaction ID or voucher.
- **REQ-007:** Members MUST be able to filter collection records by year and month, including All Years and All Months options.
- **REQ-008:** The Collections page MUST show a January-to-December monthly amount chart for a selected year, using zero for months without collections.
- **REQ-009:** The New Collection dialog MUST collect Player, Collection Date, Amount, Month of Collection, optional Received Into, and optional Comments.
- **REQ-010:** Player MUST be chosen from the current club roster; Collection Date, Month of Collection, and an Amount greater than zero MUST be required.
- **REQ-011:** Creating a collection MUST generate a unique `COL`-prefixed Transaction ID and an `RV`-prefixed voucher that includes the collection year.
- **REQ-012:** After successful collection creation, the dialog MUST close and the table, filters, and chart MUST refresh without a full page reload.
- **REQ-013:** Staff MUST be able to edit collection business fields while retaining the record's original generated identifiers.
- **REQ-014:** The Collections page MUST provide loading, no-data, no-match, save-error, and load-error states.

### Bill Payments

- **REQ-015:** The Bill Payment ledger MUST show Bill ID, Voucher, Date, Cost Type, Paid From, and Amount; staff rows MUST also show an Edit action.
- **REQ-016:** Bill-payment records MUST be ordered by payment date descending by default.
- **REQ-017:** Members MUST be able to perform case-insensitive partial search by Bill ID or voucher and filter by year and month.
- **REQ-018:** The Bill Payment page MUST show a January-to-December monthly expense chart for a selected year, using zero for months without payments.
- **REQ-019:** The New Bill Payment dialog MUST collect Cost Type, Amount, Date, optional Paid From, and optional Comments.
- **REQ-020:** Cost Type, Date, and an Amount greater than zero MUST be required. Cost Type choices MUST include Match Day Expenses, Equipment & Kits, Food & Beverages, Transportation, Training & Coaching, Medical & Physio, Administration, Tournament Fees, Grounds Maintenance, and Miscellaneous.
- **REQ-021:** Creating a bill payment MUST generate a unique `BIL`-prefixed Bill ID and a `PV`-prefixed voucher that includes the payment year.
- **REQ-022:** After successful bill-payment creation, the dialog MUST close and the table, filters, and chart MUST refresh without a full page reload.
- **REQ-023:** Staff MUST be able to edit bill-payment business fields while retaining the record's original generated identifiers.

### Shared Behavior

- **REQ-024:** Amounts MUST be displayed in Bangladeshi taka with two decimal places, and dates/months MUST use consistent human-readable formats.
- **REQ-025:** Existing generic finance transactions MUST remain readable during rollout and MUST be classified or migrated without silently discarding records.
- **REQ-026:** Both pages and dialogs MUST remain usable without horizontal page overflow on supported mobile and desktop viewports, with labeled controls, keyboard operation, focus management, and visible validation messages.

## 6. Key Entities

### Collection

| Field | Meaning |
|---|---|
| id | Internal immutable record identity. |
| transactionId | User-visible unique identifier beginning with `COL`. |
| voucher | User-visible receipt voucher beginning with `RV` and containing the year. |
| playerId / payerName | Stable roster reference and display-name snapshot. |
| collectionDate | Date on which money was collected. |
| paymentMonth | Month to which the payment applies. |
| amount | Positive amount collected. |
| receivedInto | Optional account/person receiving the funds. |
| comments | Optional internal note. |
| createdAt / updatedAt | Audit timestamps. |

### Bill Payment

| Field | Meaning |
|---|---|
| id | Internal immutable record identity. |
| billId | User-visible unique identifier beginning with `BIL`. |
| voucher | User-visible payment voucher beginning with `PV` and containing the year. |
| costType | Expense category. |
| paymentDate | Date on which the bill was paid. |
| amount | Positive amount paid. |
| paidFrom | Optional account/person used to pay the bill. |
| comments | Optional internal note. |
| createdAt / updatedAt | Audit timestamps. |

## 7. Business Rules

- A single collection's Total Amount equals its Amount; the separate column is retained to match the reference ledger and permit future multi-line collections.
- Generated display IDs are immutable after creation.
- Editing a roster player's name later does not rewrite historic ledger rows; each collection keeps the payer-name snapshot captured at creation.
- Optional Received Into and Paid From values display as `-` when not specified.
- Filter choices are derived from available record dates. The chart year defaults to the current year when available, otherwise the newest year represented by the data.

## 8. Assumptions

- The current SDFC permission model remains authoritative: verified users read; administrators and moderators write.
- The current roster is the source for the Player dropdown. Inactive players remain visible for editing old records but are excluded from new collection selection.
- SDFC-specific receiver/payer accounts can initially be a small configured list plus **Not specified**; a configuration screen is outside this scope.
- Search and filtering operate on the records already loaded for the page; expected club-scale volume does not require pagination in this release.
- Create and edit are required. Delete is intentionally excluded because financial record deletion needs a separate audit/void policy.

## 9. Success Criteria

- **SC-001:** Staff can create a valid collection or bill payment in under 60 seconds using no more than one dialog.
- **SC-002:** A newly saved or edited record appears in its ledger and changes the relevant chart within 2 seconds under normal connectivity.
- **SC-003:** Search and year/month filtering update visible results within 1 second for at least 2,000 records.
- **SC-004:** 100% of attempted finance writes by verified players are rejected while their read access remains available.
- **SC-005:** Every created record has a non-empty, unique display ID and voucher and retains those values after editing.
- **SC-006:** All acceptance scenarios pass at desktop and mobile widths with no clipped form actions or overlapping table controls.

## 10. Reference Findings

The authenticated reference screen was reviewed on 2026-09-08. It confirmed the ledger columns, monthly chart/year selector, transaction/voucher search, year/month filters, edit actions, modal fields, default current date/month, default collection amount of 1000, optional account fields, and the ten bill cost types. Reference-only Bulk Collect, Configuration, Voucher, and Accounts Reports features are not included in this specification.