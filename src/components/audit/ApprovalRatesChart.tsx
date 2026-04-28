"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import type { AuditReport } from "@/lib/types";

/* ─── Shared axis / tooltip styles ─────────────────────────── */
const AXIS_TICK  = { fill: "#a1a1aa", fontSize: 12 };
const TOOLTIP_STYLE = {
  borderRadius: "8px",
  border: "1px solid #27272a",
  boxShadow: "0 12px 24px rgba(0,0,0,0.4)",
  background: "#09090b",
  color: "#f4f4f5",
  fontSize: "12px",
};

/* ─── Single bar chart ──────────────────────────────────────── */
function SingleBarChart({
  data,
  dataKey,
  barColor,
  label,
}: {
  data: { name: string; value: number; flagged?: boolean }[];
  dataKey: string;
  barColor: string;
  label: string;
}) {
  return (
    <div>
      <p
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#71717a",
          marginBottom: "0.5rem",
        }}
      >
        {label}
      </p>
      <ResponsiveContainer width="100%" height={220} minWidth={0}>
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
          <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v: number) => `${v}%`}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
          />
          <RechartsTooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => [`${Number(v)}%`, "Approval Rate"]}
          />
          <Bar dataKey={dataKey} name="Approval Rate" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.flagged ? "#ef4444" : barColor}
                fillOpacity={entry.flagged ? 0.85 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────── */
export function ApprovalRatesChart({ report }: { report: AuditReport }) {
  if (report.disparities.length === 0) {
    return (
      <div
        style={{
          background: "#09090b",
          border: "1px solid #27272a",
          borderRadius: "1rem",
          padding: "1.25rem",
        }}
      >
        <h2 style={{ color: "#f4f4f5", marginBottom: "0.25rem" }}>Approval Rates by Group</h2>
        <p style={{ color: "#71717a", fontSize: "0.875rem" }}>
          Chart will appear once fairness metrics are available.
        </p>
      </div>
    );
  }

  /* ── Historical data (always available) ── */
  const historicalData = report.disparities.map((d) => ({
    name: d.group,
    value: Math.round(d.approvalRate * 100),
    flagged: d.flagged,
  }));

  /* ── Model data (only when model audit present) ── */
  const modelFairness = report.modelAudit?.model_fairness;
  const groupRates: Record<string, number> | undefined =
    modelFairness?.groupApprovalRates ?? modelFairness?.group_approval_rates;

  const hasModel = Boolean(report.modelAudit && groupRates && Object.keys(groupRates).length > 0);

  const modelData = hasModel
    ? report.disparities.map((d) => ({
        name: d.group,
        value:
          groupRates![d.group] !== undefined
            ? Math.round(groupRates![d.group] * 100)
            : 0,
        flagged: false,
      }))
    : [];

  const hasFlag = report.disparities.some((d) => d.flagged);

  return (
    <div
      style={{
        background: "#09090b",
        border: "1px solid #27272a",
        borderRadius: "1rem",
        padding: "1.25rem",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ color: "#f4f4f5", fontSize: "1rem", fontWeight: 600 }}>
          Approval Rates by Group
        </h2>
        <p style={{ color: "#71717a", fontSize: "0.75rem", marginTop: "0.25rem" }}>
          {hasModel
            ? "Side-by-side: historical dataset vs. model predictions"
            : "Approval rate breakdown by protected attribute group"}
        </p>
      </div>

      {/* Charts — side by side when model present, single when not */}
      {hasModel ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
          }}
        >
          <SingleBarChart
            data={historicalData}
            dataKey="value"
            barColor="#64748b"
            label="Historical Dataset"
          />
          <SingleBarChart
            data={modelData}
            dataKey="value"
            barColor="#3b82f6"
            label="Model Prediction"
          />
        </div>
      ) : (
        <SingleBarChart
          data={historicalData}
          dataKey="value"
          barColor="#3b82f6"
          label="Historical Dataset"
        />
      )}

      {/* Legend row when dual */}
      {hasModel && (
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid #27272a",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", color: "#a1a1aa" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#64748b", display: "inline-block" }} />
            Historical Dataset
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", color: "#a1a1aa" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#3b82f6", display: "inline-block" }} />
            Model Prediction
          </span>
        </div>
      )}

      {/* Flag warning */}
      {hasFlag && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.6rem 0.75rem",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "0.5rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            color: "#fca5a5",
            fontSize: "0.8rem",
          }}
        >
          <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>Groups in red fall below the 80% parity threshold relative to the privileged group.</span>
        </div>
      )}
    </div>
  );
}
