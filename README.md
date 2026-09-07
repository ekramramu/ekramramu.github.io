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

- `users/{uid}`: `{ name, email, role: "member" | "admin", createdAt }`
  - Created automatically at registration with `role: "member"`.
  - Only an existing admin can promote a user to `"admin"` (rules block self-promotion).
  - **Bootstrapping the first admin:** register an account normally, then in the
    Firebase Console → Firestore, open `users/{that-uid}` and manually change
    `role` to `"admin"`.
- `players/{id}`: `{ name, position, jerseyNumber, phone, status: "active" | "inactive", createdAt }`
- `financeTransactions/{id}`: `{ type: "collection" | "expense", amount, description, date, createdAt }`

Only verified, signed-in users can read `players`/`financeTransactions`. Only
admins can write to them. Every signed-in user can read/create their own
`users/{uid}` profile.

## 3. Registration & login flow

1. A new user registers with name/email/password.
2. A confirmation email is sent automatically (Firebase Auth).
3. The account is inactive (blocked from the dashboard) until the user clicks
   the confirmation link and returns to the "I've confirmed, continue" step.
4. Once verified, the user lands on the Dashboard with `role: "member"` by
   default (view-only for Players/Finance) until an admin promotes them.

## 4. Run locally

Because ES modules and Firebase requests need an HTTP origin, use any static server:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## 5. Deploy to GitHub Pages

Push this repository to `<username>.github.io` (root) or any repo with GitHub
Pages enabled, serving from the `main` branch root. All asset paths are relative.
