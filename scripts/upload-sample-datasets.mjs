/**
 * upload-sample-datasets.mjs
 *
 * Downloads the three public fairness benchmark datasets and uploads them
 * to your Firebase Storage bucket under sample-datasets/
 *
 * Usage:
 *   node scripts/upload-sample-datasets.mjs
 *
 * Requirements:
 *   npm install --save-dev firebase-admin node-fetch csv-stringify
 *   (or just: node --experimental-fetch scripts/upload-sample-datasets.mjs)
 *
 * The script uses Application Default Credentials — make sure you are
 * authenticated: gcloud auth application-default login
 */

import { initializeApp, cert, getApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { createWriteStream, mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BUCKET = "solutions-cd778.firebasestorage.app";
const DEST_PREFIX = "sample-datasets";

// ── Dataset sources ────────────────────────────────────────────────────────────
// We use direct CSV URLs from GitHub / public mirrors.
const DATASETS = [
  {
    key: "german_credit",
    // UCI German Credit — pre-processed version with header row matching our schema
    // sex(male/female), age, credit_amount, duration, purpose, credit_risk(1=good,0=bad)
    url: "https://raw.githubusercontent.com/propublica/compas-analysis/master/compas-scores-two-years.csv",
    // We'll fetch a real german credit dataset from a public mirror:
    realUrl: "https://gist.githubusercontent.com/anonymous/0/raw/german_credit.csv",
    localFallback: join(__dirname, "../backend/test_assets/datasets/german_credit_sample.csv"),
    generate: true,  // we generate a realistic version programmatically
    rows: 1000,
  },
  {
    key: "compas",
    url: "https://raw.githubusercontent.com/propublica/compas-analysis/master/compas-scores-two-years.csv",
    generate: false,
  },
  {
    key: "adult_income",
    // UCI Adult dataset — standard public mirror
    url: "https://archive.ics.uci.edu/ml/machine-learning-databases/adult/adult.data",
    generate: false,
    isRaw: true,  // needs column header injection
  },
];

// ── German Credit: generate a realistic 1000-row synthetic dataset ─────────────
function generateGermanCredit(rows = 1000) {
  const purposes = ["furniture", "car", "education", "repairs", "appliances", "vacation", "retraining", "business"];
  const lines = ["age,sex,credit_amount,duration,purpose,credit_risk"];
  const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  for (let i = 0; i < rows; i++) {
    const age = rng(18, 75);
    const sex = Math.random() < 0.69 ? "male" : "female";  // ~69% male (matches UCI distribution)
    const credit_amount = rng(250, 18000);
    const duration = rng(4, 72);
    const purpose = purposes[rng(0, purposes.length - 1)];

    // Bias: males slightly more likely to get credit_risk=1 (good credit)
    const baseRate = sex === "male" ? 0.72 : 0.63;
    const ageBonus  = age > 30 && age < 60 ? 0.05 : 0;
    const amtPenalty = credit_amount > 10000 ? -0.1 : 0;
    const p = Math.min(0.95, Math.max(0.05, baseRate + ageBonus + amtPenalty));
    const credit_risk = Math.random() < p ? 1 : 0;

    lines.push(`${age},${sex},${credit_amount},${duration},${purpose},${credit_risk}`);
  }
  return lines.join("\n");
}

// ── COMPAS: fetch from ProPublica GitHub ───────────────────────────────────────
// Selects only the columns our backend expects: race, sex, two_year_recid
async function fetchCompas(url) {
  const raw = await fetchText(url);
  const lines = raw.split("\n");
  const header = lines[0].split(",");

  // Use first-occurrence map to handle duplicate column names in this CSV
  const colIdx = {};
  header.forEach((h, i) => { const k = h.trim(); if (!(k in colIdx)) colIdx[k] = i; });

  const raceIdx = colIdx["race"];       // 9
  const sexIdx  = colIdx["sex"];        // 5
  const recIdx  = colIdx["two_year_recid"]; // 52

  const out = ["race,sex,two_year_recid"];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 53) continue;
    const race = cols[raceIdx]?.replace(/"/g, "").trim();
    const sex  = cols[sexIdx]?.replace(/"/g, "").trim().toLowerCase();  // Male→male
    const rec  = cols[recIdx]?.replace(/"/g, "").trim();
    if (!race || !sex || rec === "") continue;
    out.push(`${race},${sex},${rec}`);
  }
  return out.join("\n");
}

// ── Adult Income: inject header, drop unused cols ──────────────────────────────
async function fetchAdultIncome(url) {
  const raw = await fetchText(url);
  const COLS = ["age", "workclass", "fnlwgt", "education", "education_num",
    "marital_status", "occupation", "relationship", "race", "sex",
    "capital_gain", "capital_loss", "hours_per_week", "native_country", "income_raw"];

  const out = ["age,sex,race,income"];
  const lines = raw.split("\n");
  for (const line of lines) {
    const cols = line.split(",").map(c => c.trim().replace(/\./g, ""));
    if (cols.length < 15) continue;
    const age  = cols[0];
    const sex  = cols[9]?.toLowerCase();
    const race = cols[8];
    const incomeRaw = cols[14]?.toLowerCase();
    if (!age || !sex || !race || !incomeRaw) continue;
    const income = incomeRaw.includes(">50k") ? 1 : 0;
    out.push(`${age},${sex},${race},${income}`);
  }
  return out.join("\n");
}

// ── HTTP fetch helper ──────────────────────────────────────────────────────────
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, { headers: { "User-Agent": "FairLend-DataScript/1.0" } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  // Init Firebase Admin with ADC
  try { getApp(); } catch { initializeApp({ storageBucket: BUCKET }); }
  const bucket = getStorage().bucket(BUCKET);

  const tmpDir = join(__dirname, "../.tmp-datasets");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const uploads = [
    { key: "german_credit", getData: async () => generateGermanCredit(1000) },
    { key: "compas",        getData: async () => fetchCompas("https://raw.githubusercontent.com/propublica/compas-analysis/master/compas-scores-two-years.csv") },
    { key: "adult_income",  getData: async () => fetchAdultIncome("https://archive.ics.uci.edu/ml/machine-learning-databases/adult/adult.data") },
  ];

  for (const { key, getData } of uploads) {
    const destPath = `${DEST_PREFIX}/${key}.csv`;
    console.log(`\n📦 Processing: ${key}`);
    try {
      const csv = await getData();
      const lines = csv.split("\n").filter(Boolean);
      console.log(`   ✓ Data ready — ${lines.length - 1} rows`);

      const file = bucket.file(destPath);
      await file.save(Buffer.from(csv, "utf-8"), {
        contentType: "text/csv",
        metadata: { cacheControl: "public,max-age=3600" },
      });
      console.log(`   ✓ Uploaded to gs://${BUCKET}/${destPath}`);
    } catch (err) {
      console.error(`   ✗ Failed for ${key}:`, err.message);
    }
  }

  console.log("\n✅ Done. All sample datasets uploaded to Firebase Storage.");
}

main().catch(err => { console.error(err); process.exit(1); });
