"use client";

import { useEffect, useState } from "react";
import { subscribeToAudit } from "@/lib/ai";
import { useAnnounce } from "./AccessibilityWrapper";
import type { AuditDocument } from "@/lib/types";

const STEPS: { key: string; label: string; pct: number }[] = [
  { key: "loading_csv",               label: "Loading dataset",            pct: 10 },
  { key: "detecting_pii",             label: "Scanning for sensitive data", pct: 20 },
  { key: "computing_metrics",         label: "Computing fairness metrics",  pct: 40 },
  { key: "running_gemini_narrative",  label: "Generating bias explanation", pct: 60 },
  { key: "running_gemini_mitigation", label: "Building mitigation plan",    pct: 75 },
  { key: "generating_counterfactuals",label: "Counterfactual analysis",     pct: 85 },
  { key: "complete",                  label: "Audit complete",              pct: 100 },
];

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
      uid, auditId,
      (updated) => {
        setAudit(updated);
        if (updated.status === "complete") { announce("Audit complete.", "assertive"); onComplete(updated); }
        else if (updated.status === "error") { announce(`Audit failed: ${updated.error}`, "assertive"); onError(updated.error ?? "Unknown error"); }
        else if (updated.currentStep) { announce(STEPS.find(s => s.key === updated.currentStep)?.label ?? updated.currentStep); }
      },
      (err) => onError(err.message)
    );
    return unsub;
  }, [uid, auditId, onComplete, onError, announce]);

  if (!audit) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1.25rem" }}>
        <div
          style={{
            width: 20, height: 20, borderRadius: "50%",
            border: "2px solid #3b82f6",
            borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite",
            flexShrink: 0,
          }}
          aria-hidden
        />
        <span style={{ color: "#a1a1aa", fontSize: "0.9rem" }}>Starting audit…</span>
      </div>
    );
  }

  const progress = audit.progress ?? 0;
  const isError = audit.status === "error";
  const currentKey = audit.currentStep ?? "";

  return (
    <div role="status" aria-label={`Audit progress: ${progress}%`} style={{ padding: "0.25rem 0" }}>
      {/* Progress bar row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#e4e4e7" }}>
          {STEPS.find(s => s.key === currentKey)?.label ?? "Processing…"}
        </span>
        <span style={{ fontSize: "0.82rem", color: "#71717a", fontFamily: "monospace" }}>{progress}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: 6, borderRadius: 999,
          background: "#27272a",
          overflow: "hidden",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 999,
            width: `${progress}%`,
            background: isError
              ? "linear-gradient(90deg,#ef4444,#f87171)"
              : "linear-gradient(90deg,#2563eb,#3b82f6)",
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {isError && (
        <div
          role="alert"
          style={{
            marginBottom: "1rem",
            padding: "0.6rem 0.75rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "0.5rem",
            fontSize: "0.82rem",
            color: "#fca5a5",
          }}
        >
          {audit.error ?? "An error occurred. Please try again."}
        </div>
      )}

      {/* Step list */}
      <ol aria-label="Pipeline steps" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {STEPS.map(({ key, label, pct }) => {
          const isDone   = progress >= pct && progress > 0;
          const isActive = currentKey === key;
          return (
            <li key={key} style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <span
                aria-hidden
                style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.72rem", fontWeight: 700,
                  background: isDone ? "rgba(16,185,129,0.15)" : isActive ? "rgba(59,130,246,0.15)" : "#18181b",
                  color: isDone ? "#34d399" : isActive ? "#60a5fa" : "#52525b",
                  border: `1px solid ${isDone ? "rgba(16,185,129,0.3)" : isActive ? "rgba(59,130,246,0.3)" : "#27272a"}`,
                }}
              >
                {isDone ? "✓" : isActive ? "•" : "○"}
              </span>
              <span style={{
                fontSize: "0.82rem",
                color: isDone ? "#a1a1aa" : isActive ? "#f4f4f5" : "#52525b",
                fontWeight: isActive ? 600 : 400,
              }}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
