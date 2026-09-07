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
  await sendEmailVerification(credential.user, {
    url: `${window.location.origin}${window.location.pathname}#/login`
  });
  try {
    await setDoc(doc(db, "users", credential.user.uid), {
      name,
      email,
      role: "member",
      createdAt: serverTimestamp()
    });
  } catch (error) {
    // Non-fatal: ensureUserProfile() self-heals this on next sign-in.
    console.error("Unable to save user profile, will retry on next sign-in", error);
  }
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

// Creates the Firestore profile doc if it's missing (e.g. it failed to save
// during registration because Firestore wasn't set up yet). Always role:"member";
// role escalation requires an existing admin per firestore.rules.
export async function ensureUserProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return snapshot.data();
  }
  const profile = {
    name: user.displayName || user.email,
    email: user.email,
    role: "member",
    createdAt: serverTimestamp()
  };
  await setDoc(ref, profile);
  return profile;
}
