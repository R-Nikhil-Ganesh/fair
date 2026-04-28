// src/lib/ai.ts
// Real implementation — replaces all mocked functions

import { db, storage } from "./firebase";
import {
  doc, setDoc, getDoc, onSnapshot, serverTimestamp, collection
} from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";
import { getPerformanceTrace } from "./performanceTraces";
import { logAuditEvent } from "./firebaseAnalytics";
import type {
  AuditDocument
} from "./types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

// ─── Upload CSV and create audit document ──────────────────────────────────

export async function uploadAndStartAudit(
  file: File,
  config: {
    uid: string;
    protectedAttribute: string;
    targetColumn: string;
    favorableLabel: number;
    domain: "lending" | "employment" | "insurance";
    modelFile?: File;
    modelFramework?: "sklearn" | "onnx";
  },
  onProgress: (pct: number) => void
): Promise<string> {
  const trace = getPerformanceTrace("asset_upload_and_audit_start");
  trace.start();

  const normalizeUploadError = (error: unknown): Error => {
    if (error instanceof Error) return error;
    if (typeof error === "string") return new Error(error);
    if (typeof error === "object" && error !== null) {
      const code = (error as { code?: unknown }).code;
      const message = (error as { message?: unknown }).message;
      if (typeof code === "string" && typeof message === "string") {
        return new Error(`${code}: ${message}`);
      }
      if (typeof message === "string") {
        return new Error(message);
      }
    }
    return new Error("Upload failed unexpectedly.");
  };

  // Generate audit ID
  const auditRef = doc(collection(db, "audits", config.uid, "audits"));
  const auditId = auditRef.id;

  const csvPath = `audits/${config.uid}/${auditId}/${file.name}`;
  const modelPath = config.modelFile
    ? `audits/${config.uid}/${auditId}/${config.modelFile.name}`
    : undefined;

  // Create Firestore document FIRST with status "pending"
  await setDoc(auditRef, {
    auditId,
    uid: config.uid,
    status: "pending",
    progress: 0,
    currentStep: "uploading",
    domain: config.domain,
    protectedAttribute: config.protectedAttribute,
    targetColumn: config.targetColumn,
    favorableLabel: config.favorableLabel,
    fileName: file.name,
    fileSize: file.size,
    csvPath,
    modelFileName: config.modelFile?.name ?? null,
    modelFileSize: config.modelFile?.size ?? null,
    modelFramework: config.modelFramework ?? null,
    modelPath: modelPath ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const uploadFile = async (
    uploadFile: File,
    storagePath: string,
    onPartProgress: (pct: number) => void
  ): Promise<void> => {
    const storageRef = ref(storage, storagePath);
    await new Promise<void>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, uploadFile);
      const UPLOAD_INACTIVITY_TIMEOUT_MS = 60000;
      let timeoutHandle: ReturnType<typeof setTimeout>;
      let settled = false;

      const rejectOnce = (reason: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);
        reject(reason);
      };

      const resolveOnce = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);
        resolve();
      };

      const resetTimeout = () => {
        clearTimeout(timeoutHandle);
        timeoutHandle = setTimeout(() => {
          try {
            uploadTask.cancel();
          } catch {
            // Best effort cancel; continue with timeout error either way.
          }
          rejectOnce(
            new Error(
              "Upload timed out while waiting for Firebase Storage progress. Check Storage bucket config, Firebase rules, App Check, and network connectivity.",
            ),
          );
        }, UPLOAD_INACTIVITY_TIMEOUT_MS);
      };

      resetTimeout();

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          resetTimeout();
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onPartProgress(pct);
        },
        (error) => rejectOnce(normalizeUploadError(error)),
        () => resolveOnce()
      );
    });
  };

  let csvProgress = 0;
  let modelProgress = 0;
  const progressDivisor = config.modelFile ? 2 : 1;
  const reportProgress = () => {
    const pct = Math.round((csvProgress + modelProgress) / progressDivisor);
    onProgress(pct);
  };

  const uploads: Promise<void>[] = [
    uploadFile(file, csvPath, (pct) => {
      csvProgress = pct;
      reportProgress();
    }),
  ];

  if (config.modelFile && modelPath) {
    uploads.push(
      uploadFile(config.modelFile, modelPath, (pct) => {
        modelProgress = pct;
        reportProgress();
      })
    );
  }

  await Promise.all(uploads);

  const response = await fetch(
    `${BACKEND_URL}${config.modelFile ? "/api/audit/model" : "/api/audit/start"}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        config.modelFile
          ? {
              audit_id: auditId,
              csv_path: csvPath,
              model_path: modelPath,
              protected_attribute: config.protectedAttribute,
              target_column: config.targetColumn,
              domain: config.domain,
              uid: config.uid,
              model_framework: config.modelFramework,
            }
          : {
              audit_id: auditId,
              csv_path: csvPath,
              protected_attribute: config.protectedAttribute,
              target_column: config.targetColumn,
              favorable_label: config.favorableLabel,
              domain: config.domain,
              uid: config.uid,
            }
      ),
    }
  );

  if (!response.ok) {
    throw new Error(
      config.modelFile ? "Failed to start model audit pipeline" : "Failed to start audit pipeline"
    );
  }

  trace.stop();
  logAuditEvent("audit_started", {
    domain: config.domain,
    fileSize: file.size,
    ...(config.modelFramework ? { modelFramework: config.modelFramework } : {}),
    hasModelArtifact: Boolean(config.modelFile),
  });

  return auditId;
}

// ─── Start audit from sample dataset (no upload needed) ────────────────────

export async function startSampleDatasetAudit(
  sampleDatasetKey: string,
  config: {
    uid: string;
    protectedAttribute: string;
    targetColumn: string;
    favorableLabel: number;
    domain: "lending" | "employment" | "insurance";
  }
): Promise<string> {
  const auditRef = doc(collection(db, "audits", config.uid, "audits"));
  const auditId = auditRef.id;

  // For sample datasets, the CSV is already in Storage at a known path
  // We create the Firestore doc directly with the known path and status "pending"
  // Backend URL is called directly (no file upload, no CF trigger needed)
  const csvPath = `sample-datasets/${sampleDatasetKey}.csv`;

  await setDoc(auditRef, {
    auditId,
    uid: config.uid,
    status: "pending",
    progress: 0,
    currentStep: "queuing",
    domain: config.domain,
    protectedAttribute: config.protectedAttribute,
    targetColumn: config.targetColumn,
    favorableLabel: config.favorableLabel,
    csvPath,
    isSampleDataset: true,
    sampleDatasetKey,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Call backend directly to enqueue (since no file upload triggers CF)
  const response = await fetch(`${BACKEND_URL}/api/audit/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audit_id: auditId,
      csv_path: csvPath,
      protected_attribute: config.protectedAttribute,
      target_column: config.targetColumn,
      favorable_label: config.favorableLabel,
      domain: config.domain,
      uid: config.uid,
    }),
  });

  if (!response.ok) throw new Error("Failed to start audit pipeline");

  logAuditEvent("sample_dataset_audit_started", {
    dataset: sampleDatasetKey,
    domain: config.domain,
  });

  return auditId;
}

