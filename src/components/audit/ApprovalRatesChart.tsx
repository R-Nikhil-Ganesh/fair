import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import type { AuditReport } from "@/lib/types";

type ApprovalRatesChartProps = {
  report: AuditReport;
};

export function ApprovalRatesChart({ report }: ApprovalRatesChartProps) {
  const chartData = report.disparities.map((disparity) => {
    let modelRate = undefined;
    if (report.modelAudit?.model_fairness?.group_approval_rates?.[disparity.group] !== undefined) {
      modelRate = Math.round(report.modelAudit.model_fairness.group_approval_rates[disparity.group] * 100);
    }
    return {
      name: disparity.group,
      historicalRate: Math.round(disparity.approvalRate * 100),
      modelRate: modelRate,
      flagged: disparity.flagged,
    };
  });

  const hasModel = Boolean(report.modelAudit);
  const hasFlag = report.disparities.some((disparity) => disparity.flagged);

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <h2 className="text-lg mb-1 text-zinc-100">Approval Rates by Group</h2>
        <p className="text-xs text-zinc-500 mb-3">Group comparison appears once metrics are computed.</p>
        <p className="text-sm text-zinc-400">
          Approval-rate chart will appear once fairness metrics are available.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="text-lg leading-tight text-zinc-100">Approval Rates by Group</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Visual comparison of favorable outcomes by protected group.
          </p>
        </div>
        {!hasModel ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 text-zinc-300 px-2 py-1 border border-zinc-800">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> In range
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 text-zinc-300 px-2 py-1 border border-zinc-800">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Flagged
            </span>
          </div>
        ) : null}
      </div>

      <div style={{ width: "100%", minWidth: 0, height: 300 }}>
        <ResponsiveContainer width="100%" height={300} minWidth={0}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#a1a1aa" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value: number) => `${value}%`}
              tick={{ fill: "#a1a1aa" }}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip
              cursor={{ fill: "#0f172a" }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #27272a",
                boxShadow: "0 12px 24px rgba(0, 0, 0, 0.25)",
                background: "#09090b",
              }}
              formatter={(value) => [`${Number(value)}%`, "Approval Rate"]}
            />
            <Legend wrapperStyle={{ color: "#a1a1aa" }} />
            <Bar dataKey="historicalRate" name="Historical Dataset" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={40} />
            {report.modelAudit && (
              <Bar dataKey="modelRate" name="Model Prediction" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {hasFlag ? (
        <div className="mt-5 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-md flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>
            Groups highlighted in red fall below the 80% parity threshold relative to the
            privileged group.
          </p>
        </div>
      ) : null}
    </div>
  );
}
