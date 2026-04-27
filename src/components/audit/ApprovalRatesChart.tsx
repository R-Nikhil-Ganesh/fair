import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import type { DisparityInfo } from "@/lib/types";

export function ApprovalRatesChart({ disparities }: { disparities: DisparityInfo[] }) {
  const chartData = disparities.map((disparity) => ({
    name: disparity.group,
    rate: Math.round(disparity.approvalRate * 100),
    flagged: disparity.flagged,
  }));
  const hasFlag = disparities.some((disparity) => disparity.flagged);

  if (chartData.length === 0) {
    return (
      <div className="card bg-gradient-to-br from-white to-slate-50 border-border/80">
        <h2 className="text-lg mb-1">Approval Rates by Group</h2>
        <p className="text-xs text-muted-foreground mb-3">Group comparison appears once metrics are computed.</p>
        <p className="text-sm text-muted-foreground">
          Approval-rate chart will appear once fairness metrics are available.
        </p>
      </div>
    );
  }

  return (
    <div className="card bg-gradient-to-br from-white to-slate-50 border-border/80">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="text-lg leading-tight">Approval Rates by Group</h2>
          <p className="text-xs text-muted-foreground mt-1">Visual comparison of favorable outcomes by protected group.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-1 border border-blue-100">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" /> In range
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 px-2 py-1 border border-red-100">
            <span className="inline-block h-2 w-2 rounded-full bg-destructive" /> Flagged
          </span>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value: number) => `${value}%`}
              tick={{ fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-md)",
              }}
              formatter={(value: number) => [`${value}%`, "Approval Rate"]}
            />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={entry.flagged ? "var(--destructive)" : "var(--primary)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {hasFlag ? (
        <div className="mt-5 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md flex items-start gap-2">
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
