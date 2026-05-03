import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Firebase web config — these values are intentionally public.
// They are shipped in the browser bundle on every page load and are
// required by the Firebase client SDK. Security is enforced via
// Firestore/Storage Security Rules and Firebase App Check, NOT by
// keeping these values secret.
const firebaseConfig = {
  apiKey:            "AIzaSyDRpPMbKXgnTSIPz3E7k22-y7UuX2iSJc0",
  authDomain:        "solutions-cd778.firebaseapp.com",
  projectId:         "solutions-cd778",
  storageBucket:     "solutions-cd778.firebasestorage.app",
  messagingSenderId: "508327638254",
  appId:             "1:508327638254:web:03b9c21a3c2e96cfc82fff",
};

// Only initialize Firebase in the browser.
// During `next build` the server prerenders pages (e.g. /_not-found) without
// any env vars, which causes auth/invalid-api-key. We guard against that here.
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
const googleProvider = new GoogleAuthProvider();

if (typeof window !== "undefined") {
  app      = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth     = getAuth(app);
  db       = getFirestore(app);
  storage  = getStorage(app);

  // AppCheck (browser-only)
  import("./appCheck").then(({ initAppCheck }) => initAppCheck());
}

// Cast exports — consumers are always client components, so these will be
// initialized by the time they're actually called.
export {
  app, auth, db, storage, googleProvider, signInWithPopup, signOut,
};
