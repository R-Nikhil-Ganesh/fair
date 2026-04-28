"use client";

import { useState } from "react";
import { X, Scale, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, Legend,
} from "recharts";
import type { AuditReport, FairnessMetrics } from "@/lib/types";

// ── shared ────────────────────────────────────────────────────────────────────
const C = {
  border:  "#27272a",
  surface: "#111113",
  muted:   "#71717a",
  text:    "#f4f4f5",
  sub:     "#a1a1aa",
  pass:    "#34d399",
  warn:    "#fcd34d",
  fail:    "#f87171",
  hist:    "#60a5fa",
  model:   "#a78bfa",
};

const fmt = (v: number | undefined, pct = false) => {
  if (v == null || !Number.isFinite(v)) return "—";
  if (pct) return `${(v * 100).toFixed(1)}%`;
  return v.toFixed(4);
};

const severity = (v: number | undefined, key: string): "pass" | "warn" | "fail" => {
  if (v == null || !Number.isFinite(v)) return "pass";
  if (key === "disparateImpactRatio") return v >= 0.8 ? "pass" : v >= 0.7 ? "warn" : "fail";
  return Math.abs(v) <= 0.05 ? "pass" : Math.abs(v) <= 0.10 ? "warn" : "fail";
};

const SEV_COLOR = { pass: C.pass, warn: C.warn, fail: C.fail };

// ── individual metric row ─────────────────────────────────────────────────────
function MetricRow({
  label, description, threshold, histVal, modelVal, metricKey,
}: {
  label: string; description: string; threshold: string;
  histVal: number | undefined; modelVal: number | undefined; metricKey: string;
}) {
  const sev = severity(histVal, metricKey);
  const modSev = modelVal != null ? severity(modelVal, metricKey) : undefined;
  const delta = histVal != null && modelVal != null && Number.isFinite(histVal) && Number.isFinite(modelVal)
    ? modelVal - histVal : null;
  const deltaGood = delta != null && (metricKey === "disparateImpactRatio" ? delta > 0 : delta < 0);

  return (
    <div style={{
      background: "#18181b", border: `1px solid ${C.border}`, borderRadius: "0.75rem",
      padding: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem",
    }}>
      {/* header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.88rem", color: C.text }}>{label}</div>
          <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: "0.2rem" }}>{description}</div>
        </div>
        <span style={{
          fontSize: "0.68rem", fontWeight: 700, borderRadius: 999, padding: "0.15rem 0.55rem",
          background: `${SEV_COLOR[sev]}20`, color: SEV_COLOR[sev],
          border: `1px solid ${SEV_COLOR[sev]}40`, whiteSpace: "nowrap",
        }}>
          {sev === "pass" ? "✓ Pass" : sev === "warn" ? "⚠ Warning" : "✗ Fail"}
        </span>
      </div>

      {/* values */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ minWidth: 90 }}>
          <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {modelVal != null ? "Historical" : "Value"}
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: SEV_COLOR[sev], fontFamily: "monospace" }}>
            {fmt(histVal)}
          </div>
        </div>
        {modelVal != null && Number.isFinite(modelVal) && (
          <div style={{ minWidth: 90 }}>
            <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Model</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: SEV_COLOR[modSev ?? "pass"], fontFamily: "monospace" }}>
              {fmt(modelVal)}
            </div>
          </div>
        )}
        {delta != null && (
          <div style={{ minWidth: 90 }}>
            <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Delta</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.25rem" }}>
              {deltaGood ? <TrendingDown size={13} color={C.pass} /> : <TrendingUp size={13} color={C.fail} />}
              <span style={{ fontSize: "0.85rem", fontFamily: "monospace", color: deltaGood ? C.pass : C.fail }}>
                {delta > 0 ? "+" : ""}{fmt(delta)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* threshold */}
      <div style={{ fontSize: "0.68rem", color: "#52525b", borderTop: `1px solid ${C.border}`, paddingTop: "0.45rem" }}>
        Threshold: {threshold}
      </div>
    </div>
  );
}

// ── approval rate grouped bar chart ──────────────────────────────────────────
function GroupedApprovalChart({ report }: { report: AuditReport }) {
  if (!report.disparities.length) return null;

  const modelRates: Record<string, number> =
    report.modelAudit?.model_fairness?.groupApprovalRates ??
    (report.modelAudit?.model_fairness as any)?.group_approval_rates ?? {};
  const hasModel = Object.keys(modelRates).length > 0;

  const data = report.disparities.map(d => ({
    group: d.group,
    Historical: +(d.approvalRate * 100).toFixed(1),
    ...(hasModel && modelRates[d.group] != null
      ? { Model: +(modelRates[d.group] * 100).toFixed(1) }
      : {}),
    flagged: d.flagged,
  }));

  // gap stat
  const rates = report.disparities.map(d => d.approvalRate * 100);
  const gap = rates.length > 1 ? (Math.max(...rates) - Math.min(...rates)).toFixed(1) : null;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
        <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#52525b" }}>
          Approval Rate by {report.protectedAttribute}
        </p>
        {gap && (
          <span style={{ fontSize: "0.72rem", color: C.muted }}>
            Gap: <span style={{ color: parseFloat(gap) > 10 ? C.fail : C.warn, fontFamily: "monospace", fontWeight: 700 }}>{gap}pp</span>
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} barGap={4} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="group" tick={{ fontSize: 11, fill: C.sub }} />
          <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: C.sub }} />
          <Tooltip
            contentStyle={{ background: "#09090b", border: `1px solid ${C.border}`, borderRadius: "0.5rem", fontSize: "0.78rem" }}
            formatter={(v: number) => [`${v}%`]}
          />
          <ReferenceLine y={80} stroke="rgba(239,68,68,0.5)" strokeDasharray="5 3" label={{ value: "80% rule", fill: C.fail, fontSize: 10, position: "insideTopRight" }} />
          <Legend verticalAlign="top" wrapperStyle={{ color: C.sub, fontSize: "0.78rem", paddingBottom: "0.5rem" }} />
          <Bar dataKey="Historical" radius={[4, 4, 0, 0]} fill={C.hist}>
            {data.map((d, i) => <Cell key={i} fill={d.flagged ? C.fail : C.hist} />)}
          </Bar>
          {hasModel && <Bar dataKey="Model" radius={[4, 4, 0, 0]} fill={C.model} />}
        </BarChart>
      </ResponsiveContainer>

      {/* flagged warning */}
      {report.disparities.some(d => d.flagged) && (
        <div style={{
          marginTop: "0.75rem", padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
          background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)",
          display: "flex", gap: "0.5rem", alignItems: "flex-start",
        }}>
          <AlertTriangle size={13} style={{ color: C.fail, flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: "0.75rem", color: "#fca5a5" }}>
            Groups in red fall below the 80% parity threshold — this may constitute disparate impact under ECOA.
          </span>
        </div>
      )}
    </div>
  );
}

