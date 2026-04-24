// src/lib/piiDetector.ts

export interface FrontendPIIWarning {
  columnName: string;
  piiType: string;
  sampleValue: string;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(\+?1?\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/;
const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
const NAME_COLUMN_KEYWORDS = ["name", "first", "last", "fname", "lname", "fullname"];

export function checkColumnsForPII(
  headers: string[],
  sampleRows: Record<string, string>[]
): FrontendPIIWarning[] {
  const warnings: FrontendPIIWarning[] = [];

  for (const col of headers) {
    const colLower = col.toLowerCase();

    // Check column name for name-like keywords
    if (NAME_COLUMN_KEYWORDS.some(kw => colLower.includes(kw))) {
      const sample = sampleRows[0]?.[col] ?? "";
      warnings.push({
        columnName: col,
        piiType: "name",
        sampleValue: sample.slice(0, 3) + "***",
      });
      continue;
    }

    // Check sample values
    const samples = sampleRows.slice(0, 20).map(r => String(r[col] ?? ""));
    let flagged = false;
    let piiType = "";

    for (const val of samples) {
      if (EMAIL_REGEX.test(val)) { piiType = "email"; flagged = true; break; }
      if (SSN_REGEX.test(val)) { piiType = "ssn"; flagged = true; break; }
      if (PHONE_REGEX.test(val)) { piiType = "phone"; flagged = true; break; }
      if (IP_REGEX.test(val)) { piiType = "ip_address"; flagged = true; break; }
    }

    if (flagged) {
      const sample = samples[0];
      warnings.push({
        columnName: col,
        piiType,
        sampleValue: sample.slice(0, 3) + "***" + sample.slice(-2),
      });
    }
  }

  return warnings;
}
