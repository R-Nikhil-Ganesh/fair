import Link from "next/link";
import { ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { AuditViewModel } from "@/components/dashboard/types";

export function ActionCenter({ flaggedAudits }: { flaggedAudits: AuditViewModel[] }) {
  return (
    <div className="card">
      <h2 className="text-lg mb-4">Action Center</h2>
      <div className="flex flex-col gap-4">
        {flaggedAudits.length > 0 ? (
          flaggedAudits.map((audit) => (
            <div
              key={`alert-${audit.id}`}
              className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex gap-3"
            >
              <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={18} />
              <div>
                <div className="text-sm font-semibold text-destructive mb-1">Disparate Impact Detected</div>
                <div className="text-xs text-muted-foreground mb-2">
                  {audit.datasetName} showed significant disparities for {audit.protectedAttribute}.
                </div>
                <Link
                  href={`/dashboard/audit/${audit.id}`}
                  className="text-xs font-medium text-destructive hover:underline flex items-center gap-1"
                >
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
  );
}
