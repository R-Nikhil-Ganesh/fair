import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, FileText } from "lucide-react";

export function OverviewStats({
  totalAudits,
  flaggedAudits,
  clearAudits,
}: {
  totalAudits: number;
  flaggedAudits: number;
  clearAudits: number;
}) {
  return (
    <div className="grid md:grid-cols-4 gap-4">
      <div className="card flex flex-col gap-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-sm font-medium">Total Audits</span>
          <FileText size={18} />
        </div>
        <span className="text-3xl font-bold">{totalAudits}</span>
      </div>

      <div className="card flex flex-col gap-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-sm font-medium">Flagged Issues</span>
          <AlertTriangle size={18} className="text-destructive" />
        </div>
        <span className="text-3xl font-bold text-destructive">{flaggedAudits}</span>
      </div>

      <div className="card flex flex-col gap-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-sm font-medium">Clear Models</span>
          <CheckCircle2 size={18} className="text-success" />
        </div>
        <span className="text-3xl font-bold text-success">{clearAudits}</span>
      </div>

      <div
        className="card flex flex-col gap-2 border-none"
        style={{
          background: "linear-gradient(135deg, var(--primary), #1643b8)",
          color: "var(--primary-foreground)",
        }}
      >
        <div className="flex items-center justify-between opacity-90">
          <span className="text-sm font-medium">New Audit</span>
          <Activity size={18} />
        </div>
        <div className="mt-auto">
          <Link
            href="/dashboard/audit/new"
            className="text-sm font-semibold flex items-center gap-1 hover:underline"
          >
            Start Evaluation
          </Link>
        </div>
      </div>
    </div>
  );
}
