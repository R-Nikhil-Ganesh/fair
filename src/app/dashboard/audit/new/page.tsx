"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Info, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { runVertexFairnessEvaluation, generateGeminiSummary, generateGeminiRecommendations } from "@/lib/ai";

export default function NewAuditPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [targetColumn, setTargetColumn] = useState("");
  const [protectedAttribute, setProtectedAttribute] = useState("");
  const [mode, setMode] = useState("banking");
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
      // 1. Run "ML Evaluation" (Placeholder)
      const disparities = await runVertexFairnessEvaluation(file, protectedAttribute, targetColumn);
      
      // 2. Generate Insights (Placeholder)
      const summary = await generateGeminiSummary(disparities);
      const recommendations = await generateGeminiRecommendations(disparities);

      // 3. Save to Firestore
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
        geminiSummary: summary,
        recommendations
      };

      const docRef = await addDoc(collection(db, "audits"), auditData);
      
      // 4. Redirect
      router.push(`/dashboard/audit/${docRef.id}`);
    } catch (error) {
      console.error("Error creating audit:", error);
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card">
        <h2 className="text-xl mb-6">Configure Fairness Audit</h2>
        
        <form onSubmit={handleStartAudit} className="flex flex-col gap-6">
          
          {/* Step 1: Upload */}
          <div className="form-group">
            <label className="form-label font-semibold">1. Upload Dataset (CSV)</label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center bg-muted/50 hover:bg-muted transition-colors relative cursor-pointer">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required
              />
              <UploadCloud size={32} className="text-muted-foreground mb-3" />
              {file ? (
                <div>
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-foreground">Click or drag CSV file here</p>
                  <p className="text-xs text-muted-foreground mt-1">Must contain applicant features and loan decisions.</p>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Configuration */}
          {headers.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6 p-4 bg-muted rounded-lg border border-border mt-2">
              <div className="form-group mb-0">
                <label className="form-label">Protected Attribute</label>
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Info size={12} /> The sensitive group to audit for bias (e.g., Gender, Race)
                </div>
                <select 
                  className="form-select w-full"
                  value={protectedAttribute}
                  onChange={(e) => setProtectedAttribute(e.target.value)}
                  required
                >
                  <option value="" disabled>Select column...</option>
                  {headers.map(h => <option key={`pa-${h}`} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="form-group mb-0">
                <label className="form-label">Target Decision</label>
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Info size={12} /> The column indicating the loan outcome (e.g., Approved)
                </div>
                <select 
                  className="form-select w-full"
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  required
                >
                  <option value="" disabled>Select column...</option>
                  {headers.map(h => <option key={`td-${h}`} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Domain Mode */}
          <div className="form-group">
            <label className="form-label font-semibold">2. Select Domain Model</label>
            <div className="grid md:grid-cols-3 gap-3 mt-2">
              <label className={`border rounded-lg p-3 cursor-pointer transition-colors ${mode === 'banking' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted'}`}>
                <input type="radio" name="mode" value="banking" checked={mode === 'banking'} onChange={() => setMode('banking')} className="sr-only" />
                <div className="font-medium mb-1">Banking & Credit</div>
                <div className="text-xs text-muted-foreground">Optimized for loan approval thresholds.</div>
              </label>
              
              <label className={`border rounded-lg p-3 opacity-50 cursor-not-allowed ${mode === 'employment' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'}`}>
                <input type="radio" name="mode" value="employment" disabled className="sr-only" />
                <div className="font-medium mb-1">Employment</div>
                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>Resume screening</span>
                  <span className="badge badge-muted py-0 px-1 text-[10px]">Coming Soon</span>
                </div>
              </label>

              <label className={`border rounded-lg p-3 opacity-50 cursor-not-allowed ${mode === 'insurance' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'}`}>
                <input type="radio" name="mode" value="insurance" disabled className="sr-only" />
                <div className="font-medium mb-1">Insurance</div>
                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>Claims routing</span>
                  <span className="badge badge-muted py-0 px-1 text-[10px]">Coming Soon</span>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex justify-end">
            <button 
              type="submit" 
              className="btn btn-primary px-8"
              disabled={isUploading || !file || !targetColumn || !protectedAttribute || !user}
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Initiating Audit...
                </>
              ) : "Start Fairness Audit"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
