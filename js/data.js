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

export async function listPlayers() {
  const snapshot = await getDocs(query(collection(db, "players"), orderBy("name", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
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
