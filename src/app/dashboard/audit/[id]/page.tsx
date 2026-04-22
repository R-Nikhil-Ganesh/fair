"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Lightbulb,
  FileText
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AuditReport } from "@/lib/types";

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

  // Chart data
  const chartData = report.disparities.map(d => ({
    name: d.group,
    rate: Math.round(d.approvalRate * 100),
    flagged: d.flagged
  }));

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl m-0 leading-none">{report.datasetName}</h1>
              {hasFlag ? (
                <span className="badge badge-destructive flex items-center gap-1">
                  <AlertTriangle size={14} /> Action Required
                </span>
              ) : (
                <span className="badge badge-success flex items-center gap-1">
                  <CheckCircle2 size={14} /> Passed
                </span>
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
        {/* Left Column: Stats & Chart */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Protected Attr</div>
              <div className="text-xl font-bold">{report.protectedAttribute}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Records</div>
              <div className="text-xl font-bold">{report.totalRecords.toLocaleString()}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Overall Approval</div>
              <div className="text-xl font-bold">{(report.overallApprovalRate * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg mb-6">Approval Rates by Group</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `${val}%`} tick={{ fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    cursor={{ fill: 'var(--muted)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
                    formatter={(value: any) => [`${value}%`, 'Approval Rate']}
                  />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.flagged ? 'var(--destructive)' : 'var(--primary)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {hasFlag && (
              <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>Groups highlighted in red fall below the 80% parity threshold relative to the privileged group. This violates standard fairness definitions for disparate impact.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Insights */}
        <div className="flex flex-col gap-6">
          <div className="card relative overflow-hidden border-indigo-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-500"></div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-indigo-600" />
              <h2 className="text-lg text-indigo-900">Gemini Insight</h2>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {report.geminiSummary || "No summary generated for this audit."}
            </p>
          </div>

          <div className="card bg-slate-50">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={20} className="text-warning" />
              <h2 className="text-lg">Recommendations</h2>
            </div>
            {report.recommendations && report.recommendations.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-warning/20 text-warning-foreground flex items-center justify-center text-xs font-bold mt-0.5">{i + 1}</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No specific mitigations recommended at this time.</p>
            )}
          </div>

          <div className="card">
             <div className="flex items-center gap-2 mb-4">
              <FileText size={20} className="text-muted-foreground" />
              <h2 className="text-lg">Detailed Metrics</h2>
            </div>
            <div className="flex flex-col gap-3">
              {report.disparities.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors">
                  <span className="text-sm font-medium">{d.group}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold">{(d.approvalRate * 100).toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Ratio: {d.disparityRatio.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
