"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine,
} from "recharts";
import type { FairnessMetrics } from "@/lib/types";

interface ApprovalRateDatum {
  group: string;
  Historical: number;
  Model?: number;
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
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 shadow-lg text-sm" role="tooltip">
      <p className="font-medium text-zinc-200">
        {protectedAttribute}: {label}
      </p>
      {payload.map((entry, index) => (
        <p key={`${entry.value}-${index}`} className="text-zinc-300">
          {entry.name}: {entry.value}%
        </p>
      ))}
      <p className="text-zinc-500">Records: {data.find((d) => d.group === label)?.count}</p>
    </div>
  );
}

interface BiasChartProps {
  metrics: FairnessMetrics;
  protectedAttribute: string;
  modelMetrics?: FairnessMetrics;
}

export function ApprovalRateChart({ metrics, protectedAttribute, modelMetrics }: BiasChartProps) {
  const groupKeys = new Set([...
    Object.keys(metrics.groupApprovalRates),
    ...(modelMetrics ? Object.keys(modelMetrics.groupApprovalRates) : []),
  ]);

  const data: ApprovalRateDatum[] = Array.from(groupKeys).map((group) => {
    const historicalRate = metrics.groupApprovalRates[group] ?? 0;
    const modelRate = modelMetrics?.groupApprovalRates[group];
    return {
      group: String(group),
      Historical: Math.round(historicalRate * 1000) / 10,
      Model: modelRate !== undefined ? Math.round(modelRate * 1000) / 10 : undefined,
      count: metrics.groupCounts[group] ?? 0,
    };
  });

  const historicalRates = data.map((d) => d.Historical);
  const maxRate = Math.max(...historicalRates);
  const minRate = Math.min(...historicalRates);
  const hasModel = Boolean(modelMetrics);

  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-200 mb-1">Approval rate by {protectedAttribute}</h3>
      <p className="text-xs text-zinc-500 mb-4">
        Gap between highest and lowest group: {(maxRate - minRate).toFixed(1)} percentage points
      </p>
      <div style={{ width: "100%", minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={260} minWidth={0}>
          <BarChart data={data} aria-label={`Approval rates by ${protectedAttribute}`}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="group" tick={{ fontSize: 12, fill: "#94a3b8" }} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              aria-label="Approval rate percentage"
            />
            <Tooltip
              content={(props) => (
                <CustomTooltip
                  active={props.active}
                  payload={props.payload as Array<{ value: number; name: string }> | undefined}
                  label={typeof props.label === "string" ? props.label : undefined}
                  protectedAttribute={protectedAttribute}
                  data={data}
                />
              )}
            />
            <Legend wrapperStyle={{ color: "#94a3b8" }} />
            <ReferenceLine
              y={80}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: "80% rule", position: "insideTopRight", fontSize: 11, fill: "#ef4444" }}
            />
            <Bar dataKey="Historical" radius={[4, 4, 0, 0]} fill="#64748b" />
            {hasModel ? <Bar dataKey="Model" radius={[4, 4, 0, 0]} fill="#3b82f6" /> : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-zinc-500 mt-2 text-center">
        Historical = baseline outcomes · Model = inferred outcomes · Dashed line = legal 80% threshold
      </p>
    </div>
  );
}
