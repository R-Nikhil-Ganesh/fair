"use client";

import { useState } from "react";
import { X, Sparkles, ChevronRight, TerminalSquare } from "lucide-react";
import type { AuditReport } from "@/lib/types";

/* ─── Modal ──────────────────────────────────────────────────── */
function Modal({
  open,
  onClose,
  title,
  icon,
  accentColor,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "42rem",
          maxHeight: "85vh",
          overflowY: "auto",
          borderRadius: "1rem",
          border: `1px solid ${accentColor}`,
          background: "#09090b",
          boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            borderBottom: "1px solid #27272a",
            background: "#09090b",
            padding: "1rem 1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {icon}
            <h2 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#f4f4f5" }}>{title}</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              borderRadius: "50%",
              padding: "0.35rem",
              color: "#71717a",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#27272a"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <X size={15} />
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: "1.25rem" }}>{children}</div>
      </div>
    </div>
  );
}

/* ─── Trigger button ──────────────────────────────────────────── */
function TriggerButton({
  onClick,
  icon,
  label,
  sub,
  borderColor,
  bgColor,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
  borderColor: string;
  bgColor: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        borderRadius: "0.75rem",
        border: `1px solid ${hovered ? borderColor : "#27272a"}`,
        background: hovered ? bgColor : "#18181b",
        padding: "0.75rem 1rem",
        textAlign: "left",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {icon}
        <div>
          <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#e4e4e7", margin: 0 }}>{label}</p>
          <p style={{ fontSize: "0.72rem", color: "#71717a", marginTop: "0.15rem", marginBottom: 0 }}>{sub}</p>
        </div>
      </div>
      <ChevronRight size={13} style={{ color: hovered ? "#d4d4d8" : "#52525b", flexShrink: 0 }} />
    </button>
  );
}

