# SDFC Club Portal

A Firebase-backed member portal for SDFC Football Club: authenticated dashboard,
club/tournament rules, player roster, and finance tracking.

## Files

- `index.html` — document shell (single entry point, everything else is client-rendered).
- `css/styles.css` — auth screens, sidebar app shell, dashboard cards, tables, forms.
- `js/firebase-config.js` — public Firebase web config.
- `js/firebase.js` — shared Firebase app/auth/Firestore instances.
- `js/auth.js` — register/login/logout/email-verification logic.
- `js/data.js` — Firestore CRUD for players and finance transactions.
- `js/router.js` — minimal hash-based router.
- `js/layout.js` — sidebar app shell.
- `js/app.js` — wires auth state + router + pages together.
- `js/pages/` — `authPages.js` (login/register/verify), `dashboard.js`, `rules.js`, `players.js`, `finance.js`.
- `firestore.rules` — role-based security rules.

## 1. Firebase setup

1. In [Firebase Console](https://console.firebase.google.com/), open the project referenced in `js/firebase-config.js`.
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → create it if not already created.
4. Paste `firestore.rules` into **Firestore Database → Rules** and publish.

## 2. Data model

- `users/{uid}`: `{ name, email, role: "player" | "moderator" | "admin", createdAt }`
  - Created automatically at registration with `role: "player"`.
  - Only an existing admin can promote a user to `"moderator"`/`"admin"` (rules block self-promotion).
  - Moderators have the same content permissions as admins (players, finance, match days,
    venues) but cannot manage other users' roles — that stays admin-only.
  - **Bootstrapping the first admin:** register an account normally, then in the
    Firebase Console → Firestore, open `users/{that-uid}` and manually change
    `role` to `"admin"`.
- `players/{id}`: `{ name, email, position, jerseyNumber, phone, status: "active" | "inactive", teamsId, photoUrl, createdAt }`
  - Created automatically at registration (from the signup form) or self-healed on next
    sign-in if missing. `status`/`teamsId` are admin/moderator-only fields; everything else
    is player-owned and editable from My Player Profile.
- `financeTransactions/{id}`: `{ type: "collection" | "expense", amount, description, date, createdAt }`

Only verified, signed-in users can read `players`/`financeTransactions`. Only
admins/moderators can write to them (players can also create/edit their own
player record, excluding `status`/`teamsId`). Every signed-in user can
read/create their own `users/{uid}` profile.

## 3. Registration & login flow

1. A new user registers with name/email/password plus playing position/mobile/jersey number.
2. A confirmation email is sent automatically (Firebase Auth), and a linked `players/{id}`
   record is created from the signup data.
3. The account is inactive (blocked from the dashboard) until the user clicks
   the confirmation link and returns to the "I've confirmed, continue" step.
4. Once verified, the user lands on the Dashboard with `role: "player"` by
   default (view-only for Players/Finance) until an admin promotes them to
   `"moderator"` or `"admin"`.

## 4. Run locally

Because ES modules and Firebase requests need an HTTP origin, use any static server:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## 5. Deploy to GitHub Pages

Push this repository to `<username>.github.io` (root) or any repo with GitHub
Pages enabled, serving from the `main` branch root. All asset paths are relative.
