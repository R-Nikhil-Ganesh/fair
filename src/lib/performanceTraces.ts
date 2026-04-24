// src/lib/performanceTraces.ts
import { getPerformance, trace as firebaseTrace } from "firebase/performance";
import { app } from "./firebase";

type TraceEntry = {
  start: () => void;
  stop: () => void;
  putAttribute: (attr: string, value: string) => void;
};

export function getPerformanceTrace(traceName: string): TraceEntry {
  try {
    const perf = getPerformance(app);
    const t = firebaseTrace(perf, traceName);
    return {
      start: () => t.start(),
      stop: () => t.stop(),
      putAttribute: (attr, value) => t.putAttribute(attr, value),
    };
  } catch {
    // Return no-op if perf monitoring not available
    return {
      start: () => {},
      stop: () => {},
      putAttribute: () => {},
    };
  }
}

// Pre-defined trace names — use these constants throughout the app
export const TRACES = {
  CSV_UPLOAD: "csv_upload_and_audit_start",
  FETCH_RESULTS: "fetch_audit_results",
  PDF_EXPORT: "pdf_export_generation",
  DASHBOARD_LOAD: "dashboard_initial_load",
  ONBOARDING_COMPLETE: "onboarding_completion",
} as const;
