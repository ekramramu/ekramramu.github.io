import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-lite.js";
import { db } from "./firebase.js";
import { DEFAULT_PLAYERS } from "./clubData.js";

function defaultPlayers() {
  return DEFAULT_PLAYERS.map((player, index) => ({
    id: `default-${index + 1}`,
    status: "active",
    ...player
  }));
}

export async function listPlayers() {
  try {
    const snapshot = await getDocs(query(collection(db, "players"), orderBy("name", "asc")));
    return snapshot.empty ? defaultPlayers() : snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch (error) {
    console.warn("Using the built-in club roster until Firestore is available", error);
    return defaultPlayers();
  }
}

export async function addPlayer(player) {
  return addDoc(collection(db, "players"), {
    ...player,
    createdAt: serverTimestamp()
  });
}

export async function updatePlayer(playerId, player) {
  return updateDoc(doc(db, "players", playerId), player);
}

// Self-heals a missing player record for the signed-in user (e.g. accounts
// registered before this link existed), so nobody has to click a button.
export async function ensurePlayerProfile({ email, name, phone, position, jerseyNumber, photoUrl }) {
  const snapshot = await getDocs(query(collection(db, "players"), where("email", "==", email)));
  if (!snapshot.empty) {
    const existing = snapshot.docs[0];
    return { id: existing.id, ...existing.data() };
  }
  const player = {
    name: name || email,
    email,
    phone: phone || "",
    position: position || "",
    jerseyNumber: jerseyNumber ?? null,
    photoUrl: photoUrl || "",
    status: "active"
  };
  const ref = await addPlayer(player);
  return { id: ref.id, ...player };
}

export async function deletePlayer(playerId) {
  return deleteDoc(doc(db, "players", playerId));
}

export async function listTransactions() {
  const snapshot = await getDocs(query(collection(db, "financeTransactions"), orderBy("date", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function addTransaction(transaction) {
  return addDoc(collection(db, "financeTransactions"), {
    ...transaction,
    createdAt: serverTimestamp()
  });
}

export async function deleteTransaction(transactionId) {
  return deleteDoc(doc(db, "financeTransactions", transactionId));
}

// Legacy financeTransactions predate the typed Collections/Bill Payment ledgers.
// They stay readable (never migrated automatically) and render as read-only rows.
export function normalizeLegacyCollections(transactions) {
  return transactions
    .filter((tx) => tx.type !== "expense")
    .map((tx) => ({
      id: tx.id,
      transactionId: `LEGACY-${tx.id.slice(0, 8).toUpperCase()}`,
      voucher: "-",
      playerId: "",
      payerName: tx.description || "Legacy record",
      collectionDate: tx.date || "",
      paymentMonth: tx.date || "",
      amount: Number(tx.amount) || 0,
      receivedInto: "",
      comments: tx.description || "",
      legacy: true
    }));
}

export function normalizeLegacyBillPayments(transactions) {
  return transactions
    .filter((tx) => tx.type === "expense")
    .map((tx) => ({
      id: tx.id,
      billId: `LEGACY-${tx.id.slice(0, 8).toUpperCase()}`,
      voucher: "-",
      costType: tx.description || "Miscellaneous",
      paymentDate: tx.date || "",
      amount: Number(tx.amount) || 0,
      paidFrom: "",
      comments: tx.description || "",
      legacy: true
    }));
}

export async function listFinanceCollections() {
  const snapshot = await getDocs(query(collection(db, "financeCollections"), orderBy("collectionDate", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function addFinanceCollection(payload) {
  return addDoc(collection(db, "financeCollections"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateFinanceCollection(collectionId, payload) {
  return updateDoc(doc(db, "financeCollections", collectionId), {
    ...payload,
    updatedAt: serverTimestamp()
  });
}

export async function listFinanceBillPayments() {
  const snapshot = await getDocs(query(collection(db, "financeBillPayments"), orderBy("paymentDate", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function addFinanceBillPayment(payload) {
  return addDoc(collection(db, "financeBillPayments"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateFinanceBillPayment(billPaymentId, payload) {
  return updateDoc(doc(db, "financeBillPayments", billPaymentId), {
    ...payload,
    updatedAt: serverTimestamp()
  });
}

export async function listMatchDays() {
  const snapshot = await getDocs(query(collection(db, "matchDays"), orderBy("date", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function addMatchDay(matchDay) {
  return addDoc(collection(db, "matchDays"), {
    ...matchDay,
    createdAt: serverTimestamp()
  });
}

export async function updateMatchDay(matchId, matchDay) {
  return updateDoc(doc(db, "matchDays", matchId), matchDay);
}

export async function deleteMatchDay(matchId) {
  return deleteDoc(doc(db, "matchDays", matchId));
}

export async function listMatchResponses(matchId) {
  const snapshot = await getDocs(collection(db, "matchDays", matchId, "rsvps"));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function setMatchResponse(matchId, uid, response) {
  return setDoc(doc(db, "matchDays", matchId, "rsvps", uid), {
    response,
    updatedAt: serverTimestamp()
  });
}

export async function listVenues() {
  const snapshot = await getDocs(query(collection(db, "venues"), orderBy("name", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function addVenue(venue) {
  return addDoc(collection(db, "venues"), {
    ...venue,
    status: venue.status || "active",
    createdAt: serverTimestamp()
  });
}

export async function updateVenue(venueId, venue) {
  return updateDoc(doc(db, "venues", venueId), venue);
}

export async function deleteVenue(venueId) {
  return deleteDoc(doc(db, "venues", venueId));
}

export function summarizeTransactions(transactions) {
  let collections = 0;
  let expenses = 0;
  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === "expense") {
      expenses += amount;
    } else {
      collections += amount;
    }
  }
  return { collections, expenses, balance: collections - expenses };
}
