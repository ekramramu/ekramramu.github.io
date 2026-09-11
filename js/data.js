import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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

export async function listUserProfiles() {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function updateUserRole(userId, role) {
  return updateDoc(doc(db, "users", userId), { role });
}

export async function revokePortalAccessByEmail(email) {
  const profile = (await listUserProfiles()).find((item) => (
    (item.email || "").toLowerCase() === (email || "").toLowerCase()
  ));
  if (!profile) return;
  await updateDoc(doc(db, "users", profile.id), {
    disabled: true,
    deletedAt: serverTimestamp()
  });
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

export async function deleteFinanceCollection(collectionId) {
  return deleteDoc(doc(db, "financeCollections", collectionId));
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

export async function deleteFinanceBillPayment(billPaymentId) {
  return deleteDoc(doc(db, "financeBillPayments", billPaymentId));
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
  const childCollections = ["rsvps", "teams", "fixtures"];
  const snapshots = await Promise.all(childCollections.map((name) => getDocs(collection(db, "matchDays", matchId, name))));
  await Promise.all(snapshots.flatMap((snapshot) => snapshot.docs.map((item) => deleteDoc(item.ref))));
  return deleteDoc(doc(db, "matchDays", matchId));
}

export async function listMatchResponses(matchId) {
  const snapshot = await getDocs(collection(db, "matchDays", matchId, "rsvps"));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function setMatchResponse(matchId, uid, response, playerId = "") {
  return setDoc(doc(db, "matchDays", matchId, "rsvps", uid), {
    response,
    playerId,
    updatedAt: serverTimestamp()
  });
}

export async function listMatchDayTeams(matchId) {
  const snapshot = await getDocs(query(collection(db, "matchDays", matchId, "teams"), orderBy("name", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function addMatchDayTeam(matchId, payload) {
  return addDoc(collection(db, "matchDays", matchId, "teams"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateMatchDayTeam(matchId, teamId, payload) {
  return updateDoc(doc(db, "matchDays", matchId, "teams", teamId), {
    ...payload,
    updatedAt: serverTimestamp()
  });
}

export async function deleteMatchDayTeam(matchId, teamId) {
  return deleteDoc(doc(db, "matchDays", matchId, "teams", teamId));
}

export async function listMatchDayFixtures(matchId) {
  const snapshot = await getDocs(query(collection(db, "matchDays", matchId, "fixtures"), orderBy("startTime", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function addMatchDayFixture(matchId, payload) {
  return addDoc(collection(db, "matchDays", matchId, "fixtures"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateMatchDayFixture(matchId, fixtureId, payload) {
  return updateDoc(doc(db, "matchDays", matchId, "fixtures", fixtureId), {
    ...payload,
    updatedAt: serverTimestamp()
  });
}

export async function deleteMatchDayFixture(matchId, fixtureId) {
  return deleteDoc(doc(db, "matchDays", matchId, "fixtures", fixtureId));
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

export async function listTournaments() {
  const snapshot = await getDocs(query(collection(db, "tournaments"), orderBy("date", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getTournament(tournamentId) {
  const snapshot = await getDoc(doc(db, "tournaments", tournamentId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function addTournament(payload) {
  return addDoc(collection(db, "tournaments"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateTournament(tournamentId, payload) {
  return updateDoc(doc(db, "tournaments", tournamentId), {
    ...payload,
    updatedAt: serverTimestamp()
  });
}

export async function deleteTournament(tournamentId) {
  const childCollections = ["teams", "fixtures", "collections", "billPayments"];
  const snapshots = await Promise.all(childCollections.map((name) => getDocs(collection(db, "tournaments", tournamentId, name))));
  await Promise.all(snapshots.flatMap((snapshot) => snapshot.docs.map((item) => deleteDoc(item.ref))));
  return deleteDoc(doc(db, "tournaments", tournamentId));
}

export async function listTournamentTeams(tournamentId) {
  const snapshot = await getDocs(query(collection(db, "tournaments", tournamentId, "teams"), orderBy("name", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function addTournamentTeam(tournamentId, payload) {
  return addDoc(collection(db, "tournaments", tournamentId, "teams"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateTournamentTeam(tournamentId, teamId, payload) {
  return updateDoc(doc(db, "tournaments", tournamentId, "teams", teamId), {
    ...payload,
    updatedAt: serverTimestamp()
  });
}

export async function deleteTournamentTeam(tournamentId, teamId) {
  return deleteDoc(doc(db, "tournaments", tournamentId, "teams", teamId));
}

export async function listTournamentFixtures(tournamentId) {
  const snapshot = await getDocs(query(collection(db, "tournaments", tournamentId, "fixtures"), orderBy("date", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function addTournamentFixture(tournamentId, payload) {
  return addDoc(collection(db, "tournaments", tournamentId, "fixtures"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateTournamentFixture(tournamentId, fixtureId, payload) {
  return updateDoc(doc(db, "tournaments", tournamentId, "fixtures", fixtureId), {
    ...payload,
    updatedAt: serverTimestamp()
  });
}

export async function deleteTournamentFixture(tournamentId, fixtureId) {
  return deleteDoc(doc(db, "tournaments", tournamentId, "fixtures", fixtureId));
}

export async function listTournamentCollections(tournamentId) {
  const snapshot = await getDocs(query(collection(db, "tournaments", tournamentId, "collections"), orderBy("date", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function addTournamentCollection(tournamentId, payload) {
  return addDoc(collection(db, "tournaments", tournamentId, "collections"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateTournamentCollection(tournamentId, collectionId, payload) {
  return updateDoc(doc(db, "tournaments", tournamentId, "collections", collectionId), {
    ...payload,
    updatedAt: serverTimestamp()
  });
}

export async function deleteTournamentCollection(tournamentId, collectionId) {
  return deleteDoc(doc(db, "tournaments", tournamentId, "collections", collectionId));
}

export async function listTournamentBillPayments(tournamentId) {
  const snapshot = await getDocs(query(collection(db, "tournaments", tournamentId, "billPayments"), orderBy("date", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function addTournamentBillPayment(tournamentId, payload) {
  return addDoc(collection(db, "tournaments", tournamentId, "billPayments"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateTournamentBillPayment(tournamentId, paymentId, payload) {
  return updateDoc(doc(db, "tournaments", tournamentId, "billPayments", paymentId), {
    ...payload,
    updatedAt: serverTimestamp()
  });
}

export async function deleteTournamentBillPayment(tournamentId, paymentId) {
  return deleteDoc(doc(db, "tournaments", tournamentId, "billPayments", paymentId));
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
