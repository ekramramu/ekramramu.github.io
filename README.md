# SDFC Football Club Site

A single-page, data-driven football club site built with semantic HTML, CSS, vanilla JavaScript ES modules, and the Firebase Web SDK. The club identity, news updates, and social links are controlled by Firestore at runtime; the official tournament rules are built into the page.

## Files

- `index.html` contains the accessible document shell.
- `css/styles.css` contains the responsive layout, type, light/dark themes, and motion.
- `js/firebase-config.js` exports the public Firebase web configuration.
- `js/app.js` initializes Firebase, fetches settings and published items in parallel, and renders the page.
- `firestore.rules` allows public reads only for the two public collections and denies writes.
- `sample-data.json` contains example documents and fields.
- `seed.js` is an optional Node.js seed script.

## 1. Create Firebase resources

1. Create or open a project at [Firebase Console](https://console.firebase.google.com/).
2. Create a Firestore Database in production mode. A database location cannot be changed later.
3. Open **Storage**, enable it, and complete the setup. Upload images there or use another image host, then store the resulting public URL in `heroImage` or `imageUrl`.
4. Register a Web app under **Project settings > Your apps**.
5. Copy the web config into `js/firebase-config.js`. The config contains identifiers and a public API key; it is expected to be visible in a browser. Security rules, not secrecy of this config, protect your data.

## 2. Create the Firestore data

The app reads:

- `site/settings`: `{ title, tagline, sectionTitle, heroImage, footerText, socialLinks: { facebook, youtube, instagram, whatsapp, email } }`
- `items/{itemId}`: `{ title, description, linkLabel, imageUrl, link, order, published }` (club news/match updates)

Only documents with `published == true` are shown. Items are ordered by `order` ascending. Use the example values in `sample-data.json` as a guide.

### Manual seeding

1. In Firestore **Data**, create a collection named `site` and a document named `settings`.
2. Add the fields from `sample-data.json` to that document. Add `socialLinks` as a map.
3. Create a collection named `items`. Add one document per item, using each sample item's `id` as its document ID.
4. Add `published` as a boolean and `order` as a number. The query requires both fields.

### Optional Node.js seed script

The browser site is read-only. The optional script uses the Firebase client SDK and is intended for a trusted local setup only. Do not expose write-capable credentials in GitHub Pages.

```sh
npm install
node seed.js
```

Because `seed.js` uses the same public web config, it will only work if your temporary development rules allow the write. Restore `firestore.rules` immediately afterward. For production seeding, prefer the Firebase Admin SDK with a service account kept outside this repository.

## 3. Apply security rules

Paste `firestore.rules` into **Firestore Database > Rules** and publish it. These rules allow anyone to read `site/*` and `items/*`, while denying every write and denying access to other collections.

If you use Firebase Storage for images, configure Storage rules separately. The browser only needs to receive an image URL; it does not upload files.

## 4. Run locally

Because ES modules and Firebase requests need an HTTP origin, use any static server rather than opening `index.html` directly:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The page will show the Firebase error state until `js/firebase-config.js` and Firestore data are configured.

## 5. Deploy to GitHub Pages

1. Create a repository named `username.github.io`, replacing `username` with your GitHub username.
2. Copy this project into the repository root.
3. Commit and push to the `main` branch:

```sh
git init
git add .
git commit -m "Create Firebase portfolio site"
git branch -M main
git remote add origin https://github.com/username/username.github.io.git
git push -u origin main
```

4. In the repository, open **Settings > Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
6. Wait for the Pages deployment, then open `https://username.github.io`.

All asset paths are relative, so the site is compatible with GitHub Pages hosting from the repository root. Do not add authentication, localStorage, server-side code, or private credentials to this version.
