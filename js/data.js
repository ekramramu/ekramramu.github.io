import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
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
