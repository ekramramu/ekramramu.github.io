import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-lite.js";
import { auth, db } from "./firebase.js";

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
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

export async function requestPasswordReset(email) {
  await sendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}${window.location.pathname}#/login`
  });
}

export async function changePassword({ currentPassword, newPassword }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function updateUserPreferences(uid, patch) {
  await updateDoc(doc(db, "users", uid), patch);
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

// Authentication accounts are provisioned outside the portal. Create a matching
// role document on first sign-in when one does not exist yet.
export async function ensureUserProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return snapshot.data();
  }
  const profile = {
    name: user.displayName || user.email,
    email: user.email,
    role: "player",
    createdAt: serverTimestamp()
  };
  await setDoc(ref, profile);
  return profile;
}
