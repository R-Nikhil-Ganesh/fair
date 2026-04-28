"use client";

import { useState } from "react";
import { X, Cpu, BarChart2, FlaskConical, ListChecks, ChevronRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import type { AuditReport } from "@/lib/types";

// ── Palette ─────────────────────────────────────────────────────────────────
const C = {
  approved:  "#34d399",
  denied:    "#f87171",
  historical:"#60a5fa",
  model:     "#a78bfa",
  border:    "#27272a",
  surface:   "#111113",
  muted:     "#71717a",
  text:      "#f4f4f5",
  subtext:   "#a1a1aa",
};

// ── Tiny stat tile ────────────────────────────────────────────────────────────
function Tile({ label, value, color = C.text, mono = false }: {
  label: string; value: string; color?: string; mono?: boolean;
}) {
  return (
    <div style={{ background: "#18181b", border: `1px solid ${C.border}`, borderRadius: "0.65rem", padding: "0.7rem 0.9rem" }}>
      <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>{label}</div>
      <div style={{ fontSize: "1.15rem", fontWeight: 700, color, fontFamily: mono ? "monospace" : undefined }}>{value}</div>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ label, icon: Icon, active, onClick }: {
  label: string; icon: React.ElementType; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: "0.4rem",
      padding: "0.45rem 0.9rem",
      borderRadius: "0.5rem",
      border: active ? "1px solid #3b82f6" : `1px solid transparent`,
      background: active ? "rgba(59,130,246,0.12)" : "transparent",
      color: active ? "#60a5fa" : C.muted,
      fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
      transition: "all 0.15s",
    }}>
      <Icon size={13} />{label}
    </button>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#52525b", marginBottom: "0.75rem" }}>
      {children}
    </p>
  );
}

// ── Fairness normalizer — handles camelCase, snake_case, and old fairness_result ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeFairness(raw: any) {
  if (!raw) return null;
  const n = (camel: string, snake: string) => {
    const v = raw[camel] ?? raw[snake];
    return typeof v === "number" ? v : null;
  };
  const rates: Record<string, number> =
    raw.groupApprovalRates ?? raw.group_approval_rates ?? {};
  const counts: Record<string, number> =
    raw.groupCounts ?? raw.group_counts ?? {};
  return {
    disparateImpactRatio:        n("disparateImpactRatio",        "disparate_impact_ratio"),
    demographicParityDifference: n("demographicParityDifference", "demographic_parity_difference"),
    equalizedOddsDifference:     n("equalizedOddsDifference",     "equalized_odds_difference"),
    averageOddsDifference:       n("averageOddsDifference",       "average_odds_difference"),
    groupApprovalRates: rates,
    groupCounts:        counts,
  };
}

// Resolve historical + model fairness from all known Firestore shapes:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveFairnessBlocks(ma: any): { hist: ReturnType<typeof normalizeFairness>; mod: ReturnType<typeof normalizeFairness> } {
  // New shape: historical_fairness + model_fairness
  const hist = normalizeFairness(ma.historical_fairness);
  const mod  = normalizeFairness(ma.model_fairness);
  if (hist || mod) return { hist, mod };

  // Old shape: fairness_result (model predictions only)
  const legacy = normalizeFairness(ma.fairness_result);
  return { hist: null, mod: legacy };
}

