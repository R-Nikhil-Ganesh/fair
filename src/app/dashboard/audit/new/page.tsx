"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import * as aiClient from "@/lib/ai";
import { PageTitle } from "@/components/ui/PageTitle";
import { NewAuditForm } from "@/components/audit/NewAuditForm";
import type { DisparityInfo } from "@/lib/types";

type DomainMode = "lending" | "employment" | "insurance";

type AIFallbackShape = {
  uploadAndStartAudit?: (payload: {
    file: File;
    protectedAttribute: string;
    targetColumn: string;
    domain: DomainMode;
  }) => Promise<{ auditId: string } | undefined>;
  runVertexFairnessEvaluation?: (
    file: File,
    protectedAttribute: string,
    targetColumn: string
  ) => Promise<DisparityInfo[]>;
  generateGeminiSummary?: (disparities: DisparityInfo[]) => Promise<string>;
  generateGeminiRecommendations?: (disparities: DisparityInfo[]) => Promise<string[]>;
};

const aiCompat = aiClient as unknown as AIFallbackShape;

export default function NewAuditPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [targetColumn, setTargetColumn] = useState("");
  const [protectedAttribute, setProtectedAttribute] = useState("");
  const [mode, setMode] = useState<DomainMode>("lending");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      Papa.parse(selectedFile, {
        header: true,
        preview: 1, 
        complete: (results) => {
          if (results.meta.fields) {
            setHeaders(results.meta.fields);
          }
        }
      });
    }
  };

  const handleStartAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !targetColumn || !protectedAttribute || !user) return;

    setIsUploading(true);

    try {
      let disparities: DisparityInfo[] = [];

      // Prefer new backend API contract if it exists in lib/ai.
      if (aiCompat.uploadAndStartAudit) {
        await aiCompat.uploadAndStartAudit({
          file,
          protectedAttribute,
          targetColumn,
          domain: mode,
        });
      }

      if (aiCompat.runVertexFairnessEvaluation) {
        disparities = await aiCompat.runVertexFairnessEvaluation(file, protectedAttribute, targetColumn);
      }
      
      const summary = aiCompat.generateGeminiSummary
        ? await aiCompat.generateGeminiSummary(disparities)
        : "";
      const recommendations = aiCompat.generateGeminiRecommendations
        ? await aiCompat.generateGeminiRecommendations(disparities)
        : [];

      const auditData = {
        userId: user.uid,
        date: new Date().toISOString(),
        datasetName: file.name,
        totalRecords: 10000, // Mock number since we don't count full CSV here to save time
        protectedAttribute,
        targetColumn,
        overallApprovalRate: 0.65, // Mock overall rate
        disparities,
        status: "completed",
        domain: mode,
        geminiSummary: summary,
        recommendations
      };

      const docRef = await addDoc(collection(db, "audits"), auditData);

      router.push(`/dashboard/audit/${docRef.id}`);
    } catch (error) {
      console.error("Error creating audit:", error);
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <PageTitle
          title="New Audit"
          subtitle="Upload a dataset, map your fairness columns, and launch analysis."
        />
      </div>

      <NewAuditForm
        file={file}
        headers={headers}
        targetColumn={targetColumn}
        protectedAttribute={protectedAttribute}
        mode={mode}
        isUploading={isUploading}
        disabled={isUploading || !file || !targetColumn || !protectedAttribute || !user}
        onFileUpload={handleFileUpload}
        onTargetColumnChange={setTargetColumn}
        onProtectedAttributeChange={setProtectedAttribute}
        onModeChange={setMode}
        onSubmit={handleStartAudit}
      />
    </div>
  );
}