// ─── Subscribe to audit progress via Firestore onSnapshot ──────────────────

export function subscribeToAudit(
  uid: string,
  auditId: string,
  onUpdate: (audit: AuditDocument) => void,
  onError: (error: Error) => void
): () => void {
  const auditRef = doc(db, "audits", uid, "audits", auditId);

  const unsubscribe = onSnapshot(
    auditRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onError(new Error("Audit document not found"));
        return;
      }
      onUpdate(snapshot.data() as AuditDocument);
    },
    (error) => onError(error)
  );

  return unsubscribe;
}

// ─── Fetch completed audit results ─────────────────────────────────────────

export async function getAuditResults(
  uid: string,
  auditId: string
): Promise<AuditDocument | null> {
  const trace = getPerformanceTrace("fetch_audit_results");
  trace.start();

  const auditRef = doc(db, "audits", uid, "audits", auditId);
  const snapshot = await getDoc(auditRef);

  trace.stop();

  if (!snapshot.exists()) return null;
  return snapshot.data() as AuditDocument;
}

// ─── Fetch audit history for dashboard ─────────────────────────────────────

import { query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot } from "firebase/firestore";

export async function getAuditHistory(
  uid: string,
  pageSize: number = 10,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ audits: AuditDocument[]; lastDoc: QueryDocumentSnapshot | null }> {
  const auditsRef = collection(db, "audits", uid, "audits");

  let q = query(auditsRef, orderBy("createdAt", "desc"), limit(pageSize));
  if (lastDoc) {
    q = query(auditsRef, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(pageSize));
  }

  const snapshot = await getDocs(q);
  const audits = snapshot.docs.map(d => d.data() as AuditDocument);
  const newLastDoc = snapshot.docs.length === pageSize
    ? snapshot.docs[snapshot.docs.length - 1]
    : null;

  return { audits, lastDoc: newLastDoc };
}

// ─── Upload model file for model auditing ─────────────────────────────────

export async function uploadModelFile(
  file: File,
  uid: string,
  auditId: string,
  onProgress: (pct: number) => void
): Promise<string> {
  const ext = file.name.endsWith(".onnx") ? ".onnx" : ".pkl";
  const storagePath = `audits/${uid}/${auditId}/model${ext}`;
  const storageRef = ref(storage, storagePath);

  await new Promise<void>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on("state_changed",
      (snap) => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      () => resolve()
    );
  });

  return storagePath;
}

// ─── Start model audit ─────────────────────────────────────────────────────

export async function startModelAudit(params: {
  uid: string;
  auditId: string;
  modelPath: string;
  csvPath: string;
  protectedAttribute: string;
  targetColumn: string;
}): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/api/audit/model`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audit_id: params.auditId,
      model_path: params.modelPath,
      csv_path: params.csvPath,
      protected_attribute: params.protectedAttribute,
      target_column: params.targetColumn,
      uid: params.uid,
    }),
  });
  if (!response.ok) throw new Error("Failed to start model audit");
}
