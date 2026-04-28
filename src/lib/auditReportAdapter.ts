import type { AuditReport, AuditStatus, DisparityInfo } from "@/lib/types";

type FirestoreTimestampLike = {
  toDate: () => Date;
};

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "object" && value !== null) {
    const maybeTimestamp = value as Partial<FirestoreTimestampLike>;
    if (typeof maybeTimestamp.toDate === "function") {
      return maybeTimestamp.toDate();
    }

    const seconds = (value as { seconds?: unknown }).seconds;
    if (typeof seconds === "number" && Number.isFinite(seconds)) {
      return new Date(seconds * 1000);
    }
  }

  return null;
}

function toIsoDate(value: unknown): string {
  const parsed = toDate(value);
  return parsed ? parsed.toISOString() : new Date().toISOString();
}

function normalizeStatus(status: unknown): AuditStatus {
  if (status === "complete" || status === "completed") return "completed";
  if (status === "error" || status === "failed") return "failed";
  return "processing";
}

function buildDisparities(raw: Record<string, unknown>): DisparityInfo[] {
  if (Array.isArray(raw.disparities)) {
    return raw.disparities
      .filter((item): item is DisparityInfo => typeof item === "object" && item !== null)
      .map((item) => ({
        group: String(item.group ?? "Unknown"),
        approvalRate: asNumber(item.approvalRate),
        disparityRatio: asNumber(item.disparityRatio, 1),
        flagged: Boolean(item.flagged),
      }));
  }

  const fairnessMetrics = (raw.results as { fairnessMetrics?: Record<string, unknown> } | undefined)
    ?.fairnessMetrics;
  const rates =
    (fairnessMetrics?.groupApprovalRates as Record<string, unknown> | undefined) ??
    (fairnessMetrics?.group_approval_rates as Record<string, unknown> | undefined);
  if (!rates || Object.keys(rates).length === 0) {
    return [];
  }

  const numericRates = Object.entries(rates)
    .map(([group, rate]) => ({ group, rate: asNumber(rate) }))
    .filter((entry) => entry.rate > 0 || entry.rate === 0);

  if (numericRates.length === 0) {
    return [];
  }

  const privilegedRate = Math.max(...numericRates.map((entry) => entry.rate), 0.0001);
  const threshold = asNumber(
    (
      (fairnessMetrics?.thresholdsUsed as Record<string, unknown> | undefined) ??
      (fairnessMetrics?.thresholds_used as Record<string, unknown> | undefined)
    )?.disparate_impact_ratio_min,
    0.8,
  );

  return numericRates.map((entry) => {
    const ratio = privilegedRate > 0 ? entry.rate / privilegedRate : 1;
    return {
      group: entry.group,
      approvalRate: entry.rate,
      disparityRatio: Number(ratio.toFixed(4)),
      flagged: ratio < threshold,
    };
  });
}

function deriveOverallApprovalRate(raw: Record<string, unknown>): number {
  if (typeof raw.overallApprovalRate === "number") {
    return raw.overallApprovalRate;
  }

  const fairnessMetrics = (raw.results as { fairnessMetrics?: Record<string, unknown> } | undefined)
    ?.fairnessMetrics;
  const rates =
    (fairnessMetrics?.groupApprovalRates as Record<string, unknown> | undefined) ??
    (fairnessMetrics?.group_approval_rates as Record<string, unknown> | undefined);
  const counts =
    (fairnessMetrics?.groupCounts as Record<string, unknown> | undefined) ??
    (fairnessMetrics?.group_counts as Record<string, unknown> | undefined);

  if (!rates || Object.keys(rates).length === 0) return 0;

  const rateEntries = Object.entries(rates).map(([group, rate]) => ({
    group,
    rate: asNumber(rate),
  }));

  if (!counts || Object.keys(counts).length === 0) {
    const avg = rateEntries.reduce((sum, entry) => sum + entry.rate, 0) / rateEntries.length;
    return Number(avg.toFixed(4));
  }

  let weightedSum = 0;
  let total = 0;

  for (const entry of rateEntries) {
    const count = asNumber(counts[entry.group]);
    weightedSum += entry.rate * count;
    total += count;
  }

  if (total <= 0) return 0;
  return Number((weightedSum / total).toFixed(4));
}

function deriveRecommendations(raw: Record<string, unknown>): string[] {
  if (Array.isArray(raw.recommendations)) {
    return raw.recommendations.map((item) => String(item));
  }

  const mitigationPlan = (
    (raw.results as { geminiOutput?: { mitigationPlan?: Array<{ title?: unknown; description?: unknown }> } } | undefined)
      ?.geminiOutput?.mitigationPlan
  ) ?? [];

  return mitigationPlan.map((step) => {
    const title = String(step.title ?? "Recommendation");
    const description = String(step.description ?? "").trim();
    return description ? `${title}: ${description}` : title;
  });
}

