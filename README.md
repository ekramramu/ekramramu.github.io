# SDFC Club Portal

A Firebase-backed member portal for SDFC Football Club: authenticated dashboard,
club/tournament rules, player roster, and finance tracking.

## Files

- `index.html` — document shell (single entry point, everything else is client-rendered).
- `css/styles.css` — auth screens, sidebar app shell, dashboard cards, tables, forms.
- `js/firebase-config.js` — public Firebase web config.
- `js/firebase.js` — shared Firebase app/auth/Firestore instances.
- `js/auth.js` — sign-in, sign-out, password-reset, and email-verification logic.
- `js/data.js` — Firestore CRUD for players, match days/venues, and finance records
  (Collections, Bill Payments, and the legacy transaction ledger).
- `js/router.js` — minimal hash-based router.
- `js/layout.js` — sidebar app shell.
- `js/app.js` — wires auth state + router + pages together.
- `js/pages/` — `authPages.js` (login/password reset/verify), `dashboard.js`, `rules.js`, `players.js`,
  `finance.js` (Collections and Bill Payment ledgers, at `#/finance/collections` and
  `#/finance/bill-payments`; `#/finance` redirects to Collections), and `tournament.js`
  (tournament list and per-tournament management workspace).
- `firestore.rules` — role-based security rules.

## 1. Firebase setup

1. In [Firebase Console](https://console.firebase.google.com/), open the project referenced in `js/firebase-config.js`.
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → create it if not already created.
4. Paste `firestore.rules` into **Firestore Database → Rules** and publish.

## 2. Data model

- `users/{uid}`: `{ name, email, role: "player" | "moderator" | "admin", createdAt }`
  - Created with `role: "player"` on first sign-in if an externally provisioned account has no user document.
  - Only an existing admin can promote a user to `"moderator"`/`"admin"` (rules block self-promotion).
  - Moderators have the same content permissions as admins (players, finance, match days,
    venues) but cannot manage other users' roles — that stays admin-only.
  - **Bootstrapping the first admin:** create an Email/Password account in Firebase
    Authentication, sign in once, then in Firestore open `users/{that-uid}` and
    manually change `role` to `"admin"`.
- `players/{id}`: `{ name, email, position, jerseyNumber, phone, status: "active" | "inactive", teamsId, photoUrl, joinedAt, heightCm, weightKg, fitnessStatus, createdAt }`
  - Created only by an administrator or moderator from **Players → Add Player**.
    Staff can manage all player information from Player List. `joinedAt`, `heightCm`,
    `weightKg`, and `fitnessStatus` are optional profile fields. The Player List is a
    card directory: selecting a player shows stored profile details plus derived tournament
    attendance, completed-fixture results, goals, assists, wins/losses/draws, and rating rank.
    `status`/`teamsId` are
    staff-only fields; an existing linked player can edit the remaining personal fields
    from My Player Profile.
- `tournaments/{id}`: `{ name, date, startTime, venueId, venueName, venueAddress, status,
  playerIds, format, notes, createdAt, updatedAt }` — tournament identity, schedule,
  selected roster, lifecycle status, and venue snapshot.
  - `teams/{id}`: `{ name, playerIds, createdAt, updatedAt }` — teams scoped to the
    tournament. A tournament player can be assigned to only one team through the UI.
  - `fixtures/{id}`: `{ homeTeamId, homeTeamName, awayTeamId, awayTeamName, date,
    startTime, venueId, venueName, status, notes, homeScore, awayScore, manOfTheMatchId,
    resultNotes, goals: [{ scorerId, assistId }], cards: [{ playerId, type: "yellow" | "red" }],
    createdAt, updatedAt }`.
  - `collections/{id}`: `{ playerId, payerName, date, amount, paymentMethod, notes,
    createdAt, updatedAt }` — tournament-specific payments and the source of its total.
  - `billPayments/{id}`: `{ payeeName, date, amount, paymentMethod, notes, createdAt,
    updatedAt }` — tournament-specific expenses, used with collections to calculate balance.
- `financeCollections/{id}`: `{ transactionId, voucher, playerId, payerName, collectionDate,
  paymentMonth, amount, receivedInto, comments, createdAt, updatedAt }` — one row per player
  payment collection, shown on the **Collections (+)** page. `transactionId` (`COL...`) and
  `voucher` (`RV<year>...`) are generated client-side and never change after creation.
- `financeBillPayments/{id}`: `{ billId, voucher, costType, paymentDate, amount, paidFrom,
  comments, createdAt, updatedAt }` — one row per club expense, shown on the **Bill Payment (-)**
  page. `billId` (`BIL...`) and `voucher` (`PV<year>...`) are generated client-side and never
  change after creation.
- `financeTransactions/{id}`: `{ type: "collection" | "expense", amount, description, date, createdAt }`
  — legacy ledger predating the two typed collections above. Kept read-only: `js/data.js`
  normalizes each row into a labeled, non-editable Collections or Bill Payment entry so
  historical records stay visible instead of being discarded. There is no scripted migration;
  if you want legacy rows to become fully editable, manually re-enter them as
  `financeCollections`/`financeBillPayments` documents and then remove the old
  `financeTransactions` docs once totals reconcile.

Only verified, signed-in users can read `players`/`financeTransactions`/`financeCollections`/
`financeBillPayments` and tournament data. Administrators and moderators can create/update
managed records. Only administrators can delete player profiles, match days, venues, typed
finance records, tournaments, teams, fixtures, and tournament collections. Existing players
can edit their own player record except `status`/`teamsId`. Legacy finance compatibility rows
and Firebase Authentication accounts are not deleted by these client screens.

## 3. Account provisioning and sign-in flow

1. An administrator provisions the user's Email/Password account in Firebase Authentication.
2. An administrator or moderator adds the matching player profile from **Players → Add Player**,
  using the same email address as the authentication account.
3. The user signs in through the portal. There is no public registration page; password reset
  remains available from Sign In.
4. On first sign-in, a missing `users/{uid}` role document is created with `role: "player"`.
5. If a linked player profile exists but is incomplete, the user completes their personal
  details and mandatory password change before entering the dashboard. If no linked player
  exists, the user can enter the portal and My Player Profile directs them to contact staff.

## 4. Tournament workflow

1. An administrator or moderator opens **Tournaments → Create Tournament**.
2. Staff selects the tournament date/time, an existing venue, lifecycle status, format,
  participating players from Player List, and any other information.
3. The tournament appears in the list at `#/tournaments`; **Manage** opens its isolated
  workspace at `#/tournaments/manage/<id>`.
4. **Teams** assigns tournament players and staff can drag players between teams,
  **Fixtures** schedules two teams at an existing venue, **Score** records fixture results,
  player of the match, scorers, and assists, and **Tournament Finance** records player
  collections and bill payments with running totals.
5. Verified players see the same list and details without create/edit/delete controls.

Tournament statuses are Upcoming, Registration/Open, Team Formation, Fixture Created,
Ongoing, Completed, and Cancelled. The old `#/tournament-2026` route redirects to the list.

## 5. Run locally

Because ES modules and Firebase requests need an HTTP origin, use any static server:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## 6. Deploy to GitHub Pages

Push this repository to `<username>.github.io` (root) or any repo with GitHub
Pages enabled, serving from the `main` branch root. All asset paths are relative.
