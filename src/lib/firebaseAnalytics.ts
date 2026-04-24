// src/lib/firebaseAnalytics.ts
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { app } from "./firebase";

let analytics: ReturnType<typeof getAnalytics> | null = null;

async function getAnalyticsInstance() {
  if (analytics) return analytics;
  const supported = await isSupported();
  if (supported) {
    analytics = getAnalytics(app);
  }
  return analytics;
}

type AuditEventName =
  | "audit_started"
  | "audit_completed"
  | "audit_failed"
  | "bias_flagged"
  | "report_exported"
  | "sample_dataset_audit_started"
  | "model_audit_started"
  | "counterfactual_viewed"
  | "mitigation_step_clicked"
  | "onboarding_completed";

export async function logAuditEvent(
  eventName: AuditEventName,
  params: Record<string, string | number | boolean> = {}
): Promise<void> {
  try {
    const a = await getAnalyticsInstance();
    if (a) logEvent(a, eventName, params);
  } catch {
    // Analytics is non-critical; fail silently
  }
}
