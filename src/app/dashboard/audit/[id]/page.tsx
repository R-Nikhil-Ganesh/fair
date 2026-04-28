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
    return <div className="p-8 text-center text-zinc-500">Loading audit results...</div>;
  }

  if (!report) {
    return <div className="p-8 text-center text-zinc-500">Audit not found.</div>;
  }

  const isProcessing = report.status === "processing";
  const isFailed = report.status === "failed";
  const hasFlag = report.disparities.some(d => d.flagged);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto text-zinc-100">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-300 border border-zinc-800"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl m-0 leading-none tracking-tight">
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
              <p className="text-sm text-zinc-500 mt-2">
                Audit ID: {report.id} • Evaluated on {new Date(report.date).toLocaleDateString()}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <ShieldCheck size={14} className="text-blue-400" />
                <span>Compliance-ready fairness summary and mitigation guidance</span>
              </div>
            </div>
          </div>
          {auditDoc ? (
            <PdfExportButton audit={auditDoc} />
          ) : (
            <button className="btn btn-secondary flex items-center gap-2 bg-zinc-900 border-zinc-800 shadow-sm" disabled>
              Export PDF
            </button>
          )}
        </div>
      </div>

      {isProcessing ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3 p-4">
          <Loader2 size={18} className="animate-spin mt-0.5 text-amber-300" />
          <div>
            <p className="font-semibold text-amber-200">Audit is still processing in cloud workers</p>
            <p className="text-sm text-zinc-400 mt-1">
              Metrics and narrative will appear as soon as Firestore receives results from the worker pipeline.
            </p>
          </div>
        </div>
      ) : null}

      {isFailed ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <p className="font-semibold text-red-300">Audit failed before completion.</p>
          <p className="text-sm text-zinc-400 mt-1">
            Use Settings → Cloud Diagnostics to verify backend dependencies.
          </p>
        </div>
      ) : null}

      <div className="grid md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 flex flex-col gap-6">
          <AuditMetricsRow
            protectedAttribute={report.protectedAttribute || "Pending"}
            totalRecords={report.totalRecords}
            overallApprovalRate={report.overallApprovalRate}
            isPending={isProcessing}
            modelAudit={report.modelAudit}
          />

          <ApprovalRatesChart report={report} />
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              Command Center
            </div>
            <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
              Review narrative insights, counterfactual logs, and action plans before exporting.
            </p>
          </div>
          <AuditInsights report={report} />
        </div>
      </div>
    </div>
  );
}
