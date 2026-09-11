# Tournament and Access Specification

**Status:** Ready for implementation  
**Prepared:** 2026-09-10  
**Modules:** Authentication, Players, Tournament 2026

## 1. Purpose

Simplify portal access to sign-in only, make player-profile creation a staff responsibility, and add an informative About Tournament section to the Tournament 2026 page.

## 2. Scope

### In Scope

- Remove public account registration links, routes, forms, and client registration logic.
- Keep sign-in, password recovery, sign-out, and email-verification handling.
- Allow only administrators and moderators to create player profiles.
- Stop automatic player-profile creation during authentication and profile viewing.
- Let existing players continue updating their own non-staff profile fields.
- Show a clear contact-staff state when a signed-in user has no linked player profile.
- Add an About Tournament overview using the configured 2026 tournament data.

### Out of Scope

- A staff-facing Firebase Authentication account-provisioning screen.
- Invitations, approval queues, or account requests.
- Tournament results, standings, score entry, or automatic bracket generation. Tournament
	creation, teams, fixtures, and collections are specified separately in
	[tournament-management-spec.md](tournament-management-spec.md).
- Changes to finance, match-day, venue, or role-management behavior.

## 3. Actors and Permissions

| Actor | Capabilities |
|---|---|
| Signed-out visitor | Sign in or request a password reset. |
| Verified player | View the portal and tournament information; view/edit an existing linked player profile. |
| Moderator | All player capabilities plus create and edit player profiles. |
| Administrator | All moderator capabilities plus delete player profiles and existing administrator-only role management. |

## 4. User Scenarios and Acceptance Criteria

### US1 - Sign In Without Public Registration

1. **Given** a visitor opens the portal, **when** the login page renders, **then** only sign-in and password-recovery actions are offered.
2. **Given** a visitor navigates directly to `#/register`, **when** routing resolves, **then** the login page is shown and no registration form is available.
3. **Given** an existing account signs in, **when** authentication succeeds, **then** the existing verification and protected-route behavior continues.

### US2 - Staff-Only Player Creation

1. **Given** an administrator or moderator opens Players, **when** the page renders, **then** Add Player is available and can create a profile.
2. **Given** a player opens Players, **when** the page renders, **then** player-creation controls are absent.
3. **Given** a non-staff user attempts to create a `players` document directly, **when** Firestore evaluates the request, **then** it is rejected.
4. **Given** a signed-in user has no linked player profile, **when** authentication or My Player Profile loads, **then** no profile is created automatically and the user is told to contact an administrator or moderator.
5. **Given** an existing player edits their own profile, **when** permitted fields are saved, **then** the update remains allowed while `status` and `teamsId` remain staff-only.

### US3 - Learn About Tournament 2026

1. **Given** a verified user opens Tournament 2026, **when** the page renders, **then** an About Tournament section appears before the team roster.
2. **Given** the configured tournament data is loaded, **when** the overview renders, **then** it reports the configured date, team count, player count, and players per team without duplicating those values in page code.
3. **Given** the user needs competition rules, **when** they use the overview action, **then** they can navigate to the existing Rules page.

## 5. Functional Requirements

- **REQ-001:** The signed-out experience MUST expose Sign In and Forgot Password, and MUST NOT expose public registration.
- **REQ-002:** `#/register` MUST no longer be a registered application route and MUST resolve to Sign In while signed out.
- **REQ-003:** Public account-creation code MUST be removed from the client authentication module.
- **REQ-004:** Only users whose role is `admin` or `moderator` MUST be able to create player documents in both the UI and Firestore rules.
- **REQ-005:** The application MUST NOT automatically create a player document at sign-in, onboarding, or My Player Profile.
- **REQ-006:** Missing player profiles MUST NOT force the profile-completion flow; My Player Profile MUST show a staff-contact empty state.
- **REQ-007:** Existing linked players MAY update their player-owned fields, while `status` and `teamsId` MUST remain staff-owned.
- **REQ-008:** The Tournament 2026 page MUST show an About Tournament section before team cards.
- **REQ-009:** Tournament summary values MUST be derived from `TOURNAMENT_DATE`, `TOURNAMENT_TEAMS`, and `DEFAULT_PLAYERS`.
- **REQ-010:** The About Tournament section MUST link to the existing tournament rules destination.
- **REQ-011:** The changed pages MUST remain responsive and consistent with the existing portal design.

## 6. Business Rules and Assumptions

- Accounts are provisioned outside this portal, currently through Firebase Authentication and the existing user-profile administration process.
- Removing registration does not remove password recovery or verification support for existing accounts.
- Staff player creation creates a roster profile, not a Firebase Authentication account.
- A player profile is linked to a signed-in account by matching email addresses, as in the current implementation.
- Existing players keep self-service editing because the request restricts who can add a profile, not who can maintain permitted personal fields.
- Tournament totals are descriptive and derived from the current configured roster; tournament management remains out of scope.

## 7. Success Criteria

- No visible or routable public registration workflow remains.
- No non-staff or automatic code path can create a player document.
- Staff can still create player profiles through the existing New Player page.
- Users without a player record can access the portal without an onboarding redirect loop.
- Tournament 2026 clearly explains the configured competition and retains all existing team cards.