"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { FairnessMetrics } from "@/lib/types";

interface ApprovalRateDatum {
  group: string;
  "Approval rate": number;
  count: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  protectedAttribute: string;
  data: ApprovalRateDatum[];
}

function CustomTooltip({ active, payload, label, protectedAttribute, data }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm" role="tooltip">
      <p className="font-medium">
        {protectedAttribute}: {label}
      </p>
      <p className="text-blue-700">Approval rate: {payload[0].value}%</p>
      <p className="text-gray-500">Records: {data.find((d) => d.group === label)?.count}</p>
    </div>
  );
}

interface BiasChartProps {
  metrics: FairnessMetrics;
  protectedAttribute: string;
}

export function ApprovalRateChart({ metrics, protectedAttribute }: BiasChartProps) {
  const data: ApprovalRateDatum[] = Object.entries(metrics.groupApprovalRates).map(([group, rate]) => ({
    group: String(group),
    "Approval rate": Math.round(rate * 1000) / 10,
    count: metrics.groupCounts[group] ?? 0,
  }));

  const maxRate = Math.max(...data.map((d) => d["Approval rate"]));
  const minRate = Math.min(...data.map((d) => d["Approval rate"]));

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-1">Approval rate by {protectedAttribute}</h3>
      <p className="text-xs text-gray-500 mb-4">
        Gap between highest and lowest group: {(maxRate - minRate).toFixed(1)} percentage points
      </p>
      <div style={{ width: "100%", minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={240} minWidth={0}>
          <BarChart data={data} aria-label={`Approval rates by ${protectedAttribute}`}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="group" tick={{ fontSize: 12 }} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12 }}
              aria-label="Approval rate percentage"
            />
            <Tooltip
              content={(props) => (
                <CustomTooltip
                  active={props.active}
                  payload={props.payload as Array<{ value: number }> | undefined}
                  label={typeof props.label === "string" ? props.label : undefined}
                  protectedAttribute={protectedAttribute}
                  data={data}
                />
              )}
            />
            <ReferenceLine
              y={80}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: "80% rule", position: "insideTopRight", fontSize: 11, fill: "#ef4444" }}
            />
            <Bar dataKey="Approval rate" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.group}
                  fill={
                    entry["Approval rate"] === maxRate
                      ? "#3b82f6"
                      : entry["Approval rate"] === minRate
                        ? "#ef4444"
                        : "#94a3b8"
                  }
                  aria-label={`${entry.group}: ${entry["Approval rate"]}%`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        Blue = highest rate group · Red = lowest rate group · Dashed line = legal 80% threshold
      </p>
    </div>
  );
}
