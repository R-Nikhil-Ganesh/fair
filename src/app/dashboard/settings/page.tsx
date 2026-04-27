"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Save, ServerCrash } from "lucide-react";
import { PageTitle } from "@/components/ui/PageTitle";

type CloudServiceStatus = {
  ok: boolean;
  message: string;
};

type CloudHealthResponse = {
  status: "ok" | "degraded";
  checkedAt: string;
  services: {
    firestore?: CloudServiceStatus;
    storage?: CloudServiceStatus;
    celeryBroker?: CloudServiceStatus;
    gemini?: CloudServiceStatus;
  };
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

function ServiceBadge({ service }: { service?: CloudServiceStatus }) {
  if (!service) {
    return (
      <span className="badge badge-warning flex items-center gap-1">
        <Clock3 size={12} /> Unknown
      </span>
    );
  }

  if (service.ok) {
    return (
      <span className="badge badge-success flex items-center gap-1">
        <CheckCircle2 size={12} /> Reachable
      </span>
    );
  }

  return (
    <span className="badge badge-destructive flex items-center gap-1">
      <AlertTriangle size={12} /> Unreachable
    </span>
  );
}

export default function SettingsPage() {
  const [cloudHealth, setCloudHealth] = useState<CloudHealthResponse | null>(null);
  const [checkingCloud, setCheckingCloud] = useState(false);
  const [cloudError, setCloudError] = useState("");

  const cloudBase = useMemo(() => BACKEND_URL.trim(), []);

  const checkCloudHealth = async () => {
    if (!cloudBase) {
      setCloudError("NEXT_PUBLIC_BACKEND_URL is not configured. Cannot run cloud checks.");
      return;
    }

    setCheckingCloud(true);
    setCloudError("");

    try {
      const response = await fetch(`${cloudBase}/api/cloud/health`);
      if (!response.ok) {
        throw new Error(`Cloud health check failed with HTTP ${response.status}`);
      }

      const payload = (await response.json()) as CloudHealthResponse;
      setCloudHealth(payload);
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : "Cloud health check failed.");
      setCloudHealth(null);
    } finally {
      setCheckingCloud(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <PageTitle
        title="Settings"
        subtitle="Manage your organization's fairness and compliance preferences."
      />

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h3 className="text-lg mb-2">Audit Thresholds</h3>
          <p className="text-sm text-muted-foreground">Configure the statistical parity limits that trigger alerts in your dashboard.</p>
        </div>
        <div className="md:col-span-2 card flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Disparate Impact Ratio Threshold (80% Rule)</label>
            <input type="number" className="form-input max-w-[150px]" defaultValue={0.80} step={0.01} min={0.5} max={1.0} />
            <span className="text-xs text-muted-foreground">Alerts if the approval rate of any group is less than 80% of the privileged group.</span>
          </div>
          <div className="form-group">
            <label className="form-label">Statistical Significance (p-value)</label>
            <input type="number" className="form-input max-w-[150px]" defaultValue={0.05} step={0.01} min={0.01} max={0.10} />
          </div>
          <div className="border-t border-border pt-4 flex justify-end">
            <button className="btn btn-primary flex items-center gap-2">
              <Save size={16} /> Save Thresholds
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 border-t border-border pt-6">
        <div className="md:col-span-1">
          <h3 className="text-lg mb-2">Cloud Diagnostics</h3>
          <p className="text-sm text-muted-foreground">
            Verify cloud services used by the audit pipeline are reachable and configured.
          </p>
        </div>
        <div className="md:col-span-2 card flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border border-border rounded-lg bg-muted/30">
            <div>
              <div className="font-semibold">Run Cloud Health Checks</div>
              <div className="text-sm text-muted-foreground">
                Checks Firestore, Cloud Storage, Celery broker, and Gemini configuration.
              </div>
            </div>
            <button
              type="button"
              onClick={checkCloudHealth}
              disabled={checkingCloud}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw size={16} className={checkingCloud ? "animate-spin" : ""} />
              {checkingCloud ? "Checking..." : "Check Now"}
            </button>
          </div>

          {cloudError ? (
            <div className="p-4 border border-destructive/30 bg-destructive/10 rounded-lg text-sm text-destructive flex items-start gap-2">
              <ServerCrash size={16} className="shrink-0 mt-0.5" />
              <span>{cloudError}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <div className="font-semibold">Google Firestore</div>
              <div className="text-sm text-muted-foreground">Audit documents and status tracking.</div>
            </div>
            <ServiceBadge service={cloudHealth?.services.firestore} />
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <div className="font-semibold">Cloud Storage</div>
              <div className="text-sm text-muted-foreground">CSV and model artifact storage.</div>
            </div>
            <ServiceBadge service={cloudHealth?.services.storage} />
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <div className="font-semibold">Celery Broker (Redis)</div>
              <div className="text-sm text-muted-foreground">Queue transport for audit worker tasks.</div>
            </div>
            <ServiceBadge service={cloudHealth?.services.celeryBroker} />
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <div className="font-semibold">Gemini / Vertex AI Config</div>
              <div className="text-sm text-muted-foreground">Narrative and mitigation generation setup.</div>
            </div>
            <ServiceBadge service={cloudHealth?.services.gemini} />
          </div>

          {cloudHealth ? (
            <div className="text-xs text-muted-foreground">
              Last checked: {new Date(cloudHealth.checkedAt).toLocaleString()} • Overall: {cloudHealth.status}
            </div>
          ) : null}

          <div className="text-xs text-muted-foreground border-t border-border pt-3">
            If audits remain in processing, run checks and inspect any service marked unreachable.
          </div>
        </div>
      </div>
    </div>
  );
}
