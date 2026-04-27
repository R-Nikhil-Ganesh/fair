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
      <div className="card p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Protected Attr
        </div>
        <div className="text-xl font-bold">{protectedAttribute || "--"}</div>
      </div>
      <div className="card p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Total Records
        </div>
        <div className="text-xl font-bold">{recordsDisplay}</div>
      </div>
      <div className="card p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Overall Approval
        </div>
        <div className="text-xl font-bold">{approvalDisplay}</div>
      </div>
    </div>
  );
}
