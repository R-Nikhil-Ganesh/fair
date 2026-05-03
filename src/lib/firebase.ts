import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// These values are intentionally public — they are shipped to every user's browser
// and are required by Firebase's client SDK. Keeping them as fallbacks here means
// Cloud Run builds work without needing build-time env var configuration.
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? "AIzaSyDRpPMbKXgnTSIPz3E7k22-y7UuX2iSJc0",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? "solutions-cd778.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? "solutions-cd778",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? "solutions-cd778.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "508327638254",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? "1:508327638254:web:03b9c21a3c2e96cfc82fff",
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