/* ─── Main component ──────────────────────────────────────────── */
export function AuditInsights({ report }: { report: AuditReport }) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [cfOpen, setCfOpen] = useState(false);

  const isProcessing = report.status === "processing";
  const counterfactual = report.modelAudit?.counterfactual_data?.narrative;
  const recCount = report.recommendations?.length ?? 0;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        <TriggerButton
          onClick={() => setSummaryOpen(true)}
          icon={<Sparkles size={15} style={{ color: "#60a5fa", flexShrink: 0 }} />}
          label="AI Executive Summary"
          sub={isProcessing ? "Pending…" : "Gemini bias narrative"}
          borderColor="#3b82f6"
          bgColor="rgba(59,130,246,0.07)"
        />

        <TriggerButton
          onClick={() => setActionOpen(true)}
          icon={<ChevronRight size={15} style={{ color: "#34d399", flexShrink: 0 }} />}
          label="Action Plan"
          sub={recCount > 0 ? `${recCount} mitigation steps` : isProcessing ? "Pending…" : "No steps returned"}
          borderColor="#10b981"
          bgColor="rgba(16,185,129,0.07)"
        />

        {counterfactual && (
          <TriggerButton
            onClick={() => setCfOpen(true)}
            icon={<TerminalSquare size={15} style={{ color: "#c084fc", flexShrink: 0 }} />}
            label="Counterfactual Interrogation"
            sub="Model fairness log"
            borderColor="#a855f7"
            bgColor="rgba(168,85,247,0.07)"
          />
        )}
      </div>

      {/* Executive Summary Modal */}
      <Modal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="AI Executive Summary"
        icon={<Sparkles size={15} style={{ color: "#60a5fa" }} />}
        accentColor="#27272a"
      >
        <p style={{ fontSize: "0.875rem", lineHeight: 1.7, color: "#d4d4d8", whiteSpace: "pre-wrap" }}>
          {isProcessing
            ? "Narrative is pending while cloud workers finish the fairness computation."
            : report.geminiSummary || "No summary was generated for this audit."}
        </p>
      </Modal>

      {/* Action Plan Modal */}
      <Modal
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        title="Action Plan"
        icon={<ChevronRight size={15} style={{ color: "#34d399" }} />}
        accentColor="#27272a"
      >
        {recCount > 0 ? (
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem", listStyle: "none", padding: 0, margin: 0 }}>
            {report.recommendations!.map((rec, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.6rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #27272a",
                  background: "#18181b",
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.85rem",
                  color: "#d4d4d8",
                }}
              >
                <span style={{ color: "#34d399", fontFamily: "monospace", flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                <span style={{ lineHeight: 1.5 }}>{rec}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: "0.875rem", color: "#71717a" }}>
            {isProcessing
              ? "Mitigation steps will appear after processing completes."
              : "No mitigation steps were returned for this audit."}
          </p>
        )}
      </Modal>

      {/* Counterfactual Modal */}
      {counterfactual && (
        <Modal
          open={cfOpen}
          onClose={() => setCfOpen(false)}
          title="Counterfactual Interrogation"
          icon={<TerminalSquare size={15} style={{ color: "#c084fc" }} />}
          accentColor="rgba(168,85,247,0.4)"
        >
          {/* Flip rate summary */}
          {typeof report.modelAudit?.counterfactual_data?.flip_rate === "number" && (
            <div style={{
              display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap",
            }}>
              {[
                { label: "Flip Rate", value: `${(report.modelAudit.counterfactual_data.flip_rate * 100).toFixed(0)}%`, color: report.modelAudit.counterfactual_data.flip_rate >= 0.5 ? "#fca5a5" : "#6ee7b7" },
                { label: "Flipped", value: String(report.modelAudit.counterfactual_data.flip_count ?? "—"), color: "#f4f4f5" },
                { label: "Pairs Tested", value: String(report.modelAudit.counterfactual_data.total_tested ?? "—"), color: "#a1a1aa" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "0.5rem", padding: "0.45rem 0.75rem", minWidth: 90 }}>
                  <div style={{ fontSize: "0.65rem", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color, fontFamily: "monospace" }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Narrative */}
          <pre style={{
            whiteSpace: "pre-wrap", fontSize: "0.8rem",
            fontFamily: '"JetBrains Mono", monospace',
            color: "#d4d4d8", lineHeight: 1.65, margin: "0 0 1rem",
          }}>
            {counterfactual}
          </pre>

          {/* Entries table */}
          {report.modelAudit?.counterfactual_data?.entries?.length ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #27272a" }}>
                    {["Record", "Group (original)", "Group (cf)", "Original", "Counterfactual", "Changed?"].map(h => (
                      <th key={h} style={{ padding: "0.35rem 0.5rem", color: "#71717a", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.modelAudit.counterfactual_data.entries.map((e, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1a1a1a" }}>
                      <td style={{ padding: "0.3rem 0.5rem", color: "#71717a", fontFamily: "monospace" }}>#{e.record_index}</td>
                      <td style={{ padding: "0.3rem 0.5rem", color: "#a1a1aa" }}>{String(e.original_value)}</td>
                      <td style={{ padding: "0.3rem 0.5rem", color: "#a1a1aa" }}>{String(e.counterfactual_value)}</td>
                      <td style={{ padding: "0.3rem 0.5rem", color: e.original_prediction === 1 ? "#6ee7b7" : "#fca5a5", fontFamily: "monospace" }}>{e.original_prediction === 1 ? "Approved" : "Denied"}</td>
                      <td style={{ padding: "0.3rem 0.5rem", color: e.counterfactual_prediction === 1 ? "#6ee7b7" : "#fca5a5", fontFamily: "monospace" }}>{e.counterfactual_prediction === 1 ? "Approved" : "Denied"}</td>
                      <td style={{ padding: "0.3rem 0.5rem" }}>
                        <span style={{
                          fontSize: "0.68rem", fontWeight: 700,
                          borderRadius: 999, padding: "0.1rem 0.4rem",
                          background: e.decision_changed ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                          color: e.decision_changed ? "#fca5a5" : "#6ee7b7",
                          border: `1px solid ${e.decision_changed ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                        }}>
                          {e.decision_changed ? "Yes ⚠" : "No"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Modal>
      )}
    </>
  );
}
