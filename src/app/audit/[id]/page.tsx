"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, TerminalSquare } from "lucide-react";
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
      <div className="p-8 text-center bg-zinc-950 min-h-screen">
        <p className="text-sm text-red-300">{error || "Audit not found."}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 text-sm text-blue-400 underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const modelAudit = audit.results?.modelAudit;
  const historicalMetrics = modelAudit?.historical_fairness ?? audit.results?.fairnessMetrics;
  const modelMetrics = modelAudit?.model_fairness;
  const overallStatus = (modelMetrics ?? audit.results?.fairnessMetrics)?.overallStatus;
  const counterfactualNarrative = modelAudit?.counterfactual_data?.narrative?.trim();

  const renderNarrative = (narrative: string) => {
    const parts = narrative.split(/(\bApproved\b|\bDenied\b)/g);
    return parts.map((part, index) => {
      if (part === "Approved") {
        return (
          <span key={`approved-${index}`} className="text-emerald-300">
            {part}
          </span>
        );
      }
      if (part === "Denied") {
        return (
          <span key={`denied-${index}`} className="text-red-300">
            {part}
          </span>
        );
      }
      return <span key={`text-${index}`}>{part}</span>;
    });
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100" id="main-content">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-zinc-900 border border-zinc-800"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-semibold">Audit results</h1>
              <p className="text-sm text-zinc-400">Audit ID: {audit.auditId}</p>
            </div>
          </div>
          <PdfExportButton audit={audit} />
        </div>

        {audit?.results && historicalMetrics && (
          <>
            <div
              className={`flex items-center justify-between p-4 rounded-xl mb-6 border ${
                overallStatus === "fail"
                  ? "bg-red-500/10 border-red-500/30"
                  : overallStatus === "warning"
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-emerald-500/10 border-emerald-500/30"
              }`}
            >
              <div>
                <span className="font-semibold capitalize text-zinc-100">
                  {overallStatus === "fail"
                    ? "Critical bias detected"
                    : overallStatus === "warning"
                      ? "Bias warning"
                      : "No significant bias detected"}
                </span>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {audit.results.geminiOutput.severitySummary}
                </p>
              </div>
            </div>

            <section aria-labelledby="metrics-heading" className="mb-10">
              <h2 id="metrics-heading" className="text-base font-semibold mb-4">
                Fairness metrics {modelMetrics ? "(Historical vs Model)" : ""}
              </h2>
              <MetricsGrid
                metrics={historicalMetrics}
                modelMetrics={modelMetrics}
                domain={audit.domain}
              />
            </section>

            <section
              aria-labelledby="chart-heading"
              className="mb-10 bg-zinc-900 rounded-xl border border-zinc-800 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 id="chart-heading" className="text-base font-semibold">
                  Approval rates by group
                </h2>
                {modelMetrics ? (
                  <span className="text-xs text-zinc-500">Grouped: Historical vs Model</span>
                ) : null}
              </div>
              <ApprovalRateChart
                metrics={historicalMetrics}
                modelMetrics={modelMetrics}
                protectedAttribute={audit.protectedAttribute}
              />
            </section>

            {counterfactualNarrative ? (
              <section className="mb-10 bg-zinc-950 rounded-xl border border-zinc-800 p-6 shadow-[0_0_0_1px_rgba(39,39,42,0.6)]">
                <div className="flex items-center gap-2 mb-4">
                  <TerminalSquare size={18} className="text-blue-400" />
                  <h2 className="text-base font-semibold">Counterfactual Interrogation</h2>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm text-zinc-200 leading-relaxed">
                  {renderNarrative(counterfactualNarrative)}
                </div>
              </section>
            ) : null}

            <section
              aria-labelledby="narrative-heading"
              className="mb-10 bg-zinc-900 rounded-xl border border-zinc-800 p-6"
            >
              <h2 id="narrative-heading" className="text-base font-semibold mb-4">
                What this means
              </h2>
              <p className="text-zinc-300 leading-relaxed">{audit.results.geminiOutput.biasNarrative}</p>
            </section>

            <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
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
