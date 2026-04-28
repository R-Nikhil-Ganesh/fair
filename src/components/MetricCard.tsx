import type { FairnessMetrics } from "@/lib/types";

type Severity = "pass" | "warning" | "fail";

interface MetricCardProps {
  label: string;
  value: number;
  secondaryValue?: number;
  primaryLabel?: string;
  secondaryLabel?: string;
  delta?: number;
  deltaTone?: "good" | "bad" | "neutral";
  description: string;
  threshold?: string;
  severity: Severity;
  isPercentage?: boolean;
  isFlagged: boolean;
}

const SEVERITY_STYLES: Record<Severity, { badge: string; border: string; icon: string }> = {
  pass: {
    badge: "bg-emerald-500/15 text-emerald-200",
    border: "border-emerald-500/30",
    icon: "✓",
  },
  warning: {
    badge: "bg-amber-500/15 text-amber-200",
    border: "border-amber-500/30",
    icon: "!",
  },
  fail: {
    badge: "bg-red-500/15 text-red-200",
    border: "border-red-500/30",
    icon: "✗",
  },
};

const DELTA_STYLES: Record<"good" | "bad" | "neutral", string> = {
  good: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
  bad: "bg-red-500/15 text-red-200 border-red-500/30",
  neutral: "bg-zinc-800 text-zinc-300 border-zinc-700",
};

const formatValue = (value: number, isPercentage?: boolean) => {
  if (isPercentage) return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(3);
};

export function MetricCard({
  label,
  value,
  description,
  threshold,
  severity,
  isPercentage,
  isFlagged,
  secondaryValue,
  primaryLabel,
  secondaryLabel,
  delta,
  deltaTone,
}: MetricCardProps) {
  const styles = SEVERITY_STYLES[severity];
  const displayValue = formatValue(value, isPercentage);
  const secondaryDisplay = secondaryValue !== undefined ? formatValue(secondaryValue, isPercentage) : null;
  const hasComparison = secondaryValue !== undefined && secondaryDisplay !== null;
  const deltaDisplay =
    delta !== undefined
      ? `${delta > 0 ? "+" : ""}${formatValue(delta, isPercentage)}`
      : null;
  const deltaArrow = delta === undefined ? "" : delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const deltaClass = deltaTone ? DELTA_STYLES[deltaTone] : DELTA_STYLES.neutral;

  return (
    <article
      className={`rounded-xl border p-4 bg-zinc-900 ${styles.border} ${isFlagged ? "ring-2 ring-offset-1 ring-red-500/50 ring-offset-zinc-950" : ""}`}
      aria-label={`${label}: ${displayValue}, status ${severity}`}
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium border ${styles.badge}`}
          aria-label={`Status: ${severity}`}
        >
          {styles.icon} {severity}
        </span>
      </div>
      {hasComparison ? (
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <div className="text-[0.7rem] uppercase tracking-wide text-zinc-500">
              {primaryLabel ?? "Historical"}
            </div>
            <div className="text-2xl font-semibold text-zinc-100">{displayValue}</div>
          </div>
          <div>
            <div className="text-[0.7rem] uppercase tracking-wide text-zinc-500">
              {secondaryLabel ?? "Model"}
            </div>
            <div className="text-2xl font-semibold text-zinc-100">{secondaryDisplay}</div>
          </div>
        </div>
      ) : (
        <div className="text-2xl font-semibold text-zinc-100 mb-1">{displayValue}</div>
      )}
      {deltaDisplay ? (
        <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium ${deltaClass}`}>
          <span>{deltaArrow}</span>
          <span>Delta {deltaDisplay}</span>
        </div>
      ) : null}
      <p className="text-xs text-zinc-400 mt-2">{description}</p>
      {threshold && <p className="text-xs text-zinc-500 mt-1">Threshold: {threshold}</p>}
    </article>
  );
}

interface MetricsGridProps {
  metrics: FairnessMetrics;
  domain: string;
  modelMetrics?: FairnessMetrics;
}

export function MetricsGrid({ metrics, domain, modelMetrics }: MetricsGridProps) {
  const activeMetrics = modelMetrics ?? metrics;
  const isFlagged = (key: string) => activeMetrics.flaggedMetrics.includes(key);

  const getSeverity = (key: string): Severity => {
    if (isFlagged(key)) return "fail";
    return "pass";
  };

  const buildDelta = (
    historical: number,
    model: number,
    direction: "higher" | "lower"
  ): { delta: number; deltaTone: "good" | "bad" | "neutral" } => {
    const delta = model - historical;
    if (Math.abs(delta) < 0.0001) {
      return { delta, deltaTone: "neutral" };
    }
    const improved = direction === "higher" ? delta > 0 : delta < 0;
    return { delta, deltaTone: improved ? "good" : "bad" };
  };

  const cards: MetricCardProps[] = [
    {
      label: "Disparate impact ratio",
      value: metrics.disparateImpactRatio,
      secondaryValue: modelMetrics?.disparateImpactRatio,
      primaryLabel: "Historical",
      secondaryLabel: "Model",
      ...(modelMetrics
        ? buildDelta(metrics.disparateImpactRatio, modelMetrics.disparateImpactRatio, "higher")
        : {}),
      description:
        "Ratio of favorable outcome rates between groups. Below 0.80 violates the 80% rule.",
      threshold: domain === "insurance" ? ">= 0.85" : ">= 0.80 (ECOA/EEOC rule)",
      severity: getSeverity("disparate_impact"),
      isFlagged: isFlagged("disparate_impact"),
    },
    {
      label: "Demographic parity difference",
      value: metrics.demographicParityDifference,
      secondaryValue: modelMetrics?.demographicParityDifference,
      primaryLabel: "Historical",
      secondaryLabel: "Model",
      ...(modelMetrics
        ? buildDelta(metrics.demographicParityDifference, modelMetrics.demographicParityDifference, "lower")
        : {}),
      description: "Absolute difference in approval rates between groups.",
      threshold: "<= 0.10",
      severity: getSeverity("demographic_parity"),
      isFlagged: isFlagged("demographic_parity"),
    },
    {
      label: "Equalized odds difference",
      value: metrics.equalizedOddsDifference,
      secondaryValue: modelMetrics?.equalizedOddsDifference,
      primaryLabel: "Historical",
      secondaryLabel: "Model",
      ...(modelMetrics
        ? buildDelta(metrics.equalizedOddsDifference, modelMetrics.equalizedOddsDifference, "lower")
        : {}),
      description: "Difference in true positive rates between groups.",
      threshold: "<= 0.10",
      severity: getSeverity("equalized_odds"),
      isFlagged: isFlagged("equalized_odds"),
    },
    {
      label: "Statistical parity difference",
      value: metrics.statisticalParityDifference,
      secondaryValue: modelMetrics?.statisticalParityDifference,
      primaryLabel: "Historical",
      secondaryLabel: "Model",
      ...(modelMetrics
        ? buildDelta(metrics.statisticalParityDifference, modelMetrics.statisticalParityDifference, "lower")
        : {}),
      description: "Signed difference in approval rates (positive = privileged group favored).",
      threshold: "≈ 0 is ideal",
      severity: Math.abs(metrics.statisticalParityDifference) > 0.1 ? "warning" : "pass",
      isFlagged: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="list" aria-label="Fairness metrics">
      {cards.map((card) => (
        <div key={card.label} role="listitem">
          <MetricCard {...card} />
        </div>
      ))}
    </div>
  );
}
