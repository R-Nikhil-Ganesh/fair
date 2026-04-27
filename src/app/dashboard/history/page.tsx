"use client";

import { useState, useEffect } from "react";
import { Filter, Search } from "lucide-react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { AuditReport } from "@/lib/types";
import { PageTitle } from "@/components/ui/PageTitle";
import { AuditHistoryTable } from "@/components/audit/AuditHistoryTable";
import { toAuditViewModel } from "@/components/audit/auditViewModel";
import { mapFirestoreAuditToReport } from "@/lib/auditReportAdapter";

export default function HistoryPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [audits, setAudits] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      try {
        const auditsRef = collection(db, "audits", user.uid, "audits");
        const q = query(auditsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const fetchedAudits = snapshot.docs.map((doc) =>
          mapFirestoreAuditToReport(doc.id, doc.data() as Record<string, unknown>)
        );
        setAudits(fetchedAudits);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [user]);

  const filteredAudits = audits.filter(audit => 
    audit.datasetName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    audit.protectedAttribute.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const historyView = filteredAudits.map(toAuditViewModel);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <PageTitle
        title="Audit History"
        subtitle="View, search, and review previous fairness evaluations."
      />

      <div className="card flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Search by dataset name or attribute..." 
              className="form-input w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary flex items-center gap-2">
            <Filter size={16} /> Filter
          </button>
        </div>

        <AuditHistoryTable audits={historyView} loading={loading} />
      </div>
    </div>
  );
}
