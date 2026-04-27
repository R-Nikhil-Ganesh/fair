import { BarChart3, Database, Shield } from "lucide-react";

export function AuditMetricsRow({
  protectedAttribute,
  totalRecords,
  overallApprovalRate,
  isPending,
}: {
  protectedAttribute: string;
  totalRecords: number;
  overallApprovalRate: number;
  isPending?: boolean;
}) {
  const recordsDisplay = isPending
    ? "--"
    : totalRecords > 0
      ? totalRecords.toLocaleString()
      : "--";
  const approvalDisplay = isPending
    ? "--"
    : totalRecords > 0
      ? `${(overallApprovalRate * 100).toFixed(1)}%`
      : "--";

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="card p-4 bg-gradient-to-br from-white to-blue-50/50 border-border/80">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Protected Attr
          </div>
          <Shield size={15} className="text-primary" />
        </div>
        <div className="text-xl font-bold tracking-tight">{protectedAttribute || "--"}</div>
      </div>

      <div className="card p-4 bg-gradient-to-br from-white to-slate-50 border-border/80">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Total Records
          </div>
          <Database size={15} className="text-muted-foreground" />
        </div>
        <div className="text-xl font-bold tracking-tight">{recordsDisplay}</div>
      </div>

      <div className="card p-4 bg-gradient-to-br from-white to-emerald-50/50 border-border/80">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Overall Approval
          </div>
          <BarChart3 size={15} className="text-emerald-600" />
        </div>
        <div className="text-xl font-bold tracking-tight">{approvalDisplay}</div>
      </div>
    </div>
  );
}