// ── Approval-rate comparison bar chart ─────────────────────────────────────────
function ApprovalComparison({ modelAudit, protectedAttribute }: { modelAudit: AuditReport["modelAudit"]; protectedAttribute: string }) {
  const { hist, mod } = resolveFairnessBlocks(modelAudit ?? {});
  const histRates = hist?.groupApprovalRates ?? {};
  const modRates  = mod?.groupApprovalRates  ?? {};
  const groups    = Array.from(new Set([...Object.keys(histRates), ...Object.keys(modRates)]));

  if (!groups.length) return <p style={{ color: C.muted, fontSize: "0.82rem" }}>No group approval rate data available.</p>;

  const showBoth = Object.keys(histRates).length > 0 && Object.keys(modRates).length > 0;
  const data = groups.map(g => ({
    group: g,
    ...(Object.keys(histRates).length ? { Historical: histRates[g] != null ? +(histRates[g] * 100).toFixed(1) : undefined } : {}),
    ...(Object.keys(modRates).length  ? { Model:      modRates[g]  != null ? +(modRates[g]  * 100).toFixed(1) : undefined } : {}),
  }));

  return (
    <>
      <SectionHead>
        Approval Rate by {protectedAttribute}
        {showBoth ? " — Historical vs Model" : ""}
      </SectionHead>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="group" tick={{ fontSize: 11, fill: C.subtext }} />
          <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: C.subtext }} />
          <Tooltip
            contentStyle={{ background: "#09090b", border: `1px solid ${C.border}`, borderRadius: "0.5rem", fontSize: "0.78rem" }}
            labelStyle={{ color: C.text }}
            formatter={(v: number) => [`${v}%`]}
          />
          <Legend wrapperStyle={{ color: C.subtext, fontSize: "0.78rem" }} />
          {Object.keys(histRates).length > 0 && <Bar dataKey="Historical" radius={[4,4,0,0]} fill={C.historical} />}
          {Object.keys(modRates).length  > 0 && <Bar dataKey="Model"      radius={[4,4,0,0]} fill={C.model} />}
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

