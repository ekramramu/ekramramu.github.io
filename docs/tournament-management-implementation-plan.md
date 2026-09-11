# Tournament Management Implementation Plan

**Source:** [tournament-management-spec.md](tournament-management-spec.md)  
**Status:** Implemented; authenticated production writes require final staff-account verification

## 1. Architecture

Use `tournaments` as the aggregate root and `teams`, `fixtures`, and `collections` as subcollections. Keep Players and Venues as shared source lists. Use the existing hash router and `#/tournaments/manage/<id>` for each workspace (while accepting legacy `?id=` links), existing modal behavior for forms, and current staff-role checks plus Firestore `isStaff()` enforcement.

## 2. Execution Tasks

### Phase 1 - Persistence and Security

- [x] **T001 (REQ-001, REQ-002):** Add tournament, team, fixture, and collection list/create/update APIs in `js/data.js`.
- [x] **T002 (REQ-002, REQ-011):** Add verified-read/staff-create/update and administrator-delete Firestore rules for the tournament aggregate and all child collections.

### Phase 2 - Routes and Navigation

- [x] **T003 (REQ-005):** Replace `/tournament-2026` with `/tournaments` and add `/tournaments/manage` routing while retaining `/tournament-2026` as a compatibility redirect.
- [x] **T004 (REQ-005, REQ-010):** Change the sidebar label to **Tournaments** and use the list route as its destination.

### Phase 3 - Tournament List and Form

- [x] **T005 (REQ-003, REQ-004, REQ-010, REQ-012):** Build staff create/edit modal using player, venue, status, format, date, and time controls.
- [x] **T006 (REQ-001, REQ-010, REQ-011):** Build responsive list cards with summary counts, total collection, status, and role-aware actions.

### Phase 4 - Tournament Workspace

- [x] **T007 (REQ-005, REQ-010):** Build details header, summary facts, and Overview/Teams/Fixtures/Collections tabs.
- [x] **T008 (REQ-006, REQ-007, REQ-012):** Build team create/edit with tournament-roster selection and duplicate-assignment prevention.
- [x] **T009 (REQ-008, REQ-012):** Build fixture create/edit with team, date/time, venue, status, and validation.
- [x] **T010 (REQ-009, REQ-012):** Build collection create/edit with tournament-player selection, positive amount validation, and live total.
- [x] **T010A (REQ-002):** Add administrator-only tournament, team, fixture, and collection deletion with tournament child cleanup.

### Phase 5 - Presentation and Documentation

- [x] **T011 (REQ-013):** Add tournament list, workspace, summary, roster selector, team, fixture, and collection responsive styles.
- [x] **T012:** Update `README.md` with routes, schema, permissions, and workflow.

### Phase 6 - Validation and Deployment

- [x] **T013:** Run JavaScript syntax checks and workspace diagnostics.
- [x] **T014:** Compile and deploy Firestore rules to the configured project.
- [ ] **T015:** Browser-test list, forms, workspace tabs, and mobile/desktop layout; authenticated writes require suitable staff credentials. Module fixtures passed at 390px and 1440px for staff and player roles; production writes remain credential-dependent.

## 3. Validation Matrix

| Workflow | Expected Result |
|---|---|
| Player opens Tournaments | Can view list/details; no mutation controls. |
| Staff creates tournament | Required values persist and the tournament appears immediately. |
| Staff creates team | Only unassigned tournament players can be selected. |
| Staff creates fixture | Only tournament teams are selectable; teams must differ. |
| Staff adds collection | Tournament player and positive amount are required; total refreshes. |
| Direct player write | Firestore rejects tournament and child writes. |
| Mobile viewport | No page overflow; controls and tabs remain usable. |

## 4. Risks

| Risk | Mitigation |
|---|---|
| Aggregate list requires child summary queries | Load child collections concurrently per tournament at current club-scale volume. |
| Player removed after assignment | Block roster removal when referenced by teams or collections. |
| Team renamed after fixture creation | Update fixtures only when edited; retain team-name snapshots for history. |
| UI role check bypass | Enforce every write with recursive Firestore rules. |
| Large future tournament volume | Current implementation targets club-scale data; pagination can be added later without changing the schema. |