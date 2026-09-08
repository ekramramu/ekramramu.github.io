# Finance Module Implementation Plan

**Source specification:** [finance-module-spec.md](finance-module-spec.md)  
**Target application:** SDFC Club Portal  
**Plan status:** Ready for execution

## 1. Summary

Replace the current single generic Finance page with two routed ledgers: Collections and Bill Payment. Reuse the existing hash router, modal helper, player roster data, role checks, table styles, and Firestore Lite access layer. Introduce richer finance records while retaining a compatibility path for existing `financeTransactions` documents.

## 2. Technical Context

- The application is a static, client-rendered ES-module site.
- `js/app.js` owns route registration and page dispatch.
- `js/layout.js` owns grouped sidebar navigation.
- `js/data.js` owns Firestore reads and writes.
- `js/modal.js` and the modal styles in `css/styles.css` provide the established dialog pattern.
- `js/pages/finance.js` currently renders a combined collection/expense table and is the main replacement surface.
- `firestore.rules` allows verified users to read `financeTransactions` and staff to write.
- There is no automated test framework or build script in `package.json`; validation will use syntax checks, Firestore rules validation/deployment checks where available, and browser workflow testing.

## 3. Design Decisions

1. Use separate `financeCollections` and `financeBillPayments` collections so each record has a clear schema and queries do not depend on optional type-specific fields.
2. Keep `financeTransactions` read-only as a legacy source during rollout. Normalize legacy `collection` and `expense` documents into the appropriate ledger view until a one-time migration is completed.
3. Generate display IDs in the browser from cryptographically strong random characters, retrying against loaded IDs on collision. Firestore document IDs remain the canonical internal identity.
4. Preserve generated transaction/bill and voucher IDs on edit.
5. Store both `playerId` and `payerName` on collections to preserve history if the roster name changes.
6. Keep cost types and initial account choices as exported finance constants until configuration screens are separately specified.
7. Use lightweight DOM/SVG or canvas chart rendering without adding a chart dependency for a fixed twelve-point monthly series.

## 4. Implementation Steps and Tasks

### Phase 1 - Routes and Navigation

#### P1.1 Add Finance child routes and compatibility redirect

Addresses: REQ-001

- [ ] T001 [Plan:1.1] Change Finance into a grouped sidebar item with Collections (+) and Bill Payment (-) children in `js/layout.js`.
- [ ] T002 [Plan:1.1] Add `/finance/collections` and `/finance/bill-payments` to protected routes and route dispatch in `js/app.js`; make `/finance` navigate to `/finance/collections`.

### Phase 2 - Finance Data Layer and Authorization

#### P2.1 Add typed collection and bill-payment persistence

Addresses: REQ-002, REQ-003, REQ-005, REQ-011, REQ-013, REQ-016, REQ-021, REQ-023

- [ ] T003 [Plan:2.1] Add list/create/update functions for `financeCollections` and `financeBillPayments` in `js/data.js`, ordering each list by its business date descending and adding audit timestamps.
- [ ] T004 [Plan:2.1] Add deterministic finance payload normalization and immutable generated-ID handling to the create/update functions in `js/data.js`.
- [ ] T005 [Plan:2.1] Add verified-read/staff-write rules for `financeCollections` and `financeBillPayments` in `firestore.rules` while retaining legacy `financeTransactions` read access.

#### P2.2 Preserve legacy finance records

Addresses: REQ-025

- [ ] T006 [Plan:2.2] Add legacy `financeTransactions` normalization helpers in `js/data.js` that map old `collection` and `expense` records into read-only ledger rows with explicit legacy identifiers.
- [ ] T007 [Plan:2.2] Document the legacy compatibility period and optional one-time data migration procedure in `README.md`.

### Phase 3 - Shared Finance Presentation

#### P3.1 Build reusable finance utilities

Addresses: REQ-006, REQ-007, REQ-008, REQ-017, REQ-018, REQ-024

- [ ] T008 [Plan:3.1] Add shared finance constants, generated display-ID helper, case-insensitive search, date-derived filter options, filtering, and monthly aggregation helpers in `js/pages/finance.js`.
- [ ] T009 [Plan:3.1] Add reusable year chart, filter bar, currency/date formatting integration, and empty/error-state rendering in `js/pages/finance.js`.

#### P3.2 Extend established visual components

Addresses: REQ-026

- [ ] T010 [P] [Plan:3.2] Add Finance page layout, fixed-height chart, filter toolbar, wide modal, responsive table, focus, and validation styles in `css/styles.css` using existing design tokens.
- [ ] T011 [P] [Plan:3.2] Ensure `js/modal.js` closes on overlay/Escape, moves focus into the dialog, restores trigger focus, and exposes dialog semantics without changing existing venue/match-day behavior.

