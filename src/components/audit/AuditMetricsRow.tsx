import { BarChart3, Database, Shield, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { FairnessMetrics, ModelAuditSummary } from "@/lib/types";

const CARD: React.CSSProperties = {
  borderRadius: "0.75rem",
  border: "1px solid #27272a",
  background: "#09090b",
  padding: "1rem",
};
const LABEL: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#71717a",
};
const VALUE: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#f4f4f5",
  fontFamily: '"JetBrains Mono", monospace',
};

export function AuditMetricsRow({
  protectedAttribute,
  totalRecords,
  overallApprovalRate,
  isPending,
  modelAudit,
}: {
  protectedAttribute: string;
  totalRecords: number;
  overallApprovalRate: number;
  isPending?: boolean;
  modelAudit?: ModelAuditSummary;
}) {
  const deriveOverallRate = (metrics?: FairnessMetrics) => {
    if (!metrics) return null;
    const rates = metrics.groupApprovalRates ?? (metrics as any).group_approval_rates ?? {};
    const counts = metrics.groupCounts ?? (metrics as any).group_counts ?? {};
    const keys = Object.keys(rates);
    if (keys.length === 0) return null;
    let weightedSum = 0, total = 0;
    for (const key of keys) {
      weightedSum += (rates[key] ?? 0) * (counts[key] ?? 0);
      total += counts[key] ?? 0;
    }
    if (total <= 0) {
      const avg = keys.reduce((s, k) => s + (rates[k] ?? 0), 0) / keys.length;
      return avg;
    }
    return weightedSum / total;
  };

  const recordsDisplay = isPending || totalRecords === 0 ? "--" : totalRecords.toLocaleString();
  const approvalDisplay = isPending || totalRecords === 0 ? "--" : `${(overallApprovalRate * 100).toFixed(1)}%`;

  const historicalRate = deriveOverallRate(modelAudit?.historical_fairness);
  const modelRate = deriveOverallRate(modelAudit?.model_fairness);
  const hasDual = historicalRate !== null && modelRate !== null;
  const delta = hasDual ? modelRate! - historicalRate! : null;
  const deltaImproved = delta !== null && delta < 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
      {/* Protected Attribute */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={LABEL}>Protected Attr</span>
          <Shield size={14} style={{ color: "#60a5fa" }} />
        </div>
        <div style={VALUE}>{protectedAttribute || "--"}</div>
      </div>

      {/* Total Records */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={LABEL}>Total Records</span>
          <Database size={14} style={{ color: "#a1a1aa" }} />
        </div>
        <div style={VALUE}>{recordsDisplay}</div>
      </div>

      {/* Overall Approval */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={LABEL}>Overall Approval</span>
          <BarChart3 size={14} style={{ color: "#34d399" }} />
        </div>
        {hasDual ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#71717a" }}>
              <span>Historical</span>
              <span style={{ fontFamily: "monospace", color: "#f4f4f5" }}>{(historicalRate! * 100).toFixed(1)}%</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#71717a" }}>
              <span>Model</span>
              <span style={{ fontFamily: "monospace", color: "#f4f4f5" }}>{(modelRate! * 100).toFixed(1)}%</span>
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                borderRadius: "9999px",
                border: `1px solid ${deltaImproved ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
                background: deltaImproved ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                color: deltaImproved ? "#6ee7b7" : "#fca5a5",
                padding: "0.1rem 0.45rem",
                fontSize: "0.68rem",
                fontWeight: 500,
              }}
            >
              {deltaImproved ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
              Delta {(delta! * 100).toFixed(2)}%
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", color: "#71717a", marginTop: "0.25rem" }}>
              <Sparkles size={11} style={{ color: "#60a5fa" }} />
              Historical vs Model output
            </div>
          </div>
        ) : (
          <div style={VALUE}>{approvalDisplay}</div>
        )}
      </div>
    </div>
  );
}
