"use client";

import { useState } from "react";
import { logAuditEvent } from "@/lib/firebaseAnalytics";
import { getPerformanceTrace } from "@/lib/performanceTraces";
import type { AuditDocument } from "@/lib/types";

interface PdfExportButtonProps {
  audit: AuditDocument;
}

export function PdfExportButton({ audit }: PdfExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    setIsGenerating(true);
    const trace = getPerformanceTrace("pdf_export_generation");
    trace.start();

    try {
      const { generateAuditPDF } = await import("./AuditPDFDocument");
      const blob = await generateAuditPDF(audit);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fairlens-audit-${audit.auditId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logAuditEvent("report_exported", { auditId: audit.auditId, domain: audit.domain });
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      trace.stop();
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isGenerating}
      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      aria-label="Export audit report as PDF"
    >
      {isGenerating ? (
        <>
          <span
            className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          Generating...
        </>
      ) : (
        <>
          <span aria-hidden="true">↓</span>
          Export PDF report
        </>
      )}
    </button>
  );
}