### Phase 4 - Collections Workflow

#### P4.1 Render and filter the Collections ledger

Addresses: REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-014, REQ-024

- [ ] T012 [US1] [Plan:4.1] Implement `renderCollectionsPage` in `js/pages/finance.js` with the required columns, default descending order, year chart, search, year/month filters, loading state, empty states, and load-error state.
- [ ] T013 [US1] [Plan:4.1] Wire Collections route dispatch to `renderCollectionsPage` in `js/app.js` and verify player-role rendering omits mutation controls.

#### P4.2 Create and edit a Collection

Addresses: REQ-003, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014

- [ ] T014 [US2] [Plan:4.2] Build the Collection modal in `js/pages/finance.js` using `listPlayers()`, active-player selection, current-date/current-month defaults, optional receiver/comments fields, and field-level validation.
- [ ] T015 [US2] [Plan:4.2] Wire create/update submission, generated `COL`/`RV` identifiers, immutable identifiers on edit, save-error feedback, and in-place table/chart/filter refresh in `js/pages/finance.js`.

### Phase 5 - Bill Payment Workflow

#### P5.1 Render and filter the Bill Payment ledger

Addresses: REQ-015, REQ-016, REQ-017, REQ-018, REQ-024

- [ ] T016 [US3] [Plan:5.1] Implement `renderBillPaymentsPage` in `js/pages/finance.js` with required columns, descending order, year chart, search, year/month filters, and loading/empty/error states.
- [ ] T017 [US3] [Plan:5.1] Wire Bill Payment route dispatch to `renderBillPaymentsPage` in `js/app.js` and verify player-role rendering omits mutation controls.

#### P5.2 Create and edit a Bill Payment

Addresses: REQ-003, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023

- [ ] T018 [US4] [Plan:5.2] Build the Bill Payment modal and ten required cost-type options in `js/pages/finance.js`, with current-date default, optional paid-from/comments fields, and field-level validation.
- [ ] T019 [US4] [Plan:5.2] Wire create/update submission, generated `BIL`/`PV` identifiers, immutable identifiers on edit, save-error feedback, and in-place table/chart/filter refresh in `js/pages/finance.js`.

### Phase 6 - Validation and Documentation

#### P6.1 Validate permissions, behavior, and responsive presentation

Addresses: REQ-002, REQ-003, REQ-012, REQ-014, REQ-022, REQ-026

- [ ] T020 [US5] [Plan:6.1] Run JavaScript syntax checks for changed modules and validate Firestore rules against read/write role cases.
- [ ] T021 [US1] [US2] [Plan:6.1] Browser-test Collections create, edit, validation, search, filters, chart updates, loading/empty/error states, and player read-only behavior.
- [ ] T022 [US3] [US4] [Plan:6.1] Browser-test Bill Payment create, edit, validation, search, filters, chart updates, loading/empty/error states, and player read-only behavior.
- [ ] T023 [Plan:6.1] Capture desktop and mobile screenshots and verify dialogs, charts, filter controls, table scrolling, keyboard focus, and visible errors do not overlap or clip.

#### P6.2 Update module documentation

Addresses: REQ-001, REQ-002, REQ-003, REQ-025

- [ ] T024 [Plan:6.2] Update the Finance data model, routes, role permissions, and local validation instructions in `README.md`.

## 5. Project Structure After Implementation

```text
js/
  app.js                         # Finance routes and dispatch
  data.js                        # Collection/bill CRUD and legacy normalization
  layout.js                      # Finance submenu
  modal.js                       # Accessible dialog behavior
  pages/
    finance.js                   # Both ledgers, forms, filters, and charts
css/
  styles.css                     # Finance and responsive presentation
firestore.rules                  # Typed finance collection permissions
README.md                        # Data model, permissions, migration notes
docs/
  finance-module-spec.md
  finance-module-implementation-plan.md
```

## 6. Validation Strategy

- Run `node --check` against each changed JavaScript file.
- Use Firebase rules validation/emulator coverage if available; otherwise deploy rules only after manual role-case review.
- Exercise administrator, moderator, and player behavior separately.
- Test valid creation, invalid submission, edit, search, combined year/month filters, zero-data chart months, save failure, and load failure.
- Verify at approximately 390px mobile, 768px tablet, and 1440px desktop widths.
- Confirm existing `/finance` links redirect correctly and legacy records remain visible.

