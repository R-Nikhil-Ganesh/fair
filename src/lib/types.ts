export type AuditStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DisparityInfo {
  group: string;
  approvalRate: number;
  disparityRatio: number;
  flagged: boolean;
}

export interface AuditReport {
  id: string;
  userId?: string;
  date: string;
  datasetName: string;
  totalRecords: number;
  protectedAttribute: string;
  targetColumn: string;
  overallApprovalRate: number;
  disparities: DisparityInfo[];
  status: AuditStatus;
  geminiSummary?: string;
  recommendations?: string[];
}
