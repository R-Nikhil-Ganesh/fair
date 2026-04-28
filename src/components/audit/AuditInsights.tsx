import { ChevronRight, Sparkles, TerminalSquare } from "lucide-react";
import type { AuditReport } from "@/lib/types";

export function AuditInsights({ report }: { report: AuditReport }) {
  const isProcessing = report.status === "processing";
  const counterfactualNarrative = report.modelAudit?.counterfactual_data?.narrative?.trim();

  const renderNarrative = (narrative: string) => {
    const parts = narrative.split(/(\bApproved\b|\bDenied\b)/g);
    return parts.map((part, index) => {
      if (part === "Approved") {
        return (
          <span key={`approved-${index}`} className="text-emerald-300">
            {part}
          </span>
        );
      }
      if (part === "Denied") {
        return (
          <span key={`denied-${index}`} className="text-red-300">
            {part}
          </span>
        );
      }
      return <span key={`text-${index}`}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-[0_0_0_1px_rgba(39,39,42,0.6)]">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-blue-400" />
          <h2 className="text-lg text-zinc-100">AI Executive Summary</h2>
        </div>
        <p className="text-sm leading-relaxed text-zinc-300">
          {isProcessing
            ? "Narrative is pending while cloud workers finish the fairness computation."
            : report.geminiSummary || "No summary generated for this audit."}
        </p>
      </div>

      {counterfactualNarrative ? (
        <div className="rounded-2xl border border-zinc-800 bg-black p-5">
          <div className="flex items-center gap-2 mb-4">
            <TerminalSquare size={18} className="text-blue-400" />
            <h2 className="text-lg text-zinc-100">Counterfactual Interrogation Log</h2>
          </div>
          <div className="border-l-2 border-blue-500/40 pl-4 font-mono text-sm text-zinc-200 leading-relaxed">
            {renderNarrative(counterfactualNarrative)}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex items-center gap-2 mb-4">
          <ChevronRight size={18} className="text-emerald-400" />
          <h2 className="text-lg text-zinc-100">Action Plan</h2>
        </div>
        {report.recommendations && report.recommendations.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {report.recommendations.map((recommendation) => (
              <li
                key={recommendation}
                className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300"
              >
                <span className="mt-0.5 text-emerald-400 font-mono">&gt;</span>
                <span className="leading-relaxed">{recommendation}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">
            {isProcessing ? "Mitigation steps will appear after processing completes." : "No mitigation steps were returned."}
          </p>
        )}
      </div>
    </div>
  );
}
