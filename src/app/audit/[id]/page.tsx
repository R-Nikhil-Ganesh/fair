"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getAuditResults } from "@/lib/ai";
import { logAuditEvent } from "@/lib/firebaseAnalytics";
import { MetricsGrid } from "@/components/MetricCard";
import { ApprovalRateChart } from "@/components/BiasChart";
import { MitigationChecklist } from "@/components/MitigationChecklist";
import { PdfExportButton } from "@/components/PdfExportButton";
import type { AuditDocument } from "@/lib/types";

export default function AuditDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [audit, setAudit] = useState<AuditDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function loadAudit() {
      if (!user || !params?.id) return;

      setLoading(true);
      setError("");

      try {
        const doc = await getAuditResults(user.uid, params.id);
        if (!doc) {
          setError("Audit not found.");
          return;
        }

        setAudit(doc);
        logAuditEvent("audit_detail_viewed", {
          auditId: doc.auditId,
          domain: doc.domain,
          status: doc.status,
        });
      } catch (e) {
        setError("Failed to load audit details.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadAudit();
  }, [user, params?.id]);

  if (!user) return null;

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading audit results...</div>;
  }

  if (error || !audit) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-red-700">{error || "Audit not found."}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 text-sm text-blue-700 underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50" id="main-content">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Audit results</h1>
              <p className="text-sm text-gray-500">Audit ID: {audit.auditId}</p>
            </div>
          </div>
        </div>

        {audit?.results && (
          <>
            <div
              className={`flex items-center justify-between p-4 rounded-xl mb-6 ${
                audit.results.fairnessMetrics.overallStatus === "fail"
                  ? "bg-red-50 border border-red-200"
                  : audit.results.fairnessMetrics.overallStatus === "warning"
                    ? "bg-amber-50 border border-amber-200"
                    : "bg-green-50 border border-green-200"
              }`}
            >
              <div>
                <span className="font-semibold text-gray-900 capitalize">
                  {audit.results.fairnessMetrics.overallStatus === "fail"
                    ? "Critical bias detected"
                    : audit.results.fairnessMetrics.overallStatus === "warning"
                      ? "Bias warning"
                      : "No significant bias detected"}
                </span>
                <p className="text-sm text-gray-600 mt-0.5">
                  {audit.results.geminiOutput.severitySummary}
                </p>
              </div>
              <PdfExportButton audit={audit} />
            </div>

            <section aria-labelledby="metrics-heading" className="mb-8">
              <h2 id="metrics-heading" className="text-base font-semibold mb-4">
                Fairness metrics
              </h2>
              <MetricsGrid metrics={audit.results.fairnessMetrics} domain={audit.domain} />
            </section>

            <section
              aria-labelledby="chart-heading"
              className="mb-8 bg-white rounded-xl border border-gray-200 p-6"
            >
              <h2 id="chart-heading" className="text-base font-semibold mb-4">
                Approval rates by group
              </h2>
              <ApprovalRateChart
                metrics={audit.results.fairnessMetrics}
                protectedAttribute={audit.protectedAttribute}
              />
            </section>

            <section
              aria-labelledby="narrative-heading"
              className="mb-8 bg-white rounded-xl border border-gray-200 p-6"
            >
              <h2 id="narrative-heading" className="text-base font-semibold mb-4">
                What this means
              </h2>
              <p className="text-gray-700 leading-relaxed">{audit.results.geminiOutput.biasNarrative}</p>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <MitigationChecklist
                steps={audit.results.geminiOutput.mitigationPlan}
                auditId={audit.auditId}
              />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