## 7. Rollout and Data Compatibility

1. Deploy the application and Firestore rules together so new collection paths are authorized when the UI goes live.
2. Continue reading legacy `financeTransactions` records into the new ledgers during the compatibility period.
3. Mark normalized legacy rows as read-only because they lack complete typed fields and stable generated IDs.
4. Optionally migrate legacy records after production verification, preserving original Firestore IDs and dates.
5. Remove legacy reads only after record counts and monetary totals match before and after migration.

## 8. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Client-generated display ID collision | Use strong random values, compare against loaded IDs, and retry before create. Firestore IDs remain canonical. |
| Historic payer name changes | Store both player ID and payer-name snapshot. |
| Existing generic records lack new fields | Normalize them as labeled, read-only legacy rows until migration. |
| Chart and table totals disagree | Use one normalized, filtered record set and one amount-normalization helper for both views. |
| Rules/UI deployed at different times | Coordinate app and rule rollout and test staff writes before announcing availability. |
| Financial records removed without audit | Exclude deletion until a void/audit workflow is specified. |

## 9. Requirement Mapping

| REQ ID | Short Description | Plan Items | Implementation Evidence |
|---|---|---|---|
| REQ-001 | Finance child navigation | P1.1, P6.2 | `js/layout.js`, `js/app.js`, `README.md` |
| REQ-002 | Verified-member read access | P2.1, P6.1, P6.2 | `firestore.rules`, browser role checks |
| REQ-003 | Staff-only mutations | P2.1, P4.2, P5.2, P6.1, P6.2 | `firestore.rules`, `js/pages/finance.js` |
| REQ-004 | Collection ledger columns | P4.1 | `js/pages/finance.js` |
| REQ-005 | Collection date ordering | P2.1, P4.1 | `js/data.js`, `js/pages/finance.js` |
| REQ-006 | Collection search | P3.1, P4.1 | `js/pages/finance.js` |
| REQ-007 | Collection date filters | P3.1, P4.1 | `js/pages/finance.js` |
| REQ-008 | Monthly collection chart | P3.1, P4.1 | `js/pages/finance.js` |
| REQ-009 | Collection form fields | P4.2 | `js/pages/finance.js` |
| REQ-010 | Collection validation/roster | P4.2 | `js/pages/finance.js`, `js/data.js` |
| REQ-011 | Collection IDs and voucher | P2.1, P4.2 | `js/data.js`, `js/pages/finance.js` |
| REQ-012 | Collection refresh after save | P4.2, P6.1 | `js/pages/finance.js`, browser checks |
| REQ-013 | Collection editing | P2.1, P4.2 | `js/data.js`, `js/pages/finance.js` |
| REQ-014 | Collection UI states | P4.1, P4.2, P6.1 | `js/pages/finance.js` |
| REQ-015 | Bill ledger columns | P5.1 | `js/pages/finance.js` |
| REQ-016 | Bill date ordering | P2.1, P5.1 | `js/data.js`, `js/pages/finance.js` |
| REQ-017 | Bill search and filters | P3.1, P5.1 | `js/pages/finance.js` |
| REQ-018 | Monthly expense chart | P3.1, P5.1 | `js/pages/finance.js` |
| REQ-019 | Bill form fields | P5.2 | `js/pages/finance.js` |
| REQ-020 | Bill validation/cost types | P5.2 | `js/pages/finance.js` |
| REQ-021 | Bill IDs and voucher | P2.1, P5.2 | `js/data.js`, `js/pages/finance.js` |
| REQ-022 | Bill refresh after save | P5.2, P6.1 | `js/pages/finance.js`, browser checks |
| REQ-023 | Bill editing | P2.1, P5.2 | `js/data.js`, `js/pages/finance.js` |
| REQ-024 | Currency/date formatting | P3.1, P4.1, P5.1 | `js/utils.js`, `js/pages/finance.js` |
| REQ-025 | Legacy data compatibility | P2.2, P6.2 | `js/data.js`, `README.md` |
| REQ-026 | Responsive accessibility | P3.2, P6.1 | `css/styles.css`, `js/modal.js`, screenshots |

## 10. Definition of Done

- All 26 requirements have implementation evidence.
- All 24 tasks are complete.
- Administrator and moderator can create/edit both record types; players can only view.
- Search, filters, charts, empty/error states, and immediate refresh behavior pass browser checks.
- Legacy records remain visible and monetary totals are reconciled.
- Syntax and Firestore permission checks pass.
- Mobile and desktop screenshots show no clipping, overlap, or inaccessible dialog actions.