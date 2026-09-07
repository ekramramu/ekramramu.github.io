import { readFile } from "node:fs/promises";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "./js/firebase-config.js";

const seedData = JSON.parse(await readFile(new URL("./sample-data.json", import.meta.url)));
const firebaseApp = initializeApp(firebaseConfig);
const database = getFirestore(firebaseApp);

await setDoc(doc(database, "site", "settings"), seedData["site/settings"]);
for (const item of seedData.items) {
  const { id, ...fields } = item;
  await setDoc(doc(database, "items", id), fields);
}

console.log(`Seeded settings and ${seedData.items.length} items.`);
