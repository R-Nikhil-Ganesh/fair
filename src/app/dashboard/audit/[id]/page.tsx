"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, ShieldCheck,
  Scale, Sparkles, Cpu, Shield, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { AuditDocument, AuditReport } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AuditMetricsRow } from "@/components/audit/AuditMetricsRow";
import { AuditInsights } from "@/components/audit/AuditInsights";
import { FairnessMetricsModal } from "@/components/audit/FairnessMetricsModal";
import { ModelStatsModal } from "@/components/audit/ModelStatsModal";
import { ApprovalRatesChart } from "@/components/audit/ApprovalRatesChart";
import { mapFirestoreAuditToReport } from "@/lib/auditReportAdapter";
import { PdfExportButton } from "@/components/PdfExportButton";

const CARD: React.CSSProperties = {
  background: "#09090b", border: "1px solid #27272a",
  borderRadius: "1rem", padding: "1.25rem",
};

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em",
      textTransform: "uppercase", color: "#52525b", marginBottom: "0.75rem" }}>
      {children}
    </p>
  );
}

function LaunchRow({ icon, title, sub, accentColor, badge, onClick }: {
  icon: React.ReactNode; title: string; sub: string;
  accentColor: string; badge?: string; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.9rem 1rem", borderRadius: "0.75rem", textAlign: "left",
        border: `1px solid ${hov ? accentColor : "#27272a"}`,
        background: hov ? `${accentColor}12` : "#18181b",
        cursor: "pointer", transition: "all 0.15s", width: "100%",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {icon}
        <div>
          <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#e4e4e7" }}>{title}</div>
          <div style={{ fontSize: "0.72rem", color: "#71717a", marginTop: "0.15rem" }}>{sub}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {badge && (
          <span style={{ fontSize: "0.65rem", fontWeight: 700, borderRadius: 999, padding: "0.1rem 0.4rem",
            background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
            {badge}
          </span>
        )}
        <span style={{ fontSize: "0.75rem", color: "#52525b" }}>›</span>
      </div>
    </button>
  );
}

export default function AuditResultsPage() {
  const params  = useParams();
  const router  = useRouter();
  const { user } = useAuth();
  const [report,   setReport]   = useState<AuditReport | null>(null);
  const [auditDoc, setAuditDoc] = useState<AuditDocument | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [fairnessOpen, setFairnessOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState<"summary" | "action" | null>(null);

  useEffect(() => {
    async function fetchReport() {
      if (!params.id || !user) return;
      try {
        const docRef  = doc(db, "audits", user.uid, "audits", params.id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const raw = docSnap.data() as Record<string, unknown>;
          setReport(mapFirestoreAuditToReport(docSnap.id, raw));
          setAuditDoc({ auditId: docSnap.id, ...(raw as Omit<AuditDocument, "auditId">) });
        }
      } catch (e) {
        console.error("Error fetching report:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [params.id, user]);

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "#71717a" }}>Loading…</div>;
  if (!report)  return <div style={{ padding: "2rem", textAlign: "center", color: "#71717a" }}>Audit not found.</div>;

  const isProcessing = report.status === "processing";
  const isFailed     = report.status === "failed";
  const flaggedCount = report.disparities.filter(d => d.flagged).length;
  const hasFlag      = flaggedCount > 0;
  const recCount     = report.recommendations?.length ?? 0;
  const hasCF        = Boolean(report.modelAudit?.counterfactual_data?.flip_rate);
  const showCharts   = !isProcessing && !isFailed;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "64rem", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ ...CARD, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => router.back()} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "2rem", height: "2rem", borderRadius: "50%",
            border: "1px solid #27272a", background: "transparent",
            color: "#d4d4d8", cursor: "pointer", flexShrink: 0,
          }}><ArrowLeft size={18} /></button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#f4f4f5", margin: 0 }}>
                {report.datasetName || "Audit Report"}
              </h1>
              {isProcessing ? <StatusBadge label="Processing"      variant="processing" />
                : isFailed  ? <StatusBadge label="Failed"          variant="error" />
                : hasFlag   ? <StatusBadge label="Action Required" variant="warning" />
                :             <StatusBadge label="Passed"          variant="pass" />}
            </div>
            <p style={{ fontSize: "0.8rem", color: "#71717a", marginTop: "0.3rem" }}>
              Audit ID: {report.id} • {new Date(report.date).toLocaleDateString()}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#71717a", marginTop: "0.3rem" }}>
              <ShieldCheck size={13} style={{ color: "#60a5fa" }} />
              <span>Compliance-ready fairness summary and mitigation guidance</span>
            </div>
          </div>
        </div>
        {auditDoc
          ? <PdfExportButton audit={auditDoc} />
          : <button disabled style={{ display:"flex", alignItems:"center", gap:"0.5rem", padding:"0.5rem 1rem", borderRadius:"0.6rem", border:"1px solid #27272a", background:"#09090b", color:"#52525b", fontSize:"0.85rem", fontWeight:600, cursor:"not-allowed", opacity:0.6 }}>Export PDF</button>
        }
      </div>

      {/* Banners */}
      {isProcessing && (
        <div style={{ borderRadius:"1rem", border:"1px solid rgba(245,158,11,0.4)", background:"rgba(245,158,11,0.08)", display:"flex", gap:"0.75rem", padding:"1rem" }}>
          <Loader2 size={16} className="animate-spin" style={{ color:"#fcd34d", marginTop:2, flexShrink:0 }} />
          <div>
            <p style={{ fontWeight:600, color:"#fde68a", fontSize:"0.9rem" }}>Audit is still processing in cloud workers</p>
            <p style={{ fontSize:"0.82rem", color:"#a1a1aa", marginTop:"0.25rem" }}>Metrics will appear once Firestore receives results.</p>
          </div>
        </div>
      )}
      {isFailed && (
        <div style={{ borderRadius:"1rem", border:"1px solid rgba(239,68,68,0.4)", background:"rgba(239,68,68,0.08)", padding:"1rem" }}>
          <p style={{ fontWeight:600, color:"#fca5a5", fontSize:"0.9rem" }}>Audit failed before completion.</p>
        </div>
      )}

      {/* ── 1. KPI strip ── */}
      <AuditMetricsRow
        protectedAttribute={report.protectedAttribute || "Pending"}
        totalRecords={report.totalRecords}
        overallApprovalRate={report.overallApprovalRate}
        isPending={isProcessing}
        modelAudit={report.modelAudit}
      />

      {/* ── 2. Approval Rates Chart (graph first) ── */}
      {showCharts && report.disparities.length > 0 && (
        <ApprovalRatesChart report={report} />
      )}

      {/* ── 3. Model Analysis card ── */}
      {report.modelAudit && showCharts && (
        <div style={{ ...CARD, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"1rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
            <Cpu size={20} style={{ color:"#a5b4fc", flexShrink:0 }} />
            <div>
              <div style={{ fontSize:"0.875rem", fontWeight:600, color:"#e4e4e7" }}>Model Analysis</div>
              <div style={{ fontSize:"0.72rem", color:"#71717a", marginTop:"0.15rem" }}>
                {report.modelAudit.model_type?.toUpperCase() || "Model"}
                {report.modelAudit.model_accuracy >= 0 && ` · Accuracy ${(report.modelAudit.model_accuracy * 100).toFixed(1)}%`}
                {hasCF && ` · CF flip rate ${(report.modelAudit.counterfactual_data!.flip_rate * 100).toFixed(0)}%`}
              </div>
            </div>
          </div>
          <ModelStatsModal report={report} />
        </div>
      )}

      {/* ── 4. Fairness Overview — status pills + disparity table ── */}
      {showCharts && (
        <div style={CARD}>
          <SLabel>Fairness Overview</SLabel>
          <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap", marginBottom:"1rem" }}>
            <div style={{
              flex:1, minWidth:140,
              background: hasFlag ? "rgba(239,68,68,0.07)" : "rgba(16,185,129,0.07)",
              border: `1px solid ${hasFlag ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}`,
              borderRadius:"0.65rem", padding:"0.75rem",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                {hasFlag ? <AlertTriangle size={14} style={{ color:"#f87171" }} /> : <CheckCircle2 size={14} style={{ color:"#34d399" }} />}
                <span style={{ fontSize:"0.72rem", color: hasFlag ? "#f87171" : "#34d399", fontWeight:700 }}>
                  {hasFlag ? `${flaggedCount} metric${flaggedCount > 1 ? "s" : ""} flagged` : "All metrics passed"}
                </span>
              </div>
            </div>
            {[
              { label:"Protected Attribute", value: report.protectedAttribute || "—", color:"#60a5fa" },
              { label:"Total Records",        value: report.totalRecords > 0 ? report.totalRecords.toLocaleString() : "—", color:"#f4f4f5" },
              { label:"Groups",               value: report.disparities.length > 0 ? String(report.disparities.length) : "—", color:"#f4f4f5" },
            ].map(s => (
              <div key={s.label} style={{ flex:1, minWidth:130, background:"#18181b", border:"1px solid #27272a", borderRadius:"0.65rem", padding:"0.75rem" }}>
                <div style={{ fontSize:"0.62rem", color:"#52525b", textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</div>
                <div style={{ fontWeight:700, color:s.color, fontSize:"0.9rem", fontFamily:"monospace", marginTop:"0.2rem" }}>{s.value}</div>
              </div>
            ))}
          </div>
          {report.disparities.length > 0 && (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid #27272a" }}>
                    {["Group","Approval Rate","Disparity Ratio","Status"].map(h => (
                      <th key={h} style={{ padding:"0.35rem 0.6rem", color:"#52525b", fontWeight:600, textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.disparities.map((d, i) => (
                    <tr key={i} style={{ borderBottom:"1px solid #111", background: i % 2 === 0 ? "transparent" : "#111113" }}>
                      <td style={{ padding:"0.35rem 0.6rem", color:"#e4e4e7", fontFamily:"monospace" }}>{d.group}</td>
                      <td style={{ padding:"0.35rem 0.6rem", color:"#f4f4f5", fontFamily:"monospace" }}>{(d.approvalRate * 100).toFixed(1)}%</td>
                      <td style={{ padding:"0.35rem 0.6rem", color: d.flagged ? "#f87171" : "#a1a1aa", fontFamily:"monospace" }}>{d.disparityRatio.toFixed(3)}</td>
                      <td style={{ padding:"0.35rem 0.6rem" }}>
                        <span style={{
                          fontSize:"0.68rem", fontWeight:700, borderRadius:999, padding:"0.1rem 0.45rem",
                          background: d.flagged ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                          color: d.flagged ? "#f87171" : "#34d399",
                          border: `1px solid ${d.flagged ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                        }}>
                          {d.flagged ? "⚠ Flagged" : "✓ Pass"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 5. Deep-Dive launchers ── */}
      <div style={CARD}>
        <SLabel>Deep-Dive Analysis</SLabel>
        <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
          <LaunchRow
            icon={<Scale    size={16} style={{ color:"#60a5fa", flexShrink:0 }} />}
            title="Fairness Metrics"
            sub={isProcessing ? "Pending…" : hasFlag ? `${flaggedCount} metric${flaggedCount > 1 ? "s" : ""} flagged` : "All thresholds passed · Disparate impact, parity, odds"}
            accentColor="#3b82f6"
            badge={hasFlag ? String(flaggedCount) : undefined}
            onClick={() => setFairnessOpen(true)}
          />
          <LaunchRow
            icon={<Sparkles size={16} style={{ color:"#60a5fa", flexShrink:0 }} />}
            title="AI Executive Summary"
            sub={isProcessing ? "Pending…" : "Gemini bias narrative — plain-language interpretation"}
            accentColor="#3b82f6"
            onClick={() => setInsightsOpen("summary")}
          />
          <LaunchRow
            icon={<Shield   size={16} style={{ color:"#34d399", flexShrink:0 }} />}
            title="Mitigation Action Plan"
            sub={recCount > 0 ? `${recCount} recommended steps` : isProcessing ? "Pending…" : "No steps returned"}
            accentColor="#10b981"
            onClick={() => setInsightsOpen("action")}
          />
        </div>
      </div>

      <FairnessMetricsModal report={report} externalOpen={fairnessOpen} onExternalClose={() => setFairnessOpen(false)} />
      <AuditInsights report={report} externalOpen={insightsOpen} onExternalClose={() => setInsightsOpen(null)} />
    </div>
  );
}
