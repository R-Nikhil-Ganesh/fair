"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Filter, AlertTriangle, CheckCircle2 } from "lucide-react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { AuditReport } from "@/lib/types";

export default function HistoryPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [audits, setAudits] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      try {
        const auditsRef = collection(db, "audits");
        const q = query(
          auditsRef, 
          where("userId", "==", user.uid),
          orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        const fetchedAudits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditReport));
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

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl mb-1">Audit History</h1>
          <p className="text-muted-foreground">View and search all previous fairness evaluations.</p>
        </div>
      </div>

      <div className="card flex flex-col gap-4">
        {/* Toolbar */}
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

        {/* Table */}
        <div className="table-container border rounded-lg border-border">
          <table>
            <thead className="bg-muted">
              <tr>
                <th>Dataset Name</th>
                <th>Protected Attribute</th>
                <th>Evaluated On</th>
                <th>Result</th>
                <th>Records</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading history...
                  </td>
                </tr>
              ) : filteredAudits.length > 0 ? (
                filteredAudits.map((audit) => {
                  const hasFlag = audit.disparities.some(d => d.flagged);
                  return (
                    <tr key={audit.id}>
                      <td className="font-medium">{audit.datasetName}</td>
                      <td>{audit.protectedAttribute}</td>
                      <td className="text-muted-foreground">{new Date(audit.date).toLocaleDateString()}</td>
                      <td>
                        {audit.status === 'processing' ? (
                          <span className="badge badge-warning">Processing</span>
                        ) : hasFlag ? (
                          <span className="badge badge-destructive flex items-center gap-1 w-max">
                            <AlertTriangle size={12} /> Flagged
                          </span>
                        ) : (
                          <span className="badge badge-success flex items-center gap-1 w-max">
                            <CheckCircle2 size={12} /> Passed
                          </span>
                        )}
                      </td>
                      <td className="text-muted-foreground">{audit.totalRecords.toLocaleString()}</td>
                      <td className="text-right">
                        <Link href={`/dashboard/audit/${audit.id}`} className="text-primary font-medium hover:underline text-sm">
                          View Report
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audits found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
