import type { FairnessMetrics } from "@/lib/types";

type Severity = "pass" | "warning" | "fail";

interface MetricCardProps {
  label: string;
  value: number;
  description: string;
  threshold?: string;
  severity: Severity;
  isPercentage?: boolean;
  isFlagged: boolean;
}

const SEVERITY_STYLES: Record<Severity, { badge: string; border: string; icon: string }> = {
  pass: {
    badge: "bg-green-100 text-green-800",
    border: "border-green-200",
    icon: "✓",
  },
  warning: {
    badge: "bg-amber-100 text-amber-800",
    border: "border-amber-200",
    icon: "!",
  },
  fail: {
    badge: "bg-red-100 text-red-800",
    border: "border-red-300",
    icon: "✗",
  },
};

export function MetricCard({
  label,
  value,
  description,
  threshold,
  severity,
  isPercentage,
  isFlagged,
}: MetricCardProps) {
  const styles = SEVERITY_STYLES[severity];
  const displayValue = isPercentage ? `${(value * 100).toFixed(1)}%` : value.toFixed(3);

  return (
    <article
      className={`rounded-xl border p-4 ${styles.border} ${isFlagged ? "ring-2 ring-offset-1 ring-red-400" : ""}`}
      aria-label={`${label}: ${displayValue}, status ${severity}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles.badge}`}
          aria-label={`Status: ${severity}`}
        >
          {styles.icon} {severity}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{displayValue}</div>
      <p className="text-xs text-gray-500">{description}</p>
      {threshold && <p className="text-xs text-gray-400 mt-1">Threshold: {threshold}</p>}
    </article>
  );
}

interface MetricsGridProps {
  metrics: FairnessMetrics;
  domain: string;
}

export function MetricsGrid({ metrics, domain }: MetricsGridProps) {
  const isFlagged = (key: string) => metrics.flaggedMetrics.includes(key);

  const getSeverity = (key: string): Severity => {
    if (isFlagged(key)) return "fail";
    return "pass";
  };

  const cards: MetricCardProps[] = [
    {
      label: "Disparate impact ratio",
      value: metrics.disparateImpactRatio,
      description:
        "Ratio of favorable outcome rates between groups. Below 0.80 violates the 80% rule.",
      threshold: domain === "insurance" ? ">= 0.85" : ">= 0.80 (ECOA/EEOC rule)",
      severity: getSeverity("disparate_impact"),
      isFlagged: isFlagged("disparate_impact"),
    },
    {
      label: "Demographic parity difference",
      value: metrics.demographicParityDifference,
      description: "Absolute difference in approval rates between groups.",
      threshold: "<= 0.10",
      severity: getSeverity("demographic_parity"),
      isFlagged: isFlagged("demographic_parity"),
    },
    {
      label: "Equalized odds difference",
      value: metrics.equalizedOddsDifference,
      description: "Difference in true positive rates between groups.",
      threshold: "<= 0.10",
      severity: getSeverity("equalized_odds"),
      isFlagged: isFlagged("equalized_odds"),
    },
    {
      label: "Statistical parity difference",
      value: metrics.statisticalParityDifference,
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
