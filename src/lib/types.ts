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

// ─── Backend API Types (added by Teammate A) ───────────────────────────────

export interface AuditStartRequest {
  auditId: string;
  csvPath: string;
  protectedAttribute: string;
  targetColumn: string;
  favorableLabel: number;
  domain: "lending" | "employment" | "insurance";
  uid: string;
}

export interface FairnessMetrics {
  demographicParityDifference: number;
  equalizedOddsDifference: number;
  averageOddsDifference: number;
  disparateImpactRatio: number;
  statisticalParityDifference: number;
  groupApprovalRates: Record<string, number>;
  flaggedMetrics: string[];
  overallStatus: "pass" | "warning" | "fail";
  rowCount: number;
  groupCounts: Record<string, number>;
  thresholdsUsed: Record<string, number>;
}

export interface MitigationStep {
  rank: number;
  title: string;
  description: string;
  difficulty: "low" | "medium" | "high";
  regulatoryReference: string;
  estimatedImpact: "low" | "medium" | "high";
}

export interface GeminiOutput {
  biasNarrative: string;
  severitySummary: string;
  mitigationPlan: MitigationStep[];
}

export interface PIIColumn {
  columnName: string;
  piiType: "email" | "phone" | "ssn" | "name" | "ip_address" | "unknown_pii";
  sampleValue: string;
  confidence: "high" | "medium";
}

export interface PIIDetectionResult {
  hasPii: boolean;
  flaggedColumns: PIIColumn[];
}

export interface CounterfactualEntry {
  changedAttribute: string;
  originalValue: string | number;
  counterfactualValue: string | number;
  counterfactualPrediction: number;
  decisionChanged: boolean;
}

export interface CounterfactualResult {
  recordIndex: number;
  originalPrediction: number;
  originalProtectedValue: string | number;
  counterfactuals: CounterfactualEntry[];
  narrative: string;
}

export interface AuditDocument {
  auditId: string;
  uid: string;
  status: "pending" | "queued" | "running" | "complete" | "error";
  progress: number;
  currentStep: string;
  domain: "lending" | "employment" | "insurance";
  protectedAttribute: string;
  targetColumn: string;
  csvPath: string;
  createdAt: any;
  updatedAt: any;
  completedAt?: any;
  taskId?: string;
  error?: string;
  results?: {
    fairnessMetrics: FairnessMetrics;
    geminiOutput: GeminiOutput;
    piiDetection: PIIDetectionResult;
    rowCount: number;
  };
}
