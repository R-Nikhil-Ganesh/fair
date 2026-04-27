import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AuditViewModel } from "@/components/dashboard/types";

export function AuditHistoryTable({
  audits,
  loading,
}: {
  audits: AuditViewModel[];
  loading: boolean;
}) {
  return (
    <div className="table-container border rounded-xl border-border/80 overflow-hidden shadow-sm bg-white">
      <table>
        <thead className="bg-slate-50">
          <tr>
            <th>Dataset Name</th>
            <th>Protected Attribute</th>
            <th>Evaluated On</th>
            <th>Result</th>
            <th>Records</th>
            <th className="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="text-center py-8 text-muted-foreground">
                Loading history...
              </td>
            </tr>
          ) : audits.length > 0 ? (
            audits.map((audit) => (
              <tr key={audit.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="font-medium text-slate-800">{audit.datasetName || `Audit ${audit.id.slice(0, 8)}`}</td>
                <td className="text-slate-700">{audit.protectedAttribute || "Pending"}</td>
                <td className="text-muted-foreground">{new Date(audit.date).toLocaleDateString()}</td>
                <td>
                  {audit.status === "processing" ? (
                    <StatusBadge label="Processing" variant="processing" />
                  ) : audit.hasFlag ? (
                    <StatusBadge label="Flagged" variant="warning" />
                  ) : (
                    <StatusBadge label="Passed" variant="pass" />
                  )}
                </td>
                <td className="text-muted-foreground">
                  {audit.totalRecords > 0 ? audit.totalRecords.toLocaleString() : "--"}
                </td>
                <td className="text-right">
                  <Link
                    href={`/dashboard/audit/${audit.id}`}
                    className="text-primary font-semibold hover:underline text-sm"
                  >
                    View Report
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center py-8 text-muted-foreground">
                No audits found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
