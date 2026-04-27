import { FileText, Lightbulb, Sparkles } from "lucide-react";
import type { AuditReport } from "@/lib/types";

export function AuditInsights({ report }: { report: AuditReport }) {
  const isProcessing = report.status === "processing";

  return (
    <div className="flex flex-col gap-6">
      <div className="card relative overflow-hidden bg-gradient-to-br from-white via-indigo-50/30 to-white border-border/80">
        <div
          className="absolute top-0 left-0 w-full h-1"
          style={{ background: "linear-gradient(90deg, #2563eb, #10b981)" }}
        />
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-primary" />
          <h2 className="text-lg">Narrative Insight</h2>
        </div>
        <p className="text-sm leading-relaxed text-slate-700">
          {isProcessing
            ? "Narrative is pending while cloud workers finish the fairness computation."
            : report.geminiSummary || "No summary generated for this audit."}
        </p>
      </div>

      <div className="card bg-gradient-to-br from-amber-50/60 to-white border-amber-100">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={20} className="text-warning" />
          <h2 className="text-lg">Mitigation Steps</h2>
        </div>
        {report.recommendations && report.recommendations.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {report.recommendations.map((recommendation, index) => (
              <li key={recommendation} className="text-sm flex items-start gap-2 rounded-lg border border-amber-100 bg-white/90 p-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold mt-0.5">
                  {index + 1}
                </span>
                <span className="text-slate-700 leading-relaxed">{recommendation}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isProcessing ? "Mitigation steps will appear after processing completes." : "No mitigation steps were returned."}
          </p>
        )}
      </div>

      <div className="card bg-gradient-to-br from-white to-slate-50 border-border/80">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={20} className="text-muted-foreground" />
          <h2 className="text-lg">Detailed Metrics</h2>
        </div>
        <div className="flex flex-col gap-3">
          {report.disparities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No group disparity metrics available yet.</p>
          ) : report.disparities.map((disparity) => (
            <div
              key={disparity.group}
              className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-white hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-medium text-slate-700">{disparity.group}</span>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-900">{(disparity.approvalRate * 100).toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">
                  Ratio: {disparity.disparityRatio.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
