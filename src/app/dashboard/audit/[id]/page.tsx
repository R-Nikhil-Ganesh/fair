"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AuditReport } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AuditMetricsRow } from "@/components/audit/AuditMetricsRow";
import { ApprovalRatesChart } from "@/components/audit/ApprovalRatesChart";
import { AuditInsights } from "@/components/audit/AuditInsights";

export default function AuditResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      if (!params.id) return;
      try {
        const docRef = doc(db, "audits", params.id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setReport({ id: docSnap.id, ...docSnap.data() } as AuditReport);
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
  }, [params.id]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading audit results...</div>;
  }

  if (!report) {
    return <div className="p-8 text-center text-muted-foreground">Audit not found.</div>;
  }

  const hasFlag = report.disparities.some(d => d.flagged);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl m-0 leading-none">{report.datasetName}</h1>
              {hasFlag ? (
                <StatusBadge label="Action Required" variant="warning" />
              ) : (
                <StatusBadge label="Passed" variant="pass" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Audit ID: {report.id} • Evaluated on {new Date(report.date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button className="btn btn-secondary flex items-center gap-2">
          <Download size={16} /> Export PDF
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-6">
          <AuditMetricsRow
            protectedAttribute={report.protectedAttribute}
            totalRecords={report.totalRecords}
            overallApprovalRate={report.overallApprovalRate}
          />

          <ApprovalRatesChart disparities={report.disparities} />
        </div>

        <AuditInsights report={report} />
      </div>
    </div>
  );
}
