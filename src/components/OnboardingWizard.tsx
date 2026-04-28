"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import { checkColumnsForPII } from "@/lib/piiDetector";
import { SAMPLE_DATASETS, type SampleDatasetMeta } from "@/lib/sampleDatasets";
import { logAuditEvent } from "@/lib/firebaseAnalytics";
import { useAnnounce } from "./AccessibilityWrapper";

const DOMAINS = [
  {
    key: "lending" as const,
    label: "Lending & Credit",
    description: "Audit loan approvals, credit decisions, mortgage applications.",
    legalRef: "ECOA (Equal Credit Opportunity Act), Fair Housing Act",
    color: "border-blue-500 bg-blue-50",
  },
  {
    key: "employment" as const,
    label: "Employment",
    description: "Audit hiring decisions, performance reviews, promotion algorithms.",
    legalRef: "EEOC four-fifths rule, Title VII Civil Rights Act",
    color: "border-green-500 bg-green-50",
  },
  {
    key: "insurance" as const,
    label: "Insurance",
    description: "Audit risk scoring, premium pricing, claim denial decisions.",
    legalRef: "Fair Credit Reporting Act, state insurance regulations",
    color: "border-purple-500 bg-purple-50",
  },
];

interface OnboardingWizardProps {
  onComplete: (config: {
    domain: "lending" | "employment" | "insurance";
    file?: File;
    modelFile?: File;
    modelFramework?: "sklearn" | "onnx";
    sampleDatasetKey?: string;
    protectedAttribute: string;
    targetColumn: string;
    favorableLabel: number;
    headers: string[];
  }) => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const announce = useAnnounce();
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState<"lending" | "employment" | "insurance" | null>(null);
  const [dataSource, setDataSource] = useState<"upload" | "sample" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelFramework, setModelFramework] = useState<"sklearn" | "onnx">("sklearn");
  const [selectedSample, setSelectedSample] = useState<SampleDatasetMeta | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [protectedAttribute, setProtectedAttribute] = useState("");
  const [targetColumn, setTargetColumn] = useState("");
  const [favorableLabel, setFavorableLabel] = useState(1);
  const [piiWarnings, setPiiWarnings] = useState<{ columnName: string; piiType: string }[]>([]);
  const [piiAcknowledged, setPiiAcknowledged] = useState(false);
  const [isParsingCSV, setIsParsingCSV] = useState(false);

  const handleDomainSelect = (d: typeof domain) => {
    setDomain(d);
    announce(`${d} domain selected`);
    setTimeout(() => setStep(2), 300);
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setIsParsingCSV(true);
      setFile(f);

      Papa.parse(f, {
        header: true,
        preview: 20,
        skipEmptyLines: true,
        complete: (results) => {
          const cols = results.meta.fields || [];
          const rows = results.data as Record<string, string>[];
          setHeaders(cols);
          const warnings = checkColumnsForPII(cols, rows);
          setPiiWarnings(warnings);
          setIsParsingCSV(false);
          setStep(3);
          announce(`CSV loaded with ${cols.length} columns. Please map the required fields.`);
        },
        error: () => {
          setIsParsingCSV(false);
          announce("Failed to parse CSV. Please check the file format.", "assertive");
        },
      });
    },
    [announce]
  );

  const handleSampleSelect = (sample: SampleDatasetMeta) => {
    setSelectedSample(sample);
    setModelFile(null);
    setHeaders(["sex", "age", "credit_amount", "duration", "credit_risk"]);
    setProtectedAttribute(sample.protectedAttribute);
    setTargetColumn(sample.targetColumn);
    setFavorableLabel(sample.favorableLabel);
    setStep(3);
    announce(`${sample.name} selected. Review the column mapping.`);
  };

  const handleModelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setModelFile(f);
    announce(`Model artifact selected: ${f.name}`);
  };

  const handleColumnMappingNext = () => {
    if (!protectedAttribute || !targetColumn) {
      announce("Please select both a protected attribute and a target column.", "assertive");
      return;
    }
    if (piiWarnings.length > 0 && !piiAcknowledged) {
      setStep(4);
      announce("PII detected in your dataset. Please review the warning.");
      return;
    }
    handleComplete();
  };

  const handleComplete = () => {
    logAuditEvent("onboarding_completed", { domain: domain!, dataSource: dataSource! });
    onComplete({
      domain: domain!,
      file: file ?? undefined,
      modelFile: modelFile ?? undefined,
      modelFramework,
      sampleDatasetKey: selectedSample?.key,
      protectedAttribute,
      targetColumn,
      favorableLabel,
      headers,
    });
  };

  const STEP_LABELS = ["Choose domain", "Choose data", "Map columns", "Review PII"];
  const totalSteps = piiWarnings.length > 0 ? 4 : 3;

  return (
    <div className="onboarding-wizard" role="main" aria-label="Audit setup wizard">
      <nav aria-label="Setup progress" className="wizard-progress">
        <ol className="wizard-progress-list">
          {STEP_LABELS.slice(0, totalSteps).map((label, i) => (
            <li key={label} className="wizard-progress-item">
              <div
                className={`wizard-progress-step w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                  i + 1 < step
                    ? "bg-green-600 text-white"
                    : i + 1 === step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
                aria-current={i + 1 === step ? "step" : undefined}
              >
                {i + 1 < step ? "✓" : i + 1}
              </div>
              <span className={`wizard-progress-label text-sm hidden sm:block ${i + 1 === step ? "font-medium" : "text-gray-500"}`}>
                {label}
              </span>
              {i < totalSteps - 1 && <div className="wizard-progress-connector" />}
            </li>
          ))}
        </ol>
      </nav>

      {step === 1 && (
        <section aria-labelledby="step1-heading" className="wizard-section">
          <h2 id="step1-heading" className="wizard-title">
            What are you auditing?
          </h2>
          <p className="wizard-description">
            Select the domain that matches your decision system. This sets the legal thresholds
            used for bias flagging.
          </p>
          <div className="wizard-grid">
            {DOMAINS.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => handleDomainSelect(d.key)}
                className={`wizard-domain-card text-left p-4 rounded-xl border-2 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  domain === d.key ? d.color : "border-gray-200 hover:border-gray-300"
                }`}
                aria-pressed={domain === d.key}
              >
                <div className="wizard-card-title font-semibold text-gray-900">{d.label}</div>
                <div className="wizard-card-text text-sm text-gray-600 mt-1">{d.description}</div>
                <div className="wizard-card-meta text-xs text-gray-400 mt-2">Legal basis: {d.legalRef}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && domain && (
        <section aria-labelledby="step2-heading" className="wizard-section">
          <h2 id="step2-heading" className="wizard-title">
            Choose your data source
          </h2>
          <div className="wizard-source-grid">
            <button
              type="button"
              onClick={() => setDataSource("upload")}
              className={`wizard-source-card p-4 rounded-xl border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                dataSource === "upload" ? "border-blue-500 bg-blue-50" : "border-gray-200"
              }`}
              aria-pressed={dataSource === "upload"}
            >
              <div className="font-medium">Upload my CSV</div>
              <div className="text-sm text-gray-500 mt-1">Up to 50MB, any delimiter</div>
            </button>
            <button
              type="button"
              onClick={() => setDataSource("sample")}
              className={`wizard-source-card p-4 rounded-xl border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                dataSource === "sample" ? "border-blue-500 bg-blue-50" : "border-gray-200"
              }`}
              aria-pressed={dataSource === "sample"}
            >
              <div className="font-medium">Use sample dataset</div>
              <div className="text-sm text-gray-500 mt-1">Run a demo audit instantly</div>
            </button>
          </div>

          {dataSource === "upload" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="wizard-upload-panel bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                <label htmlFor="csv-upload" className="block text-sm font-medium text-zinc-200 mb-2">
                  Evaluation Dataset
                </label>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isParsingCSV}
                  className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
                  aria-describedby="csv-upload-help"
                />
                <p id="csv-upload-help" className="text-xs text-zinc-500 mt-2">
                  CSV must have a header row. Column names will be auto-detected.
                </p>
                {isParsingCSV && (
                  <p className="text-sm text-blue-400 mt-2" role="status">
                    Parsing CSV...
                  </p>
                )}
              </div>

              <div className="wizard-upload-panel bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                <label className="block text-sm font-medium text-zinc-200 mb-2">
                  Model Artifact (Optional)
                </label>
                <input
                  type="file"
                  accept=".pkl,.onnx"
                  onChange={handleModelFileChange}
                  className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
                />
                <p className="text-xs text-zinc-500 mt-2">Accepted formats: .pkl, .onnx</p>

                {modelFile && (
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Model Framework
                    </label>
                    <select
                      value={modelFramework}
                      onChange={(e) => setModelFramework(e.target.value as "sklearn" | "onnx")}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="sklearn">Scikit-Learn (.pkl)</option>
                      <option value="onnx">ONNX (.onnx)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {dataSource === "sample" && (
            <div className="wizard-grid">
              {SAMPLE_DATASETS.filter((d) => d.domain === domain || domain === "lending").map((sample) => (
                <button
                  key={sample.key}
                  type="button"
                  onClick={() => handleSampleSelect(sample)}
                  className="wizard-sample-card text-left p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{sample.name}</div>
                      <div className="text-sm text-gray-500 mt-1">{sample.description}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Source: {sample.source} · {sample.rows.toLocaleString()} rows
                      </div>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full shrink-0 ml-3">
                      {sample.rows > 1000 ? "Large" : "Small"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded">
                    {sample.contextNote}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 3 && (
        <section aria-labelledby="step3-heading" className="wizard-section">
          <h2 id="step3-heading" className="wizard-title">
            Map your columns
          </h2>
          <p className="wizard-description">
            Tell FairLens which column contains the protected attribute (e.g. gender, race) and
            which column contains the decision outcome.
          </p>

          <div className="wizard-form-stack">
            <div>
              <label htmlFor="protected-attr" className="wizard-label block text-sm font-medium mb-1">
                Protected attribute column
                <span className="text-gray-400 font-normal ml-1">
                  (the demographic variable to audit)
                </span>
              </label>
              <select
                id="protected-attr"
                value={protectedAttribute}
                onChange={(e) => setProtectedAttribute(e.target.value)}
                className="wizard-select w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
              >
                <option value="">Select column...</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="target-col" className="wizard-label block text-sm font-medium mb-1">
                Decision outcome column
                <span className="text-gray-400 font-normal ml-1">
                  (the column containing approved/denied, 0/1, etc.)
                </span>
              </label>
              <select
                id="target-col"
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="wizard-select w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
              >
                <option value="">Select column...</option>
                {headers
                  .filter((h) => h !== protectedAttribute)
                  .map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label htmlFor="favorable-label" className="block text-sm font-medium mb-1">
                Which value means &quot;favorable&quot; (approved)?
              </label>
              <div id="favorable-label" className="flex gap-3">
                {[1, 0].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFavorableLabel(val)}
                    className={`wizard-chip-button px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      favorableLabel === val
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-700"
                    }`}
                    aria-pressed={favorableLabel === val}
                  >
                    {val} {val === 1 ? "(approved / yes / positive)" : "(denied / no / negative)"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleColumnMappingNext}
            disabled={!protectedAttribute || !targetColumn}
            className="wizard-primary-button mt-8 w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
          >
            {piiWarnings.length > 0 ? "Review PII Warning →" : "Start Audit →"}
          </button>
        </section>
      )}

      {step === 4 && piiWarnings.length > 0 && (
        <section aria-labelledby="step4-heading" role="alert" className="wizard-section">
          <div className="wizard-pii-panel bg-amber-50 border-2 border-amber-400 rounded-xl p-5 mb-6">
            <h2 id="step4-heading" className="wizard-title text-lg font-semibold text-amber-900 mb-2">
              Potential PII detected
            </h2>
            <p className="text-sm text-amber-800 mb-4">
              The following columns may contain personally identifiable information. FairLens will
              process but not store these values. You may want to anonymize them before uploading.
            </p>
            <ul className="space-y-2">
              {piiWarnings.map((w) => (
                <li key={w.columnName} className="flex items-center gap-2 text-sm text-amber-800">
                  <span className="font-mono bg-amber-100 px-2 py-0.5 rounded">{w.columnName}</span>
                  <span>→ looks like {w.piiType}</span>
                </li>
              ))}
            </ul>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={piiAcknowledged}
              onChange={(e) => setPiiAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              aria-required="true"
            />
            <span className="text-sm text-gray-700">
              I understand this data may contain PII and confirm I have the right to process it
              for bias auditing purposes.
            </span>
          </label>
          <button
            type="button"
            onClick={handleComplete}
            disabled={!piiAcknowledged}
            className="wizard-primary-button mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Acknowledge and Start Audit →
          </button>
        </section>
      )}
    </div>
  );
}
