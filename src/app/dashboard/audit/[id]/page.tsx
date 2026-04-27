"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { AuditReport } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AuditMetricsRow } from "@/components/audit/AuditMetricsRow";
import { ApprovalRatesChart } from "@/components/audit/ApprovalRatesChart";
import { AuditInsights } from "@/components/audit/AuditInsights";
import { mapFirestoreAuditToReport } from "@/lib/auditReportAdapter";

export default function AuditResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      if (!params.id || !user) return;
      try {
        const docRef = doc(db, "audits", user.uid, "audits", params.id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setReport(mapFirestoreAuditToReport(docSnap.id, docSnap.data() as Record<string, unknown>));
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
    return <div className="p-8 text-center text-muted-foreground">Loading audit results...</div>;
  }

  if (!report) {
    return <div className="p-8 text-center text-muted-foreground">Audit not found.</div>;
  }

  const isProcessing = report.status === "processing";
  const isFailed = report.status === "failed";
  const hasFlag = report.disparities.some(d => d.flagged);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white via-blue-50/40 to-emerald-50/40 p-6 shadow-sm">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-100/70 blur-2xl" aria-hidden />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-emerald-100/70 blur-2xl" aria-hidden />
        <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/80 rounded-full transition-colors text-muted-foreground border border-border/70">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl m-0 leading-none tracking-tight">{report.datasetName || "Audit Report"}</h1>
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
            <p className="text-sm text-muted-foreground mt-2">
              Audit ID: {report.id} • Evaluated on {new Date(report.date).toLocaleDateString()}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} className="text-primary" />
              <span>Compliance-ready fairness summary and mitigation guidance</span>
            </div>
          </div>
        </div>
        <button className="btn btn-secondary flex items-center gap-2 bg-white/90 border-border shadow-sm" disabled={isProcessing || isFailed}>
          <Download size={16} /> Export PDF
        </button>
      </div>
      </div>

      {isProcessing ? (
        <div className="card border border-warning/40 bg-gradient-to-r from-amber-50 to-yellow-50 flex items-start gap-3">
          <Loader2 size={18} className="animate-spin mt-0.5" />
          <div>
            <p className="font-semibold">Audit is still processing in cloud workers</p>
            <p className="text-sm text-muted-foreground mt-1">
              Metrics and narrative will appear as soon as Firestore receives results from the worker pipeline.
            </p>
          </div>
        </div>
      ) : null}

      {isFailed ? (
        <div className="card border border-destructive/40 bg-gradient-to-r from-red-50 to-rose-50">
          <p className="font-semibold text-destructive">Audit failed before completion.</p>
          <p className="text-sm text-muted-foreground mt-1">
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
          />

          <ApprovalRatesChart disparities={report.disparities} />
        </div>

        <div className="space-y-6">
          <div className="card p-4 bg-gradient-to-br from-slate-50 to-white border-border/80">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles size={14} className="text-primary" />
              Audit Snapshot
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Review narrative insights, mitigation steps, and group-level outcomes before exporting.
            </p>
          </div>
          <AuditInsights report={report} />
        </div>
      </div>
    </div>
  );
}
