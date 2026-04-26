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
    <main className="min-h-screen bg-gray-50" id="main-content">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">New fairness audit</h1>

        {pageState === "wizard" && (
          <OnboardingWizard onComplete={handleWizardComplete} />
        )}

        {pageState === "uploading" && (
          <div className="text-center py-12">
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-gray-600">Uploading... {uploadProgress}%</p>
          </div>
        )}

        {pageState === "processing" && auditId && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h2 className="text-lg font-semibold mb-6">Running fairness audit</h2>
            <AuditProgress
              uid={user.uid}
              auditId={auditId}
              onComplete={handleAuditComplete}
              onError={(err) => {
                setErrorMessage(err);
                setPageState("error");
              }}
            />
          </div>
        )}

        {pageState === "complete" && (
          <div className="text-center py-12" role="status">
            <div className="text-5xl mb-4">✓</div>
            <p className="text-xl font-semibold text-green-700">Audit complete!</p>
            <p className="text-gray-500 mt-2">Redirecting to results...</p>
          </div>
        )}

        {pageState === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6" role="alert">
            <h2 className="font-semibold text-red-800 mb-2">Audit failed</h2>
            <p className="text-sm text-red-700">{errorMessage}</p>
            <button
              type="button"
              onClick={() => {
                setPageState("wizard");
                setAuditId(null);
                setErrorMessage("");
              }}
              className="mt-4 text-sm text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
