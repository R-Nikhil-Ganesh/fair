"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { AuditReport } from "@/lib/types";
import { ActionCenter } from "@/components/dashboard/ActionCenter";
import { OverviewStats } from "@/components/dashboard/OverviewStats";
import { RecentAuditsTable } from "@/components/dashboard/RecentAuditsTable";
import { toAuditViewModel } from "@/components/audit/auditViewModel";
import { PageTitle } from "@/components/ui/PageTitle";
import { mapFirestoreAuditToReport } from "@/lib/auditReportAdapter";

export default function DashboardOverview() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAudits() {
      if (!user) return;
      try {
        const auditsRef = collection(db, "audits", user.uid, "audits");
        const q = query(auditsRef, orderBy("createdAt", "desc"), limit(10));
        const snapshot = await getDocs(q);
        const fetchedAudits = snapshot.docs.map((doc) =>
          mapFirestoreAuditToReport(doc.id, doc.data() as Record<string, unknown>)
        );
        setAudits(fetchedAudits);
      } catch (error) {
        console.error("Error fetching audits:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAudits();
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
  }

  const completedAudits = audits.filter((audit) => audit.status === "completed");
  const viewModels = audits.map(toAuditViewModel);
  const flaggedAudits = viewModels.filter((audit) => audit.status === "completed" && audit.hasFlag);
  
  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={`Welcome back, ${user?.displayName?.split(" ")[0] || "Compliance Officer"}`}
        subtitle="Here is the latest fairness status of your models."
      />

      <OverviewStats
        totalAudits={audits.length}
        flaggedAudits={flaggedAudits.length}
        clearAudits={completedAudits.length - flaggedAudits.length}
      />

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <RecentAuditsTable audits={viewModels} />
        </div>
        <ActionCenter flaggedAudits={flaggedAudits} />
      </div>
    </div>
  );
}
