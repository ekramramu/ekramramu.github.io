# Tournament and Access Implementation Plan

**Source specification:** [tournament-access-spec.md](tournament-access-spec.md)  
**Target application:** SDFC Club Portal  
**Plan status:** Implemented; credential-dependent role flows require final browser verification

Tournament creation and management continue in
[tournament-management-implementation-plan.md](tournament-management-implementation-plan.md).

## 1. Summary

Replace public registration with a sign-in-only entry point, close all automatic and non-staff player-creation paths, and extend Tournament 2026 with an overview derived from existing tournament constants.

## 2. Technical Context

- `js/pages/authPages.js` owns signed-out forms and links.
- `js/auth.js` owns Firebase Authentication operations.
- `js/app.js` owns auth-state handling, onboarding decisions, and route registration.
- `js/pages/players.js` owns staff player creation and My Player Profile behavior.
- `js/pages/completeProfile.js` decides whether an existing player needs mandatory completion.
- `firestore.rules` is the authoritative player-write boundary.
- `js/pages/tournament.js` and `js/clubData.js` own the current tournament presentation and data.
- The repository has no test runner or build script; validation uses syntax checks, targeted source checks, Firestore rule review/deployment validation, and browser testing.

## 3. Design Decisions

1. Treat `#/register` as an unknown signed-out route so the existing signed-out fallback renders Sign In.
2. Remove unused registration code rather than hiding only the Register link.
3. Keep `ensureUserProfile` because an authentication account still needs its `users/{uid}` role document; remove only automatic `players` creation.
4. Run mandatory profile completion only when a linked player document already exists.
5. Preserve self-update of player-owned fields while changing player creation to staff-only.
6. Derive tournament facts from existing constants so roster changes update the overview automatically.

## 4. Implementation Tasks

### Phase 1 - Sign-In-Only Authentication

- [x] **T001 (REQ-001, REQ-002):** Remove the Register link/form/export and `/register` route dispatch from `js/pages/authPages.js` and `js/app.js`.
- [x] **T002 (REQ-003):** Remove Firebase public account-creation imports and `registerAccount` from `js/auth.js`.
- [x] **T003 (REQ-001):** Update `README.md` to document externally provisioned accounts and the sign-in-only flow.

### Phase 2 - Staff-Owned Player Creation

- [x] **T004 (REQ-004, REQ-005):** Remove automatic player creation from `js/app.js` and `js/pages/players.js`.
- [x] **T005 (REQ-006):** Change onboarding eligibility so a missing player profile does not trigger Complete Profile.
- [x] **T006 (REQ-006):** Render a contact-administrator-or-moderator empty state on My Player Profile when no linked record exists.
- [x] **T007 (REQ-004, REQ-007):** Restrict `players` document creation to `isStaff()` in `firestore.rules` while preserving current own-profile update restrictions.
- [x] **T008 (REQ-004):** Retain and verify the existing admin/moderator checks around `/players/new` and Add Player.

### Phase 3 - About Tournament

- [x] **T009 (REQ-008, REQ-009, REQ-010):** Add an About Tournament section to `js/pages/tournament.js`, deriving date, team count, player count, and team size from `js/clubData.js` exports.
- [x] **T010 (REQ-011):** Add responsive overview styles to `css/styles.css` using existing tokens and typography.

### Phase 4 - Validation and Documentation

- [x] **T011:** Run `node --check` for every changed JavaScript module.
- [x] **T012:** Search for remaining register links/routes, `registerAccount`, and automatic `ensurePlayerProfile` calls.
- [x] **T013:** Validate and deploy the Firestore rules change so authorization matches the implemented UI.
- [ ] **T014:** Browser-test login, direct `#/register`, missing/existing profile states, staff player creation, and Tournament 2026 at mobile and desktop widths. Login, direct registration fallback, and Tournament 2026 passed at 390px and 1440px; authenticated role/profile flows require suitable test accounts.

## 5. Validation Matrix

| Case | Expected Result |
|---|---|
| Signed-out login page | Sign In and Forgot Password are present; Register is absent. |
| Direct `#/register` | Sign In renders; no registration form is reachable. |
| Player create request | Firestore rejects it. |
| Admin/moderator New Player | Profile is created and appears in Players. |
| User without linked player | Dashboard remains accessible; My Player Profile shows contact-staff guidance. |
| Existing linked player | Incomplete profile onboarding and permitted self-edit continue. |
| Tournament 2026 | About section and all existing team cards render with derived totals. |

## 6. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| UI removal leaves a direct write bypass | Enforce staff-only creation in Firestore rules. |
| Missing profiles cause an onboarding loop | Require an existing player record before profile completion can be mandatory. |
| Staff expect Add Player to create login credentials | State clearly that it creates only the roster profile; account provisioning remains external. |
| Tournament summary becomes stale | Compute values from the configured tournament arrays instead of hard-coding totals. |

## 7. Requirement Mapping

| Requirement | Implementation Evidence |
|---|---|
| REQ-001 to REQ-003 | `js/pages/authPages.js`, `js/auth.js`, `js/app.js`, `README.md` |
| REQ-004 to REQ-007 | `js/app.js`, `js/pages/players.js`, `js/pages/completeProfile.js`, `firestore.rules` |
| REQ-008 to REQ-011 | `js/pages/tournament.js`, `css/styles.css` |