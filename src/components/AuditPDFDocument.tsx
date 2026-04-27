import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { AuditDocument } from "@/lib/types";

function readNumber(source: Record<string, unknown> | undefined, ...keys: string[]): number | null {
  if (!source) return null;

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function formatMetric(value: number | null, digits = 3): string {
  if (value === null) return "--";
  return value.toFixed(digits);
}

function readString(source: Record<string, unknown> | undefined, ...keys: string[]): string {
  if (!source) return "";

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "";
}

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 10, color: "#1f2937" },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#1e3a5f", marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#6b7280" },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 4,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  metricLabel: { color: "#6b7280", flex: 1 },
  metricValue: { fontFamily: "Helvetica-Bold", width: 80, textAlign: "right" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 9, width: 60, textAlign: "center" },
  narrative: { lineHeight: 1.6, color: "#374151" },
  mitigationItem: { marginBottom: 10, paddingLeft: 12 },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function AuditPDFDoc({ audit }: { audit: AuditDocument }) {
  const r = audit.results;
  const m = r?.fairnessMetrics as Record<string, unknown> | undefined;
  const g = r?.geminiOutput;

  const disparateImpactRatio = readNumber(m, "disparateImpactRatio", "disparate_impact_ratio");
  const demographicParityDifference = readNumber(
    m,
    "demographicParityDifference",
    "demographic_parity_difference"
  );
  const equalizedOddsDifference = readNumber(m, "equalizedOddsDifference", "equalized_odds_difference");
  const statisticalParityDifference = readNumber(
    m,
    "statisticalParityDifference",
    "statistical_parity_difference"
  );
  const overallStatus = readString(m, "overallStatus", "overall_status");

  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document title={`FairLens Audit Report - ${audit.domain}`} author="FairLens">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>FairLens Bias Audit Report</Text>
          <Text style={styles.subtitle}>
            Domain: {audit.domain} - Protected attribute: {audit.protectedAttribute} - {now}
          </Text>
        </View>

        {g && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Executive summary</Text>
            <Text style={styles.narrative}>{g.severitySummary}</Text>
          </View>
        )}

        {m && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fairness metrics</Text>
            {[
              ["Disparate impact ratio", formatMetric(disparateImpactRatio)],
              ["Demographic parity difference", formatMetric(demographicParityDifference)],
              ["Equalized odds difference", formatMetric(equalizedOddsDifference)],
              ["Statistical parity difference", formatMetric(statisticalParityDifference)],
            ].map(([label, value]) => (
              <View key={label} style={styles.metricRow}>
                <Text style={styles.metricLabel}>{label}</Text>
                <Text style={styles.metricValue}>{value}</Text>
              </View>
            ))}
            <View style={{ ...styles.metricRow, marginTop: 8 }}>
              <Text style={styles.metricLabel}>Overall status</Text>
              <Text
                style={{
                  ...styles.badge,
                  backgroundColor:
                    overallStatus === "fail"
                      ? "#fef2f2"
                      : overallStatus === "warning"
                        ? "#fffbeb"
                        : "#f0fdf4",
                  color:
                    overallStatus === "fail"
                      ? "#b91c1c"
                      : overallStatus === "warning"
                        ? "#92400e"
                        : "#166534",
                }}
              >
                {(overallStatus || "unknown").toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {g?.biasNarrative && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bias analysis</Text>
            <Text style={styles.narrative}>{g.biasNarrative}</Text>
          </View>
        )}

        {g?.mitigationPlan && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommended actions</Text>
            {g.mitigationPlan.map((step) => (
              <View key={step.rank} style={styles.mitigationItem}>
                <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
                  {step.rank}. {step.title} [{step.difficulty} effort]
                </Text>
                <Text style={{ color: "#6b7280" }}>{step.description}</Text>
                {step.regulatoryReference && (
                  <Text style={{ color: "#2563eb", marginTop: 2 }}>
                    Regulatory reference: {step.regulatoryReference}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={{ color: "#9ca3af", fontSize: 9 }}>Generated by FairLens - fairlens.app</Text>
          <Text
            style={{ color: "#9ca3af", fontSize: 9 }}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function generateAuditPDF(audit: AuditDocument): Promise<Blob> {
  return await pdf(<AuditPDFDoc audit={audit} />).toBlob();
}
