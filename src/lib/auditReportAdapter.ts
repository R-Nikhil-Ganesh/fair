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

export function mapFirestoreAuditToReport(id: string, rawData: Record<string, unknown>): AuditReport {
  const status = normalizeStatus(rawData.status);
  const disparities = buildDisparities(rawData);
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
    geminiSummary:
      (typeof rawData.geminiSummary === "string" && rawData.geminiSummary) ||
      ((rawData.results as { geminiOutput?: { biasNarrative?: unknown } } | undefined)
        ?.geminiOutput?.biasNarrative as string | undefined),
    recommendations: deriveRecommendations(rawData),
  };
}