// ── Prediction distribution donut ─────────────────────────────────────────────
function PredictionDonut({ counts }: { counts: Record<string, number> }) {
  const data = Object.entries(counts).map(([k, v]) => ({
    name: k === "1" ? "Approved" : "Denied",
    value: v,
    fill: k === "1" ? C.approved : C.denied,
  }));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <>
      <SectionHead>Prediction Distribution</SectionHead>
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
        <PieChart width={180} height={180}>
          <Pie data={data} cx={85} cy={85} innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
          <Legend iconType="circle" wrapperStyle={{ color: C.subtext, fontSize: "0.75rem" }} />
        </PieChart>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {data.map(d => (
            <div key={d.name} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.fill, flexShrink: 0 }} />
              <span style={{ color: C.subtext, fontSize: "0.82rem", minWidth: 70 }}>{d.name}</span>
              <span style={{ color: C.text, fontWeight: 700, fontFamily: "monospace", fontSize: "0.9rem" }}>
                {d.value.toLocaleString()}
              </span>
              <span style={{ color: C.muted, fontSize: "0.75rem" }}>
                ({total ? ((d.value / total) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          ))}
          <div style={{ marginTop: "0.25rem", paddingTop: "0.4rem", borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: "0.75rem" }}>
            Total predictions: <span style={{ color: C.text, fontWeight: 600 }}>{total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Fairness delta bars ────────────────────────────────────────────────────────
function FairnessDelta({ modelAudit }: { modelAudit: AuditReport["modelAudit"] }) {
  const { hist, mod } = resolveFairnessBlocks(modelAudit ?? {});

  if (!hist && !mod) {
    return <p style={{ color: C.muted, fontSize: "0.82rem" }}>Fairness metric data not available in this audit record.</p>;
  }

  const METRICS = [
    { label: "Disparate Impact Ratio",  key: "disparateImpactRatio"        as const, threshold: 80,  note: "≥ 80% required" },
    { label: "Demographic Parity Diff", key: "demographicParityDifference" as const, threshold: 10,  note: "≤ 10% required" },
    { label: "Equalized Odds Diff",     key: "equalizedOddsDifference"     as const, threshold: 10,  note: "≤ 10% required" },
    { label: "Avg Odds Difference",     key: "averageOddsDifference"       as const, threshold: 10,  note: "≤ 10% required" },
  ];

  const data = METRICS
    .map(m => {
      const hv = hist?.[m.key];
      const mv = mod?.[m.key];
      if (hv == null && mv == null) return null;
      return {
        label: m.label,
        ...(hv != null ? { Historical: +(hv * 100).toFixed(2) } : {}),
        ...(mv != null ? { Model:      +(mv * 100).toFixed(2) } : {}),
      };
    })
    .filter(Boolean) as { label: string; Historical?: number; Model?: number }[];

  if (!data.length) {
    return <p style={{ color: C.muted, fontSize: "0.82rem" }}>No fairness metrics could be parsed from this record.</p>;
  }

  const showHist = data.some(d => "Historical" in d);
  const showMod  = data.some(d => "Model"      in d);

  return (
    <>
      <SectionHead>
        Fairness Metrics (%)
        {showHist && showMod ? " — Historical vs Model" : showHist ? " — Historical" : " — Model"}
      </SectionHead>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 52)}>
        <BarChart data={data} layout="vertical" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: C.subtext }} tickFormatter={v => `${v}%`} />
          <YAxis type="category" dataKey="label" width={170} tick={{ fontSize: 10, fill: C.subtext }} />
          <Tooltip
            contentStyle={{ background: "#09090b", border: `1px solid ${C.border}`, borderRadius: "0.5rem", fontSize: "0.78rem" }}
            formatter={(v: number) => [`${v.toFixed(2)}%`]}
          />
          <Legend wrapperStyle={{ color: C.subtext, fontSize: "0.78rem" }} />
          {showHist && <Bar dataKey="Historical" radius={[0,4,4,0]} fill={C.historical} />}
          {showMod  && <Bar dataKey="Model"      radius={[0,4,4,0]} fill={C.model} />}
        </BarChart>
      </ResponsiveContainer>

      {/* Status table */}
      <div style={{ marginTop: "1rem", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.73rem" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Metric", ...(showHist ? ["Historical"] : []), ...(showMod ? ["Model"] : []), "Threshold"].map(h => (
                <th key={h} style={{ padding: "0.3rem 0.5rem", color: C.muted, fontWeight: 600, textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map(m => {
              const hv = hist?.[m.key];
              const mv = mod?.[m.key];
              if (hv == null && mv == null) return null;
              const fmt = (v: number | null | undefined) => v != null ? `${(v * 100).toFixed(2)}%` : "—";
              return (
                <tr key={m.key} style={{ borderBottom: "1px solid #111" }}>
                  <td style={{ padding: "0.28rem 0.5rem", color: C.subtext }}>{m.label}</td>
                  {showHist && <td style={{ padding: "0.28rem 0.5rem", color: C.historical, fontFamily: "monospace" }}>{fmt(hv)}</td>}
                  {showMod  && <td style={{ padding: "0.28rem 0.5rem", color: C.model,      fontFamily: "monospace" }}>{fmt(mv)}</td>}
                  <td style={{ padding: "0.28rem 0.5rem", color: "#52525b", fontFamily: "monospace" }}>{m.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Counterfactual panel ──────────────────────────────────────────────────────
function CounterfactualPanel({ modelAudit, protectedAttribute }: { modelAudit: AuditReport["modelAudit"]; protectedAttribute: string }) {
  const cf = modelAudit?.counterfactual_data;
  if (!cf) return <p style={{ color: C.muted, fontSize: "0.82rem" }}>No counterfactual data available.</p>;

  // Build per-group flip counts for chart
  const groupFlips: Record<string, { flipped: number; stable: number }> = {};
  (cf.entries ?? []).forEach(e => {
    const g = String(e.original_value);
    if (!groupFlips[g]) groupFlips[g] = { flipped: 0, stable: 0 };
    if (e.decision_changed) groupFlips[g].flipped++;
    else groupFlips[g].stable++;
  });
  const flipData = Object.entries(groupFlips).map(([g, v]) => ({ group: g, Flipped: v.flipped, Stable: v.stable }));

  const flipRatePct = (cf.flip_rate * 100).toFixed(0);
  const flipColor  = cf.flip_rate >= 0.5 ? C.denied : cf.flip_rate > 0 ? "#fcd34d" : C.approved;

  return (
    <>
      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem", marginBottom: "1.1rem" }}>
        <Tile label="Flip Rate"     value={`${flipRatePct}%`} color={flipColor} mono />
        <Tile label="Decisions Flipped" value={String(cf.flip_count)}   color={C.text} mono />
        <Tile label="Pairs Tested"  value={String(cf.total_tested)} color={C.subtext} mono />
      </div>

      {/* Narrative */}
      <div style={{ background: "#18181b", border: `1px solid ${C.border}`, borderRadius: "0.65rem", padding: "0.75rem 1rem", marginBottom: "1.1rem" }}>
        <p style={{ fontSize: "0.78rem", color: C.subtext, lineHeight: 1.7, fontFamily: '"JetBrains Mono", monospace' }}>{cf.narrative}</p>
      </div>

      {/* Flip chart per group */}
      {flipData.length > 0 && (
        <>
          <SectionHead>Flipped Decisions by {protectedAttribute} Group</SectionHead>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={flipData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="group" tick={{ fontSize: 11, fill: C.subtext }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.subtext }} />
              <Tooltip
                contentStyle={{ background: "#09090b", border: `1px solid ${C.border}`, borderRadius: "0.5rem", fontSize: "0.78rem" }}
              />
              <Legend wrapperStyle={{ color: C.subtext, fontSize: "0.78rem" }} />
              <Bar dataKey="Flipped" radius={[4,4,0,0]} fill={C.denied}   />
              <Bar dataKey="Stable"  radius={[4,4,0,0]} fill={C.approved} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {/* Entries table */}
      {cf.entries?.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <SectionHead>Individual Counterfactual Records</SectionHead>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.73rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["#", "Original Group", "Counterfactual Group", "Original Decision", "CF Decision", "Changed?"].map(h => (
                  <th key={h} style={{ padding: "0.3rem 0.5rem", color: C.muted, fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cf.entries.map((e, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #111", background: i % 2 === 0 ? "transparent" : "#111113" }}>
                  <td style={{ padding: "0.28rem 0.5rem", color: C.muted,   fontFamily: "monospace" }}>#{e.record_index}</td>
                  <td style={{ padding: "0.28rem 0.5rem", color: C.subtext }}>{String(e.original_value)}</td>
                  <td style={{ padding: "0.28rem 0.5rem", color: C.subtext }}>{String(e.counterfactual_value)}</td>
                  <td style={{ padding: "0.28rem 0.5rem", color: e.original_prediction === 1 ? C.approved : C.denied, fontFamily: "monospace" }}>
                    {e.original_prediction === 1 ? "Approved" : "Denied"}
                  </td>
                  <td style={{ padding: "0.28rem 0.5rem", color: e.counterfactual_prediction === 1 ? C.approved : C.denied, fontFamily: "monospace" }}>
                    {e.counterfactual_prediction === 1 ? "Approved" : "Denied"}
                  </td>
                  <td style={{ padding: "0.28rem 0.5rem" }}>
                    <span style={{
                      fontSize: "0.66rem", fontWeight: 700, borderRadius: 999, padding: "0.1rem 0.4rem",
                      background: e.decision_changed ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                      color: e.decision_changed ? C.denied : C.approved,
                      border: `1px solid ${e.decision_changed ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                    }}>
                      {e.decision_changed ? "Yes ⚠" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Feature list panel ─────────────────────────────────────────────────────────
function FeaturePanel({ modelAudit }: { modelAudit: AuditReport["modelAudit"] }) {
  const features = modelAudit?.feature_columns ?? [];
  if (!features.length) return <p style={{ color: C.muted, fontSize: "0.82rem" }}>No feature data available.</p>;
  return (
    <>
      <SectionHead>{features.length} Features Used by the Model</SectionHead>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {features.map(f => (
          <span key={f} style={{
            padding: "0.2rem 0.6rem", borderRadius: 999,
            background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
            color: "#93c5fd", fontSize: "0.75rem", fontFamily: "monospace",
          }}>{f}</span>
        ))}
      </div>
    </>
  );
}

// ── Main exported component ────────────────────────────────────────────────────
type Tab = "overview" | "fairness" | "counterfactual" | "features";

export function ModelStatsModal({ report }: { report: AuditReport }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab]   = useState<Tab>("overview");
  const ma = report.modelAudit;
  if (!ma) return null;

  const accuracyPct = ma.model_accuracy >= 0 ? `${(ma.model_accuracy * 100).toFixed(1)}%` : "N/A";
  const hasCF       = Boolean(ma.counterfactual_data);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          padding: "0.55rem 1rem",
          borderRadius: "0.6rem",
          border: "1px solid rgba(99,102,241,0.4)",
          background: "rgba(99,102,241,0.08)",
          color: "#a5b4fc",
          fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.15)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(99,102,241,0.08)")}
      >
        <Cpu size={15} />
        Model Analysis
        <ChevronRight size={13} />
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "relative", width: "100%", maxWidth: "720px",
              maxHeight: "88vh", overflowY: "auto",
              borderRadius: "1.1rem",
              border: "1px solid rgba(99,102,241,0.35)",
              background: "#09090b",
              boxShadow: "0 30px 80px rgba(0,0,0,0.9), 0 0 0 1px #111",
            }}
          >
            {/* ── Header ── */}
            <div style={{
              position: "sticky", top: 0, zIndex: 10,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "1rem 1.25rem",
              borderBottom: `1px solid ${C.border}`,
              background: "linear-gradient(180deg, #111 0%, #09090b 100%)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Cpu size={17} style={{ color: "#a5b4fc" }} />
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: C.text }}>Model Analysis</h2>
                <span style={{
                  fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.45rem",
                  borderRadius: 999, background: "rgba(99,102,241,0.15)",
                  color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)",
                }}>{ma.model_type?.toUpperCase() || "MODEL"}</span>
              </div>
              <button onClick={() => setOpen(false)} style={{
                borderRadius: "50%", padding: "0.35rem", color: C.muted,
                background: "transparent", border: "none", cursor: "pointer",
              }}>
                <X size={16} />
              </button>
            </div>

            {/* ── Summary row ── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "0.6rem", padding: "1rem 1.25rem 0",
            }}>
              <Tile label="Accuracy"      value={accuracyPct} color={ma.model_accuracy >= 0.8 ? C.approved : ma.model_accuracy >= 0.6 ? "#fcd34d" : C.denied} mono />
              {ma.prediction_counts && (
                <>
                  <Tile label="Approved" value={(ma.prediction_counts["1"] ?? 0).toLocaleString()} color={C.approved} mono />
                  <Tile label="Denied"   value={(ma.prediction_counts["0"] ?? 0).toLocaleString()} color={C.denied}   mono />
                </>
              )}
              {ma.feature_columns && <Tile label="Features" value={String(ma.feature_columns.length)} />}
              {hasCF && (
                <Tile
                  label="CF Flip Rate"
                  value={`${((ma.counterfactual_data!.flip_rate) * 100).toFixed(0)}%`}
                  color={ma.counterfactual_data!.flip_rate >= 0.5 ? C.denied : C.approved}
                  mono
                />
              )}
            </div>

            {/* ── Tabs ── */}
            <div style={{
              display: "flex", gap: "0.4rem", flexWrap: "wrap",
              padding: "0.75rem 1.25rem",
              borderBottom: `1px solid ${C.border}`,
            }}>
              <Tab label="Overview"    icon={BarChart2}    active={tab === "overview"}       onClick={() => setTab("overview")} />
              <Tab label="Fairness"    icon={BarChart2}    active={tab === "fairness"}        onClick={() => setTab("fairness")} />
              {hasCF && <Tab label="Counterfactuals" icon={FlaskConical} active={tab === "counterfactual"} onClick={() => setTab("counterfactual")} />}
              {ma.feature_columns?.length ? <Tab label="Features" icon={ListChecks} active={tab === "features"} onClick={() => setTab("features")} /> : null}
            </div>

            {/* ── Tab content ── */}
            <div style={{ padding: "1.25rem" }}>
              {tab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <ApprovalComparison modelAudit={ma} protectedAttribute={report.protectedAttribute} />
                  {ma.prediction_counts && Object.keys(ma.prediction_counts).length > 0 && (
                    <PredictionDonut counts={ma.prediction_counts} />
                  )}
                </div>
              )}
              {tab === "fairness" && <FairnessDelta modelAudit={ma} />}
              {tab === "counterfactual" && hasCF && (
                <CounterfactualPanel modelAudit={ma} protectedAttribute={report.protectedAttribute} />
              )}
              {tab === "features" && <FeaturePanel modelAudit={ma} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
