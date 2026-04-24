// src/lib/appCheck.ts
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { app } from "./firebase";

let appCheckInitialized = false;

export function initAppCheck(): void {
  if (appCheckInitialized || typeof window === "undefined") return;

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    console.warn("FairLens: NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set — App Check disabled");
    return;
  }

  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckInitialized = true;
  } catch (e) {
    console.error("App Check initialization failed:", e);
  }
}
