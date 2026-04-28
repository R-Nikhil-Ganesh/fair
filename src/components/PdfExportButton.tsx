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

  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={handleExport}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isGenerating}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 1rem",
        borderRadius: "0.6rem",
        border: "1px solid #27272a",
        background: isGenerating ? "#18181b" : isHovered ? "#1f1f23" : "#09090b",
        color: "#f4f4f5",
        fontSize: "0.85rem",
        fontWeight: 600,
        cursor: isGenerating ? "not-allowed" : "pointer",
        opacity: isGenerating ? 0.6 : 1,
        transition: "all 0.15s ease",
        outline: "none",
      }}
      aria-label="Export audit report as PDF"
    >
      {isGenerating ? (
        <>
          <span
            style={{
              width: "1rem",
              height: "1rem",
              border: "2px solid #52525b",
              borderTopColor: "transparent",
              borderRadius: "50%",
            }}
            className="animate-spin"
            aria-hidden="true"
          />
          <span style={{ color: "#a1a1aa" }}>Generating...</span>
        </>
      ) : (
        <>
          <span aria-hidden="true" style={{ fontSize: "1.1rem" }}>↓</span>
          <span>Export PDF Report</span>
        </>
      )}
    </button>
  );
}
