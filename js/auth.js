import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-lite.js";
import { auth, db } from "./firebase.js";

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function registerAccount({ name, email, password }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  await setDoc(doc(db, "users", credential.user.uid), {
    name,
    email,
    role: "member",
    createdAt: serverTimestamp()
  });
  await sendEmailVerification(credential.user, {
    url: `${window.location.origin}${window.location.pathname}#/login`
  });
  return credential.user;
}

export async function loginAccount({ email, password }) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logoutAccount() {
  await signOut(auth);
}

export async function resendVerificationEmail() {
  if (!auth.currentUser) return;
  await sendEmailVerification(auth.currentUser, {
    url: `${window.location.origin}${window.location.pathname}#/login`
  });
}

export async function refreshCurrentUser() {
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  return auth.currentUser;
}

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? snapshot.data() : null;
}
