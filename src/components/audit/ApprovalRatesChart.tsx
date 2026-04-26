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

  return (
    <div className="card">
      <h2 className="text-lg mb-6">Approval Rates by Group</h2>
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
        <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-start gap-2">
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
