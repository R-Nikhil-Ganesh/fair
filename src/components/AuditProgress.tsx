"use client";

import { useEffect, useState } from "react";
import { subscribeToAudit } from "@/lib/ai";
import { useAnnounce } from "./AccessibilityWrapper";
import type { AuditDocument } from "@/lib/types";

const STEP_LABELS: Record<string, string> = {
  uploading: "Uploading data",
  loading_csv: "Loading dataset",
  detecting_pii: "Scanning for sensitive data",
  computing_metrics: "Computing fairness metrics",
  running_gemini_narrative: "Generating bias explanation",
  running_gemini_mitigation: "Building mitigation plan",
  generating_counterfactuals: "Running counterfactual analysis",
  complete: "Audit complete",
};

interface AuditProgressProps {
  uid: string;
  auditId: string;
  onComplete: (audit: AuditDocument) => void;
  onError: (error: string) => void;
}

export function AuditProgress({ uid, auditId, onComplete, onError }: AuditProgressProps) {
  const [audit, setAudit] = useState<AuditDocument | null>(null);
  const announce = useAnnounce();

  useEffect(() => {
    const unsub = subscribeToAudit(
      uid,
      auditId,
      (updated) => {
        setAudit(updated);

        if (updated.status === "complete") {
          announce("Audit complete. Results are ready.", "assertive");
          onComplete(updated);
        } else if (updated.status === "error") {
          announce(`Audit failed: ${updated.error}`, "assertive");
          onError(updated.error ?? "Unknown error");
        } else if (updated.currentStep) {
          announce(STEP_LABELS[updated.currentStep] ?? updated.currentStep);
        }
      },
      (err) => onError(err.message)
    );

    return unsub;
  }, [uid, auditId, onComplete, onError, announce]);

  if (!audit) {
    return (
      <div className="flex items-center gap-3 py-8" role="status" aria-label="Starting audit">
        <div
          className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
        <span className="text-gray-600">Starting audit...</span>
      </div>
    );
  }

  const progress = audit.progress ?? 0;
  const stepLabel = STEP_LABELS[audit.currentStep ?? ""] ?? "Processing...";
  const isError = audit.status === "error";

  return (
    <div className="py-6" role="status" aria-label={`Audit progress: ${progress}%`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{stepLabel}</span>
        <span className="text-sm text-gray-500">{progress}%</span>
      </div>

      <div
        className="h-2 bg-gray-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Audit completion progress"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isError ? "bg-red-500" : "bg-blue-600"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {isError && (
        <div
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
          role="alert"
        >
          {audit.error ?? "An error occurred. Please try again."}
        </div>
      )}

      <ol className="mt-6 space-y-2" aria-label="Pipeline steps">
        {Object.entries(STEP_LABELS)
          .slice(1)
          .map(([key, label]) => {
            const stepProgress = {
              loading_csv: 10,
              detecting_pii: 20,
              computing_metrics: 40,
              running_gemini_narrative: 60,
              running_gemini_mitigation: 75,
              generating_counterfactuals: 85,
              complete: 100,
            }[key] ?? 0;

            const isDone = progress >= stepProgress && progress > 0;
            const isActive = audit.currentStep === key;

            return (
              <li key={key} className="flex items-center gap-3 text-sm">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    isDone
                      ? "bg-green-100 text-green-700"
                      : isActive
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-400"
                  }`}
                  aria-hidden="true"
                >
                  {isDone ? "✓" : isActive ? "•" : "○"}
                </span>
                <span
                  className={
                    isDone
                      ? "text-gray-600"
                      : isActive
                        ? "font-medium text-gray-900"
                        : "text-gray-400"
                  }
                >
                  {label}
                </span>
              </li>
            );
          })}
      </ol>
    </div>
  );
}
