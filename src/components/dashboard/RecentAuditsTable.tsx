import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AuditViewModel } from "@/components/dashboard/types";

export function RecentAuditsTable({ audits }: { audits: AuditViewModel[] }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg">Recent Audits</h2>
        <Link href="/dashboard/history" className="text-sm text-primary hover:underline">
          View All
        </Link>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Protected Attr</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {audits.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-muted-foreground">
                  No audits yet. Run your first evaluation.
                </td>
              </tr>
            ) : (
              audits.slice(0, 5).map((audit) => (
                <tr key={audit.id}>
                  <td className="font-medium">
                    <Link href={`/dashboard/audit/${audit.id}`} className="hover:text-primary hover:underline">
                      {audit.datasetName || `Audit ${audit.id.slice(0, 8)}`}
                    </Link>
                  </td>
                  <td>{audit.protectedAttribute || "Pending"}</td>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {audits.some((audit) => audit.hasFlag) ? (
        <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
          <AlertTriangle size={12} className="text-destructive" />
          At least one recent audit has fairness threshold violations.
        </div>
      ) : null}
    </div>
  );
}
