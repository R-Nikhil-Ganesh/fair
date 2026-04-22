"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, AlertTriangle, CheckCircle2, FileText, Activity } from "lucide-react";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { AuditReport } from "@/lib/types";

export default function DashboardOverview() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAudits() {
      if (!user) return;
      try {
        const auditsRef = collection(db, "audits");
        const q = query(
          auditsRef, 
          where("userId", "==", user.uid),
          orderBy("date", "desc"),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const fetchedAudits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditReport));
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

  const completedAudits = audits.filter(a => a.status === 'completed');
  const flaggedAudits = completedAudits.filter(a => a.disparities.some(d => d.flagged));
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl mb-1">Welcome back, {user?.displayName?.split(' ')[0] || "Compliance Officer"}</h1>
        <p className="text-muted-foreground">Here is the latest fairness status of your models.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Total Audits</span>
            <FileText size={18} />
          </div>
          <span className="text-3xl font-bold">{audits.length}</span>
        </div>
        
        <div className="card flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Flagged Issues</span>
            <AlertTriangle size={18} className="text-destructive" />
          </div>
          <span className="text-3xl font-bold text-destructive">{flaggedAudits.length}</span>
        </div>

        <div className="card flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Clear Models</span>
            <CheckCircle2 size={18} className="text-success" />
          </div>
          <span className="text-3xl font-bold text-success">{completedAudits.length - flaggedAudits.length}</span>
        </div>

        <div className="card flex flex-col gap-2 bg-primary text-primary-foreground border-none">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-sm font-medium">New Audit</span>
            <Activity size={18} />
          </div>
          <div className="mt-auto">
            <Link href="/dashboard/audit/new" className="text-sm font-semibold flex items-center gap-1 hover:underline">
              Start Evaluation <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent Audits */}
        <div className="md:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg">Recent Audits</h2>
            <Link href="/dashboard/history" className="text-sm text-primary hover:underline">View All</Link>
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Protected Attr</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {audits.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-muted-foreground">No audits yet. Run your first evaluation.</td>
                  </tr>
                ) : audits.slice(0, 5).map((audit) => {
                  const hasFlag = audit.disparities.some(d => d.flagged);
                  return (
                    <tr key={audit.id}>
                      <td className="font-medium">
                        <Link href={`/dashboard/audit/${audit.id}`} className="hover:text-primary hover:underline">
                          {audit.datasetName}
                        </Link>
                      </td>
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Center */}
        <div className="card">
          <h2 className="text-lg mb-4">Action Center</h2>
          <div className="flex flex-col gap-4">
            {flaggedAudits.length > 0 ? (
              flaggedAudits.map(audit => (
                <div key={`alert-${audit.id}`} className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex gap-3">
                  <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={18} />
                  <div>
                    <div className="text-sm font-semibold text-destructive mb-1">Disparate Impact Detected</div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {audit.datasetName} showed significant disparities for {audit.protectedAttribute}.
                    </div>
                    <Link href={`/dashboard/audit/${audit.id}`} className="text-xs font-medium text-destructive hover:underline flex items-center gap-1">
                      Review findings <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 size={32} className="text-success mb-2 opacity-50" />
                <p>All monitored models are operating within fairness thresholds.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
