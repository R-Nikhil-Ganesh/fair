"use client";

import { useState, useCallback } from "react";
import { UploadCloud, FileText, Cpu, CheckCircle2 } from "lucide-react";
import Papa from "papaparse";
import { checkColumnsForPII } from "@/lib/piiDetector";
import { SAMPLE_DATASETS, type SampleDatasetMeta } from "@/lib/sampleDatasets";
import { logAuditEvent } from "@/lib/firebaseAnalytics";
import { useAnnounce } from "./AccessibilityWrapper";

/* ── Shared style tokens ──────────────────────────────────────── */
const S = {
  card: {
    background: "#111111",
    border: "1px solid #27272a",
    borderRadius: "0.85rem",
    padding: "1rem 1.25rem",
  } as React.CSSProperties,
  label: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#a1a1aa",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: "0.35rem",
    display: "block",
  },
  select: {
    width: "100%",
    background: "#09090b",
    border: "1px solid #27272a",
    borderRadius: "0.6rem",
    padding: "0.55rem 0.75rem",
    fontSize: "0.875rem",
    color: "#f4f4f5",
    outline: "none",
    cursor: "pointer",
  } as React.CSSProperties,
  primaryBtn: {
    width: "100%",
    background: "linear-gradient(180deg,#2f7bff 0%,#1a5fd4 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "0.75rem",
    padding: "0.8rem 1rem",
    fontSize: "0.92rem",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "1.25rem",
    transition: "filter 0.15s ease",
  } as React.CSSProperties,
};

const DOMAINS = [
  { key: "lending" as const,    label: "Lending & Credit",  desc: "Loan approvals, credit decisions, mortgages.", ref: "ECOA, Fair Housing Act",         accent: "#3b82f6" },
  { key: "employment" as const, label: "Employment",         desc: "Hiring decisions, performance, promotions.",  ref: "EEOC four-fifths rule, Title VII", accent: "#10b981" },
  { key: "insurance" as const,  label: "Insurance",          desc: "Risk scoring, claim denials, premium pricing.",ref: "FCRA, state insurance regs",       accent: "#a855f7" },
];

/* ── Drop zone ────────────────────────────────────────────────── */
function DropZone({
  id, accept, label, sub, icon: Icon, file, onChange, disabled,
}: {
  id: string; accept: string; label: string; sub: string;
  icon: React.ElementType; file?: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <label
      htmlFor={id}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: "0.5rem",
        padding: "1.5rem 1rem",
        borderRadius: "0.85rem",
        border: `2px dashed ${file ? "#3b82f6" : hover ? "#52525b" : "#27272a"}`,
        background: file ? "rgba(59,130,246,0.07)" : hover ? "rgba(255,255,255,0.03)" : "#09090b",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
        position: "relative",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={onChange}
        disabled={disabled}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
      />
      <Icon size={28} style={{ color: file ? "#60a5fa" : "#52525b" }} />
      {file ? (
        <>
          <p style={{ color: "#f4f4f5", fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>{file.name}</p>
          <p style={{ color: "#71717a", fontSize: "0.72rem", margin: 0 }}>{(file.size / 1024).toFixed(1)} KB</p>
        </>
      ) : (
        <>
          <p style={{ color: "#e4e4e7", fontSize: "0.875rem", fontWeight: 500, margin: 0 }}>{label}</p>
          <p style={{ color: "#71717a", fontSize: "0.75rem", margin: 0 }}>{sub}</p>
        </>
      )}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "center" }}>
        {accept.split(",").map(ext => (
          <span
            key={ext}
            style={{
              fontSize: "0.65rem", fontFamily: "monospace",
              background: "#18181b", border: "1px solid #27272a",
              borderRadius: 999, padding: "0.1rem 0.4rem", color: "#71717a",
            }}
          >
            {ext.replace(".", "").toUpperCase()}
          </span>
        ))}
      </div>
    </label>
  );
}

