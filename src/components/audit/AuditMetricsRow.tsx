import { BarChart3, Database, Shield, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { FairnessMetrics, ModelAuditSummary } from "@/lib/types";

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
    const rates = metrics.groupApprovalRates;
    const counts = metrics.groupCounts;
    const keys = Object.keys(rates);
    if (keys.length === 0) return null;

    let weightedSum = 0;
    let total = 0;
    for (const key of keys) {
      const rate = rates[key] ?? 0;
      const count = counts[key] ?? 0;
      weightedSum += rate * count;
      total += count;
    }
    if (total <= 0) return null;
    return weightedSum / total;
  };

  const recordsDisplay = isPending
    ? "--"
    : totalRecords > 0
      ? totalRecords.toLocaleString()
      : "--";
  const approvalDisplay = isPending
    ? "--"
    : totalRecords > 0
      ? `${(overallApprovalRate * 100).toFixed(1)}%`
      : "--";

  const historicalRate = deriveOverallRate(modelAudit?.historical_fairness);
  const modelRate = deriveOverallRate(modelAudit?.model_fairness);
  const hasDual = historicalRate !== null && modelRate !== null;
  const delta = hasDual ? modelRate - historicalRate : null;
  const deltaImproved = delta !== null && delta < 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            Protected Attr
          </div>
          <Shield size={15} className="text-blue-400" />
        </div>
        <div className="text-xl font-semibold text-zinc-100 font-mono">
          {protectedAttribute || "--"}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            Total Records
          </div>
          <Database size={15} className="text-zinc-400" />
        </div>
        <div className="text-xl font-semibold text-zinc-100 font-mono">{recordsDisplay}</div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            Overall Approval
          </div>
          <BarChart3 size={15} className="text-emerald-400" />
        </div>
        {hasDual ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Historical</span>
              <span className="font-mono text-zinc-100">
                {(historicalRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Model</span>
              <span className="font-mono text-zinc-100">{(modelRate * 100).toFixed(1)}%</span>
            </div>
            <div
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium ${
                deltaImproved
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/40 bg-red-500/10 text-red-300"
              }`}
            >
              {deltaImproved ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              Delta {(delta * 100).toFixed(2)}%
            </div>
          </div>
        ) : (
          <div className="text-xl font-semibold text-zinc-100 font-mono">{approvalDisplay}</div>
        )}
        {hasDual ? (
          <div className="mt-3 flex items-center gap-1 text-[0.7rem] text-zinc-500">
            <Sparkles size={12} className="text-blue-400" />
            Historical vs Model output
          </div>
        ) : null}
      </div>
    </div>
  );
}
