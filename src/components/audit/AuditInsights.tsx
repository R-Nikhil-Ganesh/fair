import { FileText, Lightbulb, Sparkles } from "lucide-react";
import type { AuditReport } from "@/lib/types";

export function AuditInsights({ report }: { report: AuditReport }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="card relative overflow-hidden">
        <div
          className="absolute top-0 left-0 w-full h-1"
          style={{ background: "linear-gradient(90deg, #2563eb, #10b981)" }}
        />
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-primary" />
          <h2 className="text-lg">Narrative Insight</h2>
        </div>
        <p className="text-sm leading-relaxed">
          {report.geminiSummary || "No summary generated for this audit."}
        </p>
      </div>

      <div className="card" style={{ backgroundColor: "#f8fafc" }}>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={20} className="text-warning" />
          <h2 className="text-lg">Mitigation Steps</h2>
        </div>
        {report.recommendations && report.recommendations.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {report.recommendations.map((recommendation, index) => (
              <li key={recommendation} className="text-sm flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-warning/20 text-warning-foreground flex items-center justify-center text-xs font-bold mt-0.5">
                  {index + 1}
                </span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No mitigation steps were returned.</p>
        )}
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={20} className="text-muted-foreground" />
          <h2 className="text-lg">Detailed Metrics</h2>
        </div>
        <div className="flex flex-col gap-3">
          {report.disparities.map((disparity) => (
            <div
              key={disparity.group}
              className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors"
            >
              <span className="text-sm font-medium">{disparity.group}</span>
              <div className="text-right">
                <div className="text-sm font-bold">{(disparity.approvalRate * 100).toFixed(1)}%</div>
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