// ── overall status banner ─────────────────────────────────────────────────────
function StatusBanner({ metrics }: { metrics: FairnessMetrics | undefined }) {
  if (!metrics) return null;
  const flagged = metrics.flaggedMetrics ?? [];
  const ok = flagged.length === 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.6rem",
      padding: "0.6rem 0.9rem", borderRadius: "0.6rem",
      background: ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
      border: `1px solid ${ok ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
      marginBottom: "1.25rem",
    }}>
      {ok
        ? <CheckCircle2 size={15} style={{ color: C.pass, flexShrink: 0 }} />
        : <AlertTriangle size={15} style={{ color: C.fail, flexShrink: 0 }} />}
      <span style={{ fontSize: "0.82rem", color: ok ? C.pass : C.fail, fontWeight: 600 }}>
        {ok ? "All fairness thresholds passed" : `${flagged.length} metric${flagged.length > 1 ? "s" : ""} flagged — action required`}
      </span>
    </div>
  );
}

// ── modal shell ───────────────────────────────────────────────────────────────
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: "relative", width: "100%", maxWidth: "760px",
        maxHeight: "90vh", overflowY: "auto", borderRadius: "1.1rem",
        border: "1px solid rgba(96,165,250,0.3)", background: "#09090b",
        boxShadow: "0 30px 80px rgba(0,0,0,0.9)",
      }}>
        {/* sticky header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.25rem", borderBottom: `1px solid ${C.border}`,
          background: "linear-gradient(180deg,#111 0%,#09090b 100%)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Scale size={17} style={{ color: "#60a5fa" }} />
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: C.text }}>Fairness Metrics</h2>
          </div>
          <button onClick={onClose} style={{
            borderRadius: "50%", padding: "0.35rem", color: C.muted,
            background: "transparent", border: "none", cursor: "pointer",
          }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: "1.25rem" }}>{children}</div>
      </div>
    </div>
  );
}

// ── exported trigger + modal ──────────────────────────────────────────────────
export function FairnessMetricsModal({
  report,
  externalOpen,
  onExternalClose,
}: {
  report: AuditReport;
  externalOpen?: boolean;
  onExternalClose?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);

  const open    = externalOpen ?? internalOpen;
  const onClose = onExternalClose ?? (() => setInternalOpen(false));

  // Pull metrics — prefer model_fairness if model present, else historical/root
  const histMetrics: FairnessMetrics | undefined =
    report.modelAudit?.historical_fairness ??
    (report as any)._rawFairnessMetrics;
  const modelMetrics: FairnessMetrics | undefined = report.modelAudit?.model_fairness;

  // primary metrics for status banner = historical (or only available)
  const primary = histMetrics;

  const DEFS = [
    {
      key: "disparateImpactRatio",
      label: "Disparate Impact Ratio",
      description: "Ratio of favorable outcome rates between groups. Below 0.80 violates the 80% rule.",
      threshold: "≥ 0.80 (ECOA/EEOC rule)",
    },
    {
      key: "demographicParityDifference",
      label: "Demographic Parity Difference",
      description: "Absolute difference in approval rates between groups.",
      threshold: "≤ 0.10",
    },
    {
      key: "equalizedOddsDifference",
      label: "Equalized Odds Difference",
      description: "Difference in true positive rates between groups.",
      threshold: "≤ 0.10",
    },
    {
      key: "statisticalParityDifference",
      label: "Statistical Parity Difference",
      description: "Signed difference in approval rates (positive = privileged group favored).",
      threshold: "≈ 0 is ideal",
    },
  ] as const;

  const flaggedCount = primary?.flaggedMetrics?.length ?? 0;
  const hasAny = Boolean(primary || modelMetrics);

  return (
    <Modal open={open} onClose={onClose}>
      <StatusBanner metrics={primary} />

      {/* metric cards grid */}
      {hasAny ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0.75rem" }}>
          {DEFS.map(d => (
            <MetricRow
              key={d.key}
              label={d.label}
              description={d.description}
              threshold={d.threshold}
              histVal={(primary as any)?.[d.key]}
              modelVal={(modelMetrics as any)?.[d.key]}
              metricKey={d.key}
            />
          ))}
        </div>
      ) : (
        <p style={{ color: C.muted, fontSize: "0.85rem" }}>Metrics not yet available — audit may still be processing.</p>
      )}

      {/* chart */}
      <GroupedApprovalChart report={report} />
    </Modal>
  );
}
