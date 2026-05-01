import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
