"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { AuditDocument, AuditReport } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AuditMetricsRow } from "@/components/audit/AuditMetricsRow";
import { ApprovalRatesChart } from "@/components/audit/ApprovalRatesChart";
import { AuditInsights } from "@/components/audit/AuditInsights";
import { mapFirestoreAuditToReport } from "@/lib/auditReportAdapter";
import { PdfExportButton } from "@/components/PdfExportButton";

export default function AuditResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [report, setReport] = useState<AuditReport | null>(null);
  const [auditDoc, setAuditDoc] = useState<AuditDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      if (!params.id || !user) return;
      try {
        const docRef = doc(db, "audits", user.uid, "audits", params.id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const raw = docSnap.data() as Record<string, unknown>;
          setReport(mapFirestoreAuditToReport(docSnap.id, raw));
          setAuditDoc({ auditId: docSnap.id, ...(raw as Omit<AuditDocument, "auditId">) });
        } else {
          console.error("No such document!");
        }
      } catch (error) {
        console.error("Error fetching report:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [params.id, user]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#71717a" }}>
        Loading audit results…
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#71717a" }}>
        Audit not found.
      </div>
    );
  }

  const isProcessing = report.status === "processing";
  const isFailed = report.status === "failed";
  const hasFlag = report.disparities.some((d) => d.flagged);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "64rem", margin: "0 auto" }}>
      {/* ── Header card ── */}
      <div
        style={{
          borderRadius: "1rem",
          border: "1px solid #27272a",
          background: "#09090b",
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={() => router.back()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              border: "1px solid #27272a",
              background: "transparent",
              color: "#d4d4d8",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#f4f4f5", margin: 0 }}>
                {report.datasetName || "Audit Report"}
              </h1>
              {isProcessing ? (
                <StatusBadge label="Processing" variant="processing" />
              ) : isFailed ? (
                <StatusBadge label="Failed" variant="error" />
              ) : hasFlag ? (
                <StatusBadge label="Action Required" variant="warning" />
              ) : (
                <StatusBadge label="Passed" variant="pass" />
              )}
            </div>
            <p style={{ fontSize: "0.8rem", color: "#71717a", marginTop: "0.3rem" }}>
              Audit ID: {report.id} • Evaluated on {new Date(report.date).toLocaleDateString()}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#71717a", marginTop: "0.4rem" }}>
              <ShieldCheck size={13} style={{ color: "#60a5fa" }} />
              <span>Compliance-ready fairness summary and mitigation guidance</span>
            </div>
          </div>
        </div>
        {auditDoc ? (
          <PdfExportButton audit={auditDoc} />
        ) : (
          <button className="btn btn-secondary" disabled>Export PDF</button>
        )}
      </div>

      {/* ── Processing banner ── */}
      {isProcessing && (
        <div
          style={{
            borderRadius: "1rem",
            border: "1px solid rgba(245,158,11,0.4)",
            background: "rgba(245,158,11,0.08)",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "1rem",
          }}
        >
          <Loader2 size={16} className="animate-spin" style={{ color: "#fcd34d", marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 600, color: "#fde68a", fontSize: "0.9rem" }}>
              Audit is still processing in cloud workers
            </p>
            <p style={{ fontSize: "0.82rem", color: "#a1a1aa", marginTop: "0.25rem" }}>
              Metrics and narrative will appear as soon as Firestore receives results from the worker pipeline.
            </p>
          </div>
        </div>
      )}

      {/* ── Failed banner ── */}
      {isFailed && (
        <div
          style={{
            borderRadius: "1rem",
            border: "1px solid rgba(239,68,68,0.4)",
            background: "rgba(239,68,68,0.08)",
            padding: "1rem",
          }}
        >
          <p style={{ fontWeight: 600, color: "#fca5a5", fontSize: "0.9rem" }}>Audit failed before completion.</p>
          <p style={{ fontSize: "0.82rem", color: "#a1a1aa", marginTop: "0.25rem" }}>
            Use Settings → Cloud Diagnostics to verify backend dependencies.
          </p>
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <AuditMetricsRow
          protectedAttribute={report.protectedAttribute || "Pending"}
          totalRecords={report.totalRecords}
          overallApprovalRate={report.overallApprovalRate}
          isPending={isProcessing}
          modelAudit={report.modelAudit}
        />

        <ApprovalRatesChart report={report} />

        {/* ── Model Statistics (only when model was uploaded) ── */}
        {report.modelAudit && (
          <div style={{ background: "#09090b", border: "1px solid #27272a", borderRadius: "1rem", padding: "1.25rem" }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#52525b", marginBottom: "0.875rem" }}>
              Model Statistics
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
              {/* Accuracy */}
              {report.modelAudit.model_accuracy >= 0 && (
                <div style={{ background: "#111", border: "1px solid #27272a", borderRadius: "0.7rem", padding: "0.75rem" }}>
                  <div style={{ fontSize: "0.68rem", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em" }}>Model Accuracy</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f4f4f5", fontFamily: "monospace", marginTop: "0.25rem" }}>
                    {(report.modelAudit.model_accuracy * 100).toFixed(1)}%
                  </div>
                </div>
              )}
              {/* Model type */}
              {report.modelAudit.model_type && (
                <div style={{ background: "#111", border: "1px solid #27272a", borderRadius: "0.7rem", padding: "0.75rem" }}>
                  <div style={{ fontSize: "0.68rem", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em" }}>Model Type</div>
                  <div style={{ fontSize: "1rem", fontWeight: 600, color: "#60a5fa", marginTop: "0.25rem" }}>
                    {report.modelAudit.model_type.toUpperCase()}
                  </div>
                </div>
              )}
              {/* Prediction distribution */}
              {report.modelAudit.prediction_counts && Object.keys(report.modelAudit.prediction_counts).length > 0 && (
                <div style={{ background: "#111", border: "1px solid #27272a", borderRadius: "0.7rem", padding: "0.75rem" }}>
                  <div style={{ fontSize: "0.68rem", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>Predictions</div>
                  {Object.entries(report.modelAudit.prediction_counts).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.2rem" }}>
                      <span style={{ color: k === "1" ? "#6ee7b7" : "#fca5a5" }}>{k === "1" ? "Approved" : "Denied"}</span>
                      <span style={{ color: "#f4f4f5", fontFamily: "monospace" }}>{v.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Feature count */}
              {report.modelAudit.feature_columns && (
                <div style={{ background: "#111", border: "1px solid #27272a", borderRadius: "0.7rem", padding: "0.75rem" }}>
                  <div style={{ fontSize: "0.68rem", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em" }}>Features Used</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f4f4f5", fontFamily: "monospace", marginTop: "0.25rem" }}>
                    {report.modelAudit.feature_columns.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Insights strip */}
        <div
          style={{
            borderRadius: "1rem",
            border: "1px solid #27272a",
            background: "#09090b",
            padding: "1.25rem",
          }}
        >
          <p
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#52525b",
              marginBottom: "0.875rem",
            }}
          >
            Insights &amp; Actions
          </p>
          <AuditInsights report={report} />
        </div>
      </div>
    </div>
  );
}
