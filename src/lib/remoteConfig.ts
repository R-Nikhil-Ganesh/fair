// src/lib/remoteConfig.ts
import { getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";
import { app } from "./firebase";

const DEFAULT_REMOTE_CONFIG: Record<string, string> = {
  feature_model_audit: "false",
  feature_counterfactuals: "false",
  feature_employment_vertical: "true",
  feature_insurance_vertical: "true",
  gemini_prompt_version: "v1",
  max_csv_rows: "500000",
  max_csv_size_mb: "50",
};

const rc = typeof window !== "undefined" ? getRemoteConfig(app) : null;

if (rc) {
  rc.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
  rc.defaultConfig = DEFAULT_REMOTE_CONFIG;
}

export async function activateRemoteConfig(): Promise<void> {
  if (!rc) return;
  try {
    await fetchAndActivate(rc);
  } catch {
    // Use defaults on failure
  }
}

export function getFeatureFlag(flagName: string): boolean {
  if (!rc) return false;
  return getValue(rc, flagName).asBoolean();
}

export function getConfigString(key: string): string {
  if (!rc) return DEFAULT_REMOTE_CONFIG[key] ?? "";
  return getValue(rc, key).asString();
}

export function getConfigNumber(key: string): number {
  if (!rc) return 0;
  return getValue(rc, key).asNumber();
}
