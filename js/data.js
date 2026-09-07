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
  updateDoc
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
