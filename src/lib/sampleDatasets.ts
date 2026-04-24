// src/lib/sampleDatasets.ts

export interface SampleDatasetMeta {
  key: string;
  name: string;
  description: string;
  domain: "lending" | "employment" | "insurance";
  source: string;
  rows: number;
  protectedAttribute: string;
  targetColumn: string;
  favorableLabel: number;
  availableProtectedAttributes: string[];
  contextNote: string;  // shown to user before running audit
}

export const SAMPLE_DATASETS: SampleDatasetMeta[] = [
  {
    key: "german_credit",
    name: "German Credit Dataset",
    description: "Bank credit approval decisions with demographic information.",
    domain: "lending",
    source: "UCI Machine Learning Repository",
    rows: 1000,
    protectedAttribute: "sex",
    targetColumn: "credit_risk",
    favorableLabel: 1,
    availableProtectedAttributes: ["sex", "age"],
    contextNote:
      "This dataset contains real historical credit decisions from a German bank. " +
      "It is widely used in fairness research and has documented gender bias.",
  },
  {
    key: "compas",
    name: "COMPAS Recidivism Dataset",
    description: "Criminal risk scores used by US courts, analyzed by ProPublica.",
    domain: "lending",  // closest vertical; judicial domain not in our list
    source: "ProPublica (2016 investigation)",
    rows: 7214,
    protectedAttribute: "race",
    targetColumn: "two_year_recid",
    favorableLabel: 0,  // 0 = did not reoffend (favorable)
    availableProtectedAttributes: ["race", "sex"],
    contextNote:
      "This is the dataset from ProPublica's landmark 2016 investigation that found " +
      "COMPAS scores flagged Black defendants as high-risk at twice the rate of white " +
      "defendants with identical criminal histories.",
  },
  {
    key: "adult_income",
    name: "Adult Income Dataset",
    description: "US Census data predicting income >$50K, used for employment bias research.",
    domain: "employment",
    source: "UCI Machine Learning Repository (US Census 1994)",
    rows: 48842,
    protectedAttribute: "sex",
    targetColumn: "income",
    favorableLabel: 1,
    availableProtectedAttributes: ["sex", "race"],
    contextNote:
      "This dataset is frequently used to audit hiring and income prediction models. " +
      "It shows documented gender and racial disparities in income classification.",
  },
];

export function getSampleDataset(key: string): SampleDatasetMeta | undefined {
  return SAMPLE_DATASETS.find(d => d.key === key);
}
