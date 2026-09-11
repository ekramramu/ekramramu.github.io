# Tournament Management Specification

**Status:** Ready for implementation  
**Prepared:** 2026-09-10  
**Module:** Tournament Management

## 1. Purpose

Provide a complete tournament workspace where administrators and moderators create tournaments from predefined club data, select participating players, form teams, schedule fixtures, and track tournament-specific collections. Verified players can review every tournament and its current status.

## 2. Scope

### In Scope

- Staff-only tournament creation and editing.
- Tournament list with status, schedule, venue, player count, and collection total.
- Tournament details workspace with Overview, Teams, Fixtures, and Collections sections.
- Player selection from the existing Player List.
- Date and time controls using native calendar/time inputs.
- Venue selection from the existing Venue List.
- Status selection from a predefined value list.
- Team creation and player assignment from the tournament roster.
- Fixture creation and editing using tournament teams and venue data.
- Tournament collection creation and editing with a running total.
- Administrator-only deletion of tournaments, teams, fixtures, and tournament collections.
- Verified-member read access and staff-only writes enforced in Firestore.

### Out of Scope

- Public tournament registration.
- Knockout/bracket generation, automatic scheduling, standings, results, or score entry.
- Payment gateways, refunds, receipts, approvals, or accounting-ledger synchronization.
- Deleting legacy finance compatibility records or Firebase Authentication accounts.

## 3. Roles

| Actor | Capabilities |
|---|---|
| Verified player | View tournament list, details, teams, fixtures, collections, and status. |
| Moderator | All player capabilities plus create/edit tournaments, teams, fixtures, and collections. |
| Administrator | All moderator capabilities plus delete tournaments and their managed records. |

## 4. Status Value List

- Upcoming
- Registration/Open
- Team Formation
- Fixture Created
- Ongoing
- Completed
- Cancelled

Status is manually selected by staff and visible on list and detail views.

## 5. User Stories and Acceptance Criteria

### US1 - Tournament List

1. All verified users can see created tournaments ordered by date.
2. Every card shows name, date/time, venue, status, selected-player count, team count, fixture count, and collection total.
3. Staff see **Create Tournament** and **Edit** controls; players do not.
4. Selecting **Manage/View Tournament** opens that tournament's separate workspace.
5. Empty and load-error states remain clear and actionable.

### US2 - Create and Edit Tournament

1. Staff can enter Tournament Name, Date, Time, Venue, Status, Players, Format, and Notes.
2. Name, date, time, venue, status, and at least one player are required.
3. Venue options come from active Venue List records; player options come from active Player List records.
4. Editing preserves the tournament identity and existing child records.
5. Non-staff direct writes are rejected by Firestore.
6. Only an administrator can delete a tournament; deletion also removes its teams, fixtures, and tournament collections.

### US3 - Team Management

1. Staff can create and edit teams within a tournament.
2. Team Name is required and players can only be selected from the tournament roster.
3. A player cannot be assigned to more than one team in the same tournament.
4. Every user can view team names and assigned players.
5. Only an administrator can delete a team.

### US4 - Fixture Management

1. Staff can create and edit fixtures within a tournament.
2. Home Team, Away Team, Date, Start Time, and Venue are required.
3. Home and Away Team must be different and must belong to the tournament.
4. Fixtures display chronologically with their status.
5. Only an administrator can delete a fixture.

### US5 - Tournament Collections

1. Staff can create and edit a collection containing payer, date, amount, payment method, and note.
2. Payer, date, and an amount greater than zero are required.
3. Payers are selected from the tournament roster.
4. Every user can view collection rows and the current total.
5. Only an administrator can delete a tournament collection.

## 6. Functional Requirements

- **REQ-001:** Tournament list and details MUST be readable by verified users.
- **REQ-002:** Tournament and child-record creation/updates MUST be restricted to administrators and moderators; deletion MUST be restricted to administrators.
- **REQ-003:** Tournament creation MUST use Player List, Venue List, calendar/time controls, and predefined status/format values.
- **REQ-004:** Each tournament MUST store name, date, start time, venue snapshot, status, selected player IDs, format, and notes.
- **REQ-005:** Each tournament MUST have a separate details workspace addressable by its Firestore document ID.
- **REQ-006:** Teams MUST be nested under one tournament and assign only participating players.
- **REQ-007:** A tournament player MUST NOT be assigned to multiple teams.
- **REQ-008:** Fixtures MUST reference two distinct teams in the same tournament and retain a venue snapshot.
- **REQ-009:** Collections MUST reference a participating player, store a positive amount, and contribute to the displayed tournament total.
- **REQ-010:** Tournament status MUST be visible on both list and details views.
- **REQ-011:** Staff controls MUST be absent for players, with Firestore rules providing authoritative enforcement.
- **REQ-012:** Forms MUST provide validation and save-error states without losing entered data.
- **REQ-013:** All tournament views and dialogs MUST work without page-level overflow at mobile and desktop widths.

## 7. Data Model

### `tournaments/{tournamentId}`

`{ name, date, startTime, venueId, venueName, venueAddress, status, playerIds, format, notes, createdAt, updatedAt }`

### `tournaments/{tournamentId}/teams/{teamId}`

`{ name, playerIds, createdAt, updatedAt }`

### `tournaments/{tournamentId}/fixtures/{fixtureId}`

`{ homeTeamId, homeTeamName, awayTeamId, awayTeamName, date, startTime, venueId, venueName, status, notes, createdAt, updatedAt }`

### `tournaments/{tournamentId}/collections/{collectionId}`

`{ playerId, payerName, date, amount, paymentMethod, notes, createdAt, updatedAt }`

## 8. Business Rules

- Tournament child records cannot be moved between tournaments.
- Deleting a tournament deletes its teams, fixtures, and tournament collections before deleting the tournament document.
- Removing a player from the tournament roster is blocked while that player is assigned to a team or has a tournament collection.
- Existing team and payer names are stored as display snapshots where useful.
- Collection totals are calculated from loaded tournament collection records.
- Destructive controls require confirmation and are visible only to administrators.

## 9. Success Criteria

- Staff can create a tournament from existing players and venues.
- The new tournament immediately appears in the list with its status.
- Its management workspace supports teams, fixtures, and collections end to end.
- Players can inspect the same data but cannot mutate it.
- Firestore rules compile and are deployed with the application change.