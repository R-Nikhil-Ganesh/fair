import { AuditReport } from './types';

export const mockAudits: AuditReport[] = [
  {
    id: "aud_9a8b7c6d5e",
    date: "2026-04-20T10:30:00Z",
    datasetName: "Q1_Mortgage_Approvals.csv",
    totalRecords: 15420,
    protectedAttribute: "Gender",
    targetColumn: "Loan_Approved",
    overallApprovalRate: 0.68,
    status: "completed",
    disparities: [
      { group: 'Male', approvalRate: 0.74, disparityRatio: 1.0, flagged: false },
      { group: 'Female', approvalRate: 0.58, disparityRatio: 0.78, flagged: true },
      { group: 'Non-binary', approvalRate: 0.65, disparityRatio: 0.87, flagged: false }
    ],
    geminiSummary: "The audit identified a potential fairness issue regarding Gender. Female applicants have a significantly lower approval rate (58%) compared to Male applicants (74%), resulting in a disparity ratio of 0.78, which falls below the standard 80% parity threshold.",
    recommendations: [
      "Check for proxy variables in the dataset that correlate highly with Gender, such as career type or specific regional zip codes.",
      "Consider adjusting the classification threshold for the disadvantaged group to achieve demographic parity."
    ]
  },
  {
    id: "aud_1f2e3d4c5b",
    date: "2026-04-15T14:45:00Z",
    datasetName: "AutoLoans_2025_Final.csv",
    totalRecords: 8900,
    protectedAttribute: "Region",
    targetColumn: "Approved",
    overallApprovalRate: 0.82,
    status: "completed",
    disparities: [
      { group: 'Urban', approvalRate: 0.84, disparityRatio: 1.0, flagged: false },
      { group: 'Suburban', approvalRate: 0.83, disparityRatio: 0.98, flagged: false },
      { group: 'Rural', approvalRate: 0.79, disparityRatio: 0.94, flagged: false }
    ],
    geminiSummary: "The model appears to be performing fairly across different regions. All regional groups have approval rates within acceptable variance of the privileged group (Urban). No significant disparate impact detected.",
    recommendations: [
      "Maintain current model parameters.",
      "Schedule next routine fairness audit in 90 days."
    ]
  },
  {
    id: "aud_5x6y7z8w9v",
    date: "2026-04-21T09:15:00Z",
    datasetName: "SME_Business_Loans_v2.csv",
    totalRecords: 3200,
    protectedAttribute: "Age_Bracket",
    targetColumn: "Decision",
    overallApprovalRate: 0.45,
    status: "processing",
    disparities: []
  }
];
