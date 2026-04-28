import { Info, Loader2, UploadCloud } from "lucide-react";

interface NewAuditFormProps {
  file: File | null;
  modelFile: File | null;
  modelFramework: "sklearn" | "onnx";
  headers: string[];
  targetColumn: string;
  protectedAttribute: string;
  mode: "lending" | "employment" | "insurance";
  isUploading: boolean;
  disabled: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onModelFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onModelFrameworkChange: (value: "sklearn" | "onnx") => void;
  onTargetColumnChange: (value: string) => void;
  onProtectedAttributeChange: (value: string) => void;
  onModeChange: (value: "lending" | "employment" | "insurance") => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function NewAuditForm(props: NewAuditFormProps) {
  const {
    file,
    modelFile,
    modelFramework,
    headers,
    targetColumn,
    protectedAttribute,
    mode,
    isUploading,
    disabled,
    onFileUpload,
    onModelFileUpload,
    onModelFrameworkChange,
    onTargetColumnChange,
    onProtectedAttributeChange,
    onModeChange,
    onSubmit,
  } = props;

  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-6">
      <h2 className="text-xl">Configure Fairness Audit</h2>

      <div className="form-group">
        <label className="form-label font-semibold">1. Upload Assets</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-2 border-dashed border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center text-center bg-zinc-950/80 hover:border-zinc-700 transition-colors relative cursor-pointer focus-within:ring-2 focus-within:ring-blue-500/50">
            <input
              type="file"
              accept=".csv,.parquet"
              onChange={onFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              required
            />
            <UploadCloud size={32} className="text-zinc-400 mb-3" />
            {file ? (
              <div>
                <p className="font-medium text-zinc-100">{file.name}</p>
                <p className="text-xs text-zinc-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-zinc-100">Dataset Upload</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Click or drag your evaluation dataset here.
                </p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[0.7rem] font-mono text-zinc-400">
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5">CSV</span>
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5">PARQUET</span>
            </div>
          </div>

          <div className="border-2 border-dashed border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center text-center bg-zinc-950/80 hover:border-zinc-700 transition-colors relative cursor-pointer focus-within:ring-2 focus-within:ring-blue-500/50">
            <input
              type="file"
              accept=".pkl,.onnx"
              onChange={onModelFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              required
            />
            <UploadCloud size={32} className="text-zinc-400 mb-3" />
            {modelFile ? (
              <div>
                <p className="font-medium text-zinc-100">{modelFile.name}</p>
                <p className="text-xs text-zinc-400 mt-1">{(modelFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-zinc-100">Model Artifact Upload</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Upload the trained model used for scoring.
                </p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[0.7rem] font-mono text-zinc-400">
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5">PKL</span>
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5">ONNX</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="form-label font-semibold">Model Framework</label>
          <select
            className="form-select w-full bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            value={modelFramework}
            onChange={(event) => onModelFrameworkChange(event.target.value as "sklearn" | "onnx")}
            required
          >
            <option value="sklearn">Scikit-Learn (.pkl)</option>
            <option value="onnx">ONNX (.onnx)</option>
          </select>
        </div>
      </div>

      {headers.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6 p-4 bg-muted rounded-lg border border-border">
          <div className="form-group mb-0">
            <label className="form-label">Protected Attribute</label>
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Info size={12} /> Sensitive group to audit (for example, Gender)
            </div>
            <select
              className="form-select w-full"
              value={protectedAttribute}
              onChange={(event) => onProtectedAttributeChange(event.target.value)}
              required
            >
              <option value="" disabled>
                Select column...
              </option>
              {headers.map((header) => (
                <option key={`pa-${header}`} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Target Decision</label>
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Info size={12} /> Label column that stores approval outcome
            </div>
            <select
              className="form-select w-full"
              value={targetColumn}
              onChange={(event) => onTargetColumnChange(event.target.value)}
              required
            >
              <option value="" disabled>
                Select column...
              </option>
              {headers.map((header) => (
                <option key={`td-${header}`} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className="form-group">
        <label className="form-label font-semibold">2. Select Domain</label>
        <div className="grid md:grid-cols-3 gap-3 mt-2">
          <label
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              mode === "lending"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            <input
              type="radio"
              name="mode"
              value="lending"
              checked={mode === "lending"}
              onChange={() => onModeChange("lending")}
              className="sr-only"
            />
            <div className="font-medium mb-1">Lending</div>
            <div className="text-xs text-muted-foreground">Optimized for credit approval checks.</div>
          </label>

          <label
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              mode === "employment"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            <input
              type="radio"
              name="mode"
              value="employment"
              checked={mode === "employment"}
              onChange={() => onModeChange("employment")}
              className="sr-only"
            />
            <div className="font-medium mb-1">Employment</div>
            <div className="text-xs text-muted-foreground">Resume and screening fairness checks.</div>
          </label>

          <label
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              mode === "insurance"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            <input
              type="radio"
              name="mode"
              value="insurance"
              checked={mode === "insurance"}
              onChange={() => onModeChange("insurance")}
              className="sr-only"
            />
            <div className="font-medium mb-1">Insurance</div>
            <div className="text-xs text-muted-foreground">Claims and underwriting parity checks.</div>
          </label>
        </div>
      </div>

      <div className="border-t border-border pt-6 flex justify-end">
        <button type="submit" className="btn btn-primary px-8" disabled={disabled}>
          {isUploading ? (
            <>
              <Loader2 size={18} className="animate-spin mr-2" />
              Initiating Audit...
            </>
          ) : (
            "Start Fairness Audit"
          )}
        </button>
      </div>
    </form>
  );
}
