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
  modelAudit?: any;
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
  record_index: number;
  changed_attribute: string;
  original_value: string | number;
  counterfactual_value: string | number;
  original_prediction: number;
  counterfactual_prediction: number;
  decision_changed: boolean;
}

export interface CounterfactualData {
  record_index: number;
  original_prediction: number;
  flip_count: number;
  total_tested: number;
  flip_rate: number;
  narrative: string;
  entries: CounterfactualEntry[];
}

/** Legacy shape kept for backward compat */
export interface CounterfactualResult {
  recordIndex: number;
  originalPrediction: number;
  originalProtectedValue: string | number;
  counterfactuals: CounterfactualEntry[];
  narrative: string;
}

export interface ModelAuditSummary {
  model_type: string;
  historical_fairness?: FairnessMetrics;
  model_fairness?: FairnessMetrics;
  model_accuracy: number;
  model_file_size_kb?: number;
  prediction_counts?: Record<string, number>;
  feature_columns?: string[];
  counterfactual_data?: CounterfactualData;
}
type FirestoreTimestamp =
  | { seconds?: number; toDate?: () => Date }
  | Date
  | string
  | number
  | null;


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
  modelPath?: string | null;
  modelFramework?: "sklearn" | "onnx" | null;
  modelFileName?: string | null;
  modelFileSize?: number | null;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  completedAt?: FirestoreTimestamp;
  taskId?: string;
  error?: string;
  results?: {
    fairnessMetrics: FairnessMetrics;
    geminiOutput: GeminiOutput;
    piiDetection: PIIDetectionResult;
    rowCount: number;
    modelAudit?: ModelAuditSummary;
  };
}
