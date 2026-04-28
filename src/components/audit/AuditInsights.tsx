"use client";

import { useState } from "react";
import { X, Sparkles, ChevronRight, TerminalSquare } from "lucide-react";
import type { AuditReport } from "@/lib/types";

/* ─── Reusable Modal ─────────────────────────────────────────── */
function Modal({
  open,
  onClose,
  title,
  icon,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-6 py-4">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export function AuditInsights({ report }: { report: AuditReport }) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [cfOpen, setCfOpen] = useState(false);

  const isProcessing = report.status === "processing";
  const counterfactual = report.modelAudit?.counterfactual_data?.narrative;
  const hasRecommendations =
    report.recommendations && report.recommendations.length > 0;

  return (
    <>
      {/* ── Trigger buttons ── */}
      <div className="flex flex-col gap-3">
        {/* Executive Summary */}
        <button
          onClick={() => setSummaryOpen(true)}
          className="flex items-center justify-between w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-left hover:border-zinc-600 hover:bg-zinc-800/60 transition-all group"
        >
          <div className="flex items-center gap-3">
            <Sparkles size={16} className="text-blue-400" />
            <div>
              <p className="text-sm font-medium text-zinc-200">AI Executive Summary</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isProcessing ? "Pending…" : "Gemini bias narrative"}
              </p>
            </div>
          </div>
          <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-300 transition-colors" />
        </button>

        {/* Action Plan */}
        <button
          onClick={() => setActionOpen(true)}
          className="flex items-center justify-between w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-left hover:border-zinc-600 hover:bg-zinc-800/60 transition-all group"
        >
          <div className="flex items-center gap-3">
            <ChevronRight size={16} className="text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-zinc-200">Action Plan</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {hasRecommendations
                  ? `${report.recommendations!.length} mitigation steps`
                  : isProcessing
                  ? "Pending…"
                  : "No steps returned"}
              </p>
            </div>
          </div>
          <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-300 transition-colors" />
        </button>

        {/* Counterfactual — only shown when data exists */}
        {counterfactual && (
          <button
            onClick={() => setCfOpen(true)}
            className="flex items-center justify-between w-full rounded-xl border border-purple-500/30 bg-purple-500/5 px-4 py-3 text-left hover:border-purple-500/60 hover:bg-purple-500/10 transition-all group"
          >
            <div className="flex items-center gap-3">
              <TerminalSquare size={16} className="text-purple-400" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Counterfactual Interrogation</p>
                <p className="text-xs text-zinc-500 mt-0.5">Model fairness log</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-300 transition-colors" />
          </button>
        )}
      </div>

      {/* ── Executive Summary Modal ── */}
      <Modal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="AI Executive Summary"
        icon={<Sparkles size={16} className="text-blue-400" />}
      >
        <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
          {isProcessing
            ? "Narrative is pending while cloud workers finish the fairness computation."
            : report.geminiSummary || "No summary was generated for this audit."}
        </p>
      </Modal>

      {/* ── Action Plan Modal ── */}
      <Modal
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        title="Action Plan"
        icon={<ChevronRight size={16} className="text-emerald-400" />}
      >
        {hasRecommendations ? (
          <ul className="flex flex-col gap-3">
            {report.recommendations!.map((rec, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-sm text-zinc-300"
              >
                <span className="mt-0.5 text-emerald-400 font-mono shrink-0">{i + 1}.</span>
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">
            {isProcessing
              ? "Mitigation steps will appear after processing completes."
              : "No mitigation steps were returned for this audit."}
          </p>
        )}
      </Modal>

      {/* ── Counterfactual Modal ── */}
      {counterfactual && (
        <Modal
          open={cfOpen}
          onClose={() => setCfOpen(false)}
          title="Counterfactual Interrogation"
          icon={<TerminalSquare size={16} className="text-purple-400" />}
        >
          <pre className="whitespace-pre-wrap text-sm font-mono text-zinc-200 leading-relaxed">
            {counterfactual}
          </pre>
        </Modal>
      )}
    </>
  );
}
