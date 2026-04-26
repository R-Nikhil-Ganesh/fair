"use client";

import { Save } from "lucide-react";
import { PageTitle } from "@/components/ui/PageTitle";

export default function SettingsPage() {
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
          <h3 className="text-lg mb-2">Integrations</h3>
          <p className="text-sm text-muted-foreground">Manage external services for reporting and ML processing.</p>
        </div>
        <div className="md:col-span-2 card flex flex-col gap-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <div className="font-semibold">Google Cloud Vertex AI</div>
              <div className="text-sm text-muted-foreground">Used for computing large dataset fairness metrics.</div>
            </div>
            <span className="badge badge-success">Connected</span>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <div className="font-semibold">Gemini 1.5 Pro</div>
              <div className="text-sm text-muted-foreground">Used for generating plain-English compliance summaries.</div>
            </div>
            <span className="badge badge-success">Connected</span>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg opacity-60">
            <div>
              <div className="font-semibold">Slack Integrations</div>
              <div className="text-sm text-muted-foreground">Send automated alerts when a new model violates thresholds.</div>
            </div>
            <button className="btn btn-secondary text-xs">Connect</button>
          </div>
        </div>
      </div>
    </div>
  );
}