function deriveDatasetName(raw: Record<string, unknown>, fallbackId: string): string {
  if (typeof raw.datasetName === "string" && raw.datasetName.trim()) return raw.datasetName;
  if (typeof raw.fileName === "string" && raw.fileName.trim()) return raw.fileName;
  if (typeof raw.sampleDatasetKey === "string" && raw.sampleDatasetKey.trim()) {
    return raw.sampleDatasetKey;
  }

  if (typeof raw.csvPath === "string" && raw.csvPath.trim()) {
    const filename = raw.csvPath.split("/").pop();
    return filename || fallbackId;
  }

  return fallbackId;
}

function normalizeFairnessMetrics(raw: Record<string, unknown> | undefined) {
  if (!raw) return undefined;
  const rates =
    (raw.groupApprovalRates as Record<string, unknown> | undefined) ??
    (raw.group_approval_rates as Record<string, unknown> | undefined) ??
    {};
  const counts =
    (raw.groupCounts as Record<string, unknown> | undefined) ??
    (raw.group_counts as Record<string, unknown> | undefined) ??
    {};
  const thresholds =
    (raw.thresholdsUsed as Record<string, unknown> | undefined) ??
    (raw.thresholds_used as Record<string, unknown> | undefined) ??
    {};

  return {
    demographicParityDifference: asNumber(
      raw.demographicParityDifference ?? raw.demographic_parity_difference
    ),
    equalizedOddsDifference: asNumber(
      raw.equalizedOddsDifference ?? raw.equalized_odds_difference
    ),
    averageOddsDifference: asNumber(
      raw.averageOddsDifference ?? raw.average_odds_difference
    ),
    disparateImpactRatio: asNumber(
      raw.disparateImpactRatio ?? raw.disparate_impact_ratio
    ),
    statisticalParityDifference: asNumber(
      raw.statisticalParityDifference ?? raw.statistical_parity_difference
    ),
    groupApprovalRates: Object.fromEntries(
      Object.entries(rates).map(([key, value]) => [key, asNumber(value)])
    ),
    flaggedMetrics:
      (raw.flaggedMetrics as string[] | undefined) ??
      (raw.flagged_metrics as string[] | undefined) ??
      [],
    overallStatus:
      (raw.overallStatus as "pass" | "warning" | "fail" | undefined) ??
      (raw.overall_status as "pass" | "warning" | "fail" | undefined) ??
      "pass",
    rowCount: asNumber(raw.rowCount ?? raw.row_count),
    groupCounts: Object.fromEntries(
      Object.entries(counts).map(([key, value]) => [key, asNumber(value)])
    ),
    thresholdsUsed: Object.fromEntries(
      Object.entries(thresholds).map(([key, value]) => [key, asNumber(value)])
    ),
  };
}

function normalizeModelAudit(raw: Record<string, unknown> | undefined) {
  if (!raw) return undefined;

  const historicalRaw = raw.historical_fairness as Record<string, unknown> | undefined;
  const modelRaw = raw.model_fairness as Record<string, unknown> | undefined;
  const historicalMetrics = normalizeFairnessMetrics(historicalRaw);
  const modelMetrics = normalizeFairnessMetrics(modelRaw);

  if (!historicalMetrics || !modelMetrics) {
    return undefined;
  }

  return {
    model_type: String(raw.model_type ?? ""),
    model_accuracy: asNumber(raw.model_accuracy, -1),
    historical_fairness: historicalMetrics,
    model_fairness: modelMetrics,
    counterfactual_data: raw.counterfactual_data as AuditReport["modelAudit"]["counterfactual_data"],
  };
}

export function mapFirestoreAuditToReport(id: string, rawData: Record<string, unknown>): AuditReport {
  const status = normalizeStatus(rawData.status);
  const disparities = buildDisparities(rawData);
  const modelAuditRaw =
    (rawData.results as { modelAudit?: Record<string, unknown> } | undefined)?.modelAudit;
  const modelAudit = normalizeModelAudit(modelAuditRaw);
  const totalRecords =
    asNumber(rawData.totalRecords) ||
    asNumber((rawData.results as { rowCount?: unknown } | undefined)?.rowCount) ||
    asNumber(
      (
        (rawData.results as { fairnessMetrics?: { rowCount?: unknown; row_count?: unknown } } | undefined)
          ?.fairnessMetrics?.rowCount ??
        (rawData.results as { fairnessMetrics?: { rowCount?: unknown; row_count?: unknown } } | undefined)
          ?.fairnessMetrics?.row_count
      ),
    );

  return {
    id,
    userId: typeof rawData.userId === "string" ? rawData.userId : undefined,
    date: toIsoDate(rawData.date ?? rawData.completedAt ?? rawData.updatedAt ?? rawData.createdAt),
    datasetName: deriveDatasetName(rawData, id),
    totalRecords,
    protectedAttribute: String(rawData.protectedAttribute ?? ""),
    targetColumn: String(rawData.targetColumn ?? ""),
    overallApprovalRate: deriveOverallApprovalRate(rawData),
    disparities,
    status,
    modelAudit: rawData.modelAudit || undefined,
    geminiSummary:
      (typeof rawData.geminiSummary === "string" && rawData.geminiSummary) ||
      ((rawData.results as { geminiOutput?: { biasNarrative?: unknown } } | undefined)
        ?.geminiOutput?.biasNarrative as string | undefined),
    recommendations: deriveRecommendations(rawData),
  };
}