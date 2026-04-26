import type { AuditReport } from "@/lib/types";
import type { AuditViewModel } from "@/components/dashboard/types";

export function toAuditViewModel(audit: AuditReport): AuditViewModel {
  return {
    ...audit,
    hasFlag: audit.disparities.some((disparity) => disparity.flagged),
  };
}
