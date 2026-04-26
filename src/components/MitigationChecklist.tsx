"use client";

import { useState } from "react";
import { logAuditEvent } from "@/lib/firebaseAnalytics";
import type { MitigationStep } from "@/lib/types";

const DIFFICULTY_STYLES = {
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

const IMPACT_STYLES = {
  low: "text-gray-400",
  medium: "text-blue-500",
  high: "text-blue-700 font-medium",
};

interface MitigationChecklistProps {
  steps: MitigationStep[];
  auditId: string;
}

export function MitigationChecklist({ steps, auditId }: MitigationChecklistProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const toggle = (rank: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(rank)) {
        next.delete(rank);
      } else {
        next.add(rank);
      }
      return next;
    });
    logAuditEvent("mitigation_step_clicked", { rank, auditId });
  };

  const toggleExpand = (rank: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rank)) {
        next.delete(rank);
      } else {
        next.add(rank);
      }
      return next;
    });
  };

  return (
    <section aria-labelledby="mitigation-heading">
      <div className="flex items-center justify-between mb-4">
        <h3 id="mitigation-heading" className="text-base font-semibold text-gray-900">
          Recommended mitigation steps
        </h3>
        <span className="text-sm text-gray-500">
          {checked.size}/{steps.length} completed
        </span>
      </div>

      <ol className="space-y-3" aria-label="Mitigation steps">
        {steps
          .sort((a, b) => a.rank - b.rank)
          .map((step) => {
            const isChecked = checked.has(step.rank);
            const isExpanded = expanded.has(step.rank);

            return (
              <li
                key={step.rank}
                className={`rounded-xl border transition-all ${
                  isChecked ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3 p-4">
                  <input
                    type="checkbox"
                    id={`step-${step.rank}`}
                    checked={isChecked}
                    onChange={() => toggle(step.rank)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    aria-label={`Mark "${step.title}" as complete`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <label
                        htmlFor={`step-${step.rank}`}
                        className={`text-sm font-medium cursor-pointer ${
                          isChecked ? "line-through text-gray-400" : "text-gray-900"
                        }`}
                      >
                        {step.rank}. {step.title}
                      </label>
                      <div className="flex gap-1.5 shrink-0">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${DIFFICULTY_STYLES[step.difficulty]}`}
                        >
                          {step.difficulty} effort
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div id={`step-detail-${step.rank}`} className="mt-2 space-y-2">
                        <p className="text-sm text-gray-600">{step.description}</p>
                        {step.regulatoryReference && (
                          <p className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                            Legal reference: {step.regulatoryReference}
                          </p>
                        )}
                        <p className={`text-xs ${IMPACT_STYLES[step.estimatedImpact]}`}>
                          Estimated impact: {step.estimatedImpact}
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpand(step.rank)}
                      className="text-xs text-blue-600 mt-1.5 hover:underline focus:outline-none focus:underline"
                      aria-expanded={isExpanded}
                      aria-controls={`step-detail-${step.rank}`}
                    >
                      {isExpanded ? "Show less" : "Show details"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
      </ol>
    </section>
  );
}
