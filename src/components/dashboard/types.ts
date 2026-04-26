import type { AuditReport } from "@/lib/types";

export interface AuditViewModel extends AuditReport {
  hasFlag: boolean;
}