/* ── Step pill ────────────────────────────────────────────────── */
function StepPill({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.72rem", fontWeight: 700,
        background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(59,130,246,0.15)" : "#18181b",
        color: done ? "#34d399" : active ? "#60a5fa" : "#52525b",
        border: `1px solid ${done ? "rgba(16,185,129,0.3)" : active ? "rgba(59,130,246,0.35)" : "#27272a"}`,
      }}>
        {done ? "✓" : n}
      </div>
      <span style={{
        fontSize: "0.78rem", fontWeight: active ? 600 : 400,
        color: active ? "#f4f4f5" : done ? "#71717a" : "#52525b",
      }}>
        {label}
      </span>
    </div>
  );
}

/* ── Main wizard ──────────────────────────────────────────────── */
interface OnboardingWizardProps {
  onComplete: (config: {
    domain: "lending" | "employment" | "insurance";
    file?: File; modelFile?: File; modelFramework?: "sklearn" | "onnx";
    sampleDatasetKey?: string;
    protectedAttribute: string; targetColumn: string; favorableLabel: number; headers: string[];
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
    setTimeout(() => setStep(2), 200);
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setIsParsingCSV(true);
    setFile(f);
    Papa.parse(f, {
      header: true, preview: 20, skipEmptyLines: true,
      complete: (results) => {
        const cols = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];
        setHeaders(cols);
        setPiiWarnings(checkColumnsForPII(cols, rows));
        setIsParsingCSV(false);
        setStep(3);
        announce(`CSV loaded: ${cols.length} columns detected.`);
      },
      error: () => { setIsParsingCSV(false); announce("Failed to parse CSV.", "assertive"); },
    });
  }, [announce]);

  const handleSampleSelect = (sample: SampleDatasetMeta) => {
    setSelectedSample(sample);
    setModelFile(null);
    setHeaders(["sex", "age", "credit_amount", "duration", "credit_risk"]);
    setProtectedAttribute(sample.protectedAttribute);
    setTargetColumn(sample.targetColumn);
    setFavorableLabel(sample.favorableLabel);
    setStep(3);
    announce(`${sample.name} selected.`);
  };

  const handleModelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setModelFile(f);
    announce(`Model artifact selected: ${f.name}`);
  };

  const handleColumnMappingNext = () => {
    if (!protectedAttribute || !targetColumn) { announce("Please select both a protected attribute and target column.", "assertive"); return; }
    if (piiWarnings.length > 0 && !piiAcknowledged) { setStep(4); announce("PII detected. Please review."); return; }
    handleComplete();
  };

  const handleComplete = () => {
    logAuditEvent("onboarding_completed", { domain: domain!, dataSource: dataSource! });
    onComplete({ domain: domain!, file: file ?? undefined, modelFile: modelFile ?? undefined, modelFramework, sampleDatasetKey: selectedSample?.key, protectedAttribute, targetColumn, favorableLabel, headers });
  };

  const totalSteps = piiWarnings.length > 0 ? 4 : 3;
  const STEP_LABELS = ["Choose domain", "Choose data", "Map columns", "Review PII"];

  return (
    <div
      style={{
        background: "#0b0b0b",
        border: "1px solid #27272a",
        borderRadius: "1rem",
        overflow: "hidden",
      }}
    >
      {/* Progress nav */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
        padding: "0.85rem 1.25rem",
        borderBottom: "1px solid #1a1a1a",
        background: "#080808",
      }}>
        {STEP_LABELS.slice(0, totalSteps).map((label, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <StepPill n={i + 1} label={label} active={i + 1 === step} done={i + 1 < step} />
            {i < totalSteps - 1 && <div style={{ width: 20, height: 1, background: "#27272a" }} />}
          </div>
        ))}
      </div>

      {/* Content area */}
      <div style={{ padding: "1.5rem" }}>

        {/* ── Step 1: Domain ── */}
        {step === 1 && (
          <section aria-labelledby="s1">
            <h2 id="s1" style={{ color: "#f4f4f5", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.3rem" }}>What are you auditing?</h2>
            <p style={{ color: "#71717a", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Select the domain — this sets the legal thresholds used for bias flagging.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {DOMAINS.map((d) => {
                const active = domain === d.key;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => handleDomainSelect(d.key)}
                    aria-pressed={active}
                    style={{
                      textAlign: "left",
                      padding: "0.85rem 1rem",
                      borderRadius: "0.85rem",
                      border: `1.5px solid ${active ? d.accent : "#27272a"}`,
                      background: active ? `rgba(${d.accent === "#3b82f6" ? "59,130,246" : d.accent === "#10b981" ? "16,185,129" : "168,85,247"},0.08)` : "#111",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: active ? "#f4f4f5" : "#e4e4e7", fontSize: "0.92rem" }}>{d.label}</div>
                    <div style={{ color: "#71717a", fontSize: "0.8rem", marginTop: "0.2rem" }}>{d.desc}</div>
                    <div style={{ color: "#52525b", fontSize: "0.7rem", marginTop: "0.25rem" }}>Legal basis: {d.ref}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Step 2: Data source ── */}
        {step === 2 && domain && (
          <section aria-labelledby="s2">
            <h2 id="s2" style={{ color: "#f4f4f5", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.3rem" }}>Choose your data source</h2>
            <p style={{ color: "#71717a", fontSize: "0.85rem", marginBottom: "1rem" }}>Upload your own dataset or run a demo with sample data.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {(["upload", "sample"] as const).map(src => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setDataSource(src)}
                  aria-pressed={dataSource === src}
                  style={{
                    padding: "0.85rem",
                    borderRadius: "0.85rem",
                    border: `1.5px solid ${dataSource === src ? "#3b82f6" : "#27272a"}`,
                    background: dataSource === src ? "rgba(59,130,246,0.08)" : "#111",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#e4e4e7", fontSize: "0.875rem" }}>
                    {src === "upload" ? "Upload my CSV" : "Use sample dataset"}
                  </div>
                  <div style={{ color: "#71717a", fontSize: "0.75rem", marginTop: "0.2rem" }}>
                    {src === "upload" ? "Up to 50MB, any delimiter" : "Run a demo audit instantly"}
                  </div>
                </button>
              ))}
            </div>

            {dataSource === "upload" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <DropZone
                    id="csv-upload"
                    accept=".csv"
                    label="Evaluation Dataset"
                    sub="Click or drag your CSV here"
                    icon={FileText}
                    file={file}
                    onChange={handleFileChange}
                    disabled={isParsingCSV}
                  />
                  <DropZone
                    id="model-upload"
                    accept=".pkl,.onnx"
                    label="Model Artifact (Optional)"
                    sub="Upload trained model for dual audit"
                    icon={Cpu}
                    file={modelFile}
                    onChange={handleModelFileChange}
                  />
                </div>
                {isParsingCSV && (
                  <p style={{ color: "#60a5fa", fontSize: "0.82rem", marginTop: "0.5rem" }} role="status">Parsing CSV…</p>
                )}
                {modelFile && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <label style={S.label}>Model Framework</label>
                    <select
                      value={modelFramework}
                      onChange={e => setModelFramework(e.target.value as "sklearn" | "onnx")}
                      style={S.select}
                    >
                      <option value="sklearn">Scikit-Learn (.pkl)</option>
                      <option value="onnx">ONNX (.onnx)</option>
                    </select>
                  </div>
                )}
              </>
            )}

            {dataSource === "sample" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {SAMPLE_DATASETS.filter(d => d.domain === domain || domain === "lending").map(sample => (
                  <button
                    key={sample.key}
                    type="button"
                    onClick={() => handleSampleSelect(sample)}
                    style={{
                      textAlign: "left",
                      padding: "0.85rem 1rem",
                      borderRadius: "0.85rem",
                      border: "1px solid #27272a",
                      background: "#111",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#3b82f6"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#27272a"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "#f4f4f5", fontSize: "0.9rem" }}>{sample.name}</div>
                        <div style={{ color: "#71717a", fontSize: "0.78rem", marginTop: "0.15rem" }}>{sample.description}</div>
                        <div style={{ color: "#52525b", fontSize: "0.7rem", marginTop: "0.15rem" }}>
                          {sample.source} · {sample.rows.toLocaleString()} rows
                        </div>
                      </div>
                      <span style={{
                        fontSize: "0.65rem", background: "rgba(245,158,11,0.12)",
                        color: "#fcd34d", border: "1px solid rgba(245,158,11,0.3)",
                        borderRadius: 999, padding: "0.1rem 0.45rem", flexShrink: 0, marginLeft: "0.75rem",
                      }}>
                        {sample.rows > 1000 ? "Large" : "Small"}
                      </span>
                    </div>
                    <div style={{
                      marginTop: "0.5rem", fontSize: "0.75rem", color: "#60a5fa",
                      background: "rgba(59,130,246,0.08)", borderRadius: "0.4rem", padding: "0.35rem 0.5rem",
                    }}>
                      {sample.contextNote}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Step 3: Column mapping ── */}
        {step === 3 && (
          <section aria-labelledby="s3">
            <h2 id="s3" style={{ color: "#f4f4f5", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.3rem" }}>Map your columns</h2>
            <p style={{ color: "#71717a", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
              Tell FairLend which column contains the protected attribute and the decision outcome.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label htmlFor="pattr" style={S.label}>Protected attribute column</label>
                <select id="pattr" value={protectedAttribute} onChange={e => setProtectedAttribute(e.target.value)} style={S.select} aria-required="true">
                  <option value="">Select column…</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="tcol" style={S.label}>Decision outcome column</label>
                <select id="tcol" value={targetColumn} onChange={e => setTargetColumn(e.target.value)} style={S.select} aria-required="true">
                  <option value="">Select column…</option>
                  {headers.filter(h => h !== protectedAttribute).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Which value means "approved"?</label>
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  {[1, 0].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFavorableLabel(val)}
                      aria-pressed={favorableLabel === val}
                      style={{
                        flex: 1,
                        padding: "0.6rem 0.75rem",
                        borderRadius: "0.65rem",
                        border: `1.5px solid ${favorableLabel === val ? "#3b82f6" : "#27272a"}`,
                        background: favorableLabel === val ? "rgba(59,130,246,0.1)" : "#111",
                        color: favorableLabel === val ? "#93c5fd" : "#71717a",
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {val} — {val === 1 ? "approved / yes / positive" : "denied / no / negative"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleColumnMappingNext}
              disabled={!protectedAttribute || !targetColumn}
              style={{ ...S.primaryBtn, opacity: (!protectedAttribute || !targetColumn) ? 0.45 : 1, cursor: (!protectedAttribute || !targetColumn) ? "not-allowed" : "pointer" }}
            >
              {piiWarnings.length > 0 ? "Review PII Warning →" : "Start Audit →"}
            </button>
          </section>
        )}

        {/* ── Step 4: PII ── */}
        {step === 4 && piiWarnings.length > 0 && (
          <section aria-labelledby="s4" role="alert">
            <div style={{
              background: "rgba(245,158,11,0.08)",
              border: "1.5px solid rgba(245,158,11,0.35)",
              borderRadius: "0.85rem",
              padding: "1rem 1.1rem",
              marginBottom: "1.1rem",
            }}>
              <h2 id="s4" style={{ color: "#fde68a", fontWeight: 700, fontSize: "1rem", marginBottom: "0.4rem" }}>Potential PII detected</h2>
              <p style={{ color: "#fcd34d", fontSize: "0.82rem", marginBottom: "0.75rem" }}>
                These columns may contain personally identifiable information. FairLend processes but does not store them.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {piiWarnings.map(w => (
                  <li key={w.columnName} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#fde68a" }}>
                    <span style={{ fontFamily: "monospace", background: "rgba(245,158,11,0.15)", borderRadius: "0.3rem", padding: "0.1rem 0.4rem" }}>{w.columnName}</span>
                    <span style={{ color: "#a1a1aa" }}>→ looks like {w.piiType}</span>
                  </li>
                ))}
              </ul>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={piiAcknowledged}
                onChange={e => setPiiAcknowledged(e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0, accentColor: "#3b82f6" }}
                aria-required="true"
              />
              <span style={{ color: "#a1a1aa", fontSize: "0.85rem", lineHeight: 1.5 }}>
                I understand this data may contain PII and confirm I have the right to process it for bias auditing purposes.
              </span>
            </label>
            <button
              type="button"
              onClick={handleComplete}
              disabled={!piiAcknowledged}
              style={{ ...S.primaryBtn, opacity: !piiAcknowledged ? 0.45 : 1, cursor: !piiAcknowledged ? "not-allowed" : "pointer" }}
            >
              Acknowledge and Start Audit →
            </button>
          </section>
        )}

      </div>
    </div>
  );
}
