"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { uploadAndStartAudit, startSampleDatasetAudit } from "@/lib/ai";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { AuditProgress } from "@/components/AuditProgress";
import type { AuditDocument } from "@/lib/types";

type PageState = "wizard" | "uploading" | "processing" | "complete" | "error";

export default function NewAuditPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("wizard");
  const [auditId, setAuditId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  if (!user) return null;

  const handleWizardComplete = async (config: {
    domain: "lending" | "employment" | "insurance";
    file?: File;
    sampleDatasetKey?: string;
    protectedAttribute: string;
    targetColumn: string;
    favorableLabel: number;
  }) => {
    try {
      if (config.sampleDatasetKey) {
        setPageState("processing");
        const id = await startSampleDatasetAudit(config.sampleDatasetKey, {
          uid: user.uid,
          protectedAttribute: config.protectedAttribute,
          targetColumn: config.targetColumn,
          favorableLabel: config.favorableLabel,
          domain: config.domain,
        });
        setAuditId(id);
      } else if (config.file) {
        setPageState("uploading");
        const id = await uploadAndStartAudit(
          config.file,
          {
            uid: user.uid,
            protectedAttribute: config.protectedAttribute,
            targetColumn: config.targetColumn,
            favorableLabel: config.favorableLabel,
            domain: config.domain,
          },
          setUploadProgress
        );
        setAuditId(id);
        setPageState("processing");
      }
    } catch (e) {
      setErrorMessage(String(e));
      setPageState("error");
    }
  };

  const handleAuditComplete = (audit: AuditDocument) => {
    setPageState("complete");
    setTimeout(() => {
      router.push(`/audit/${audit.auditId}`);
    }, 1500);
  };

  return (
    <main className="audit-new-page" id="main-content">
      <div className="audit-new-container">
        <section className="audit-new-hero" aria-label="New fairness audit">
          <p className="audit-new-kicker">Fairness Pipeline</p>
          <h1 className="audit-new-title">New Fairness Audit</h1>
          <p className="audit-new-subtitle">
            Upload your dataset, map key columns, and run a cloud-based compliance audit.
          </p>
        </section>

        {pageState === "wizard" && (
          <OnboardingWizard onComplete={handleWizardComplete} />
        )}

        {pageState === "uploading" && (
          <section className="audit-state-card" aria-label="Uploading file">
            <h2 className="audit-state-title">Uploading Dataset</h2>
            <p className="audit-state-subtitle">Sending CSV to cloud storage and preparing the audit job.</p>
            <div className="audit-progress-track">
              <div
                className="audit-progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="audit-progress-label">Uploading... {uploadProgress}%</p>
          </section>
        )}

        {pageState === "processing" && auditId && (
          <section className="audit-state-card" aria-label="Running audit">
            <h2 className="audit-state-title">Running Fairness Audit</h2>
            <p className="audit-state-subtitle">Your job is running in the cloud pipeline.</p>
            <AuditProgress
              uid={user.uid}
              auditId={auditId}
              onComplete={handleAuditComplete}
              onError={(err) => {
                setErrorMessage(err);
                setPageState("error");
              }}
            />
          </section>
        )}

        {pageState === "complete" && (
          <section className="audit-state-card audit-state-success" role="status">
            <div className="audit-state-icon" aria-hidden>✓</div>
            <p className="audit-state-title">Audit Complete</p>
            <p className="audit-state-subtitle">Redirecting to results...</p>
          </section>
        )}

        {pageState === "error" && (
          <section className="audit-state-card audit-state-error" role="alert">
            <h2 className="audit-state-title">Audit Failed</h2>
            <p className="audit-state-subtitle">{errorMessage}</p>
            <button
              type="button"
              onClick={() => {
                setPageState("wizard");
                setAuditId(null);
                setErrorMessage("");
              }}
              className="audit-link-button"
            >
              Try again
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
