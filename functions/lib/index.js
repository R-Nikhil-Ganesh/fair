"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldAuditFiles = exports.onAuditFileUploaded = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const axios_1 = require("axios");
admin.initializeApp();
const BACKEND_URL = ((_a = functions.config().backend) === null || _a === void 0 ? void 0 : _a.url) || process.env.BACKEND_URL || "";
// Trigger: fires when a file is finalized in Firebase Storage
// Pattern: audits/{uid}/{auditId}/data.csv
exports.onAuditFileUploaded = functions.storage
    .object()
    .onFinalize(async (object) => {
    const filePath = object.name || "";
    // Only process CSV files in the audits/ directory
    if (!filePath.startsWith("audits/") || !filePath.endsWith(".csv")) {
        return null;
    }
    // Parse uid and auditId from path: audits/{uid}/{auditId}/data.csv
    const parts = filePath.split("/");
    if (parts.length < 4)
        return null;
    const uid = parts[1];
    const auditId = parts[2];
    const db = admin.firestore();
    const auditRef = db.collection("audits").doc(uid)
        .collection("audits").doc(auditId);
    // Read audit document to get configuration
    const auditDoc = await auditRef.get();
    if (!auditDoc.exists) {
        functions.logger.error(`Audit document not found: ${auditId}`);
        return null;
    }
    const auditData = auditDoc.data();
    // Only trigger if status is "pending" (set by frontend on upload)
    if (auditData.status !== "pending") {
        return null;
    }
    // Update status to "queued"
    await auditRef.update({
        status: "queued",
        triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Call FastAPI backend to start the audit
    try {
        const response = await axios_1.default.post(`${BACKEND_URL}/api/audit/start`, {
            audit_id: auditId,
            csv_path: filePath,
            protected_attribute: auditData.protectedAttribute,
            target_column: auditData.targetColumn,
            favorable_label: auditData.favorableLabel || 1,
            domain: auditData.domain || "lending",
            uid: uid,
        }, {
            timeout: 30000, // 30s timeout — just to enqueue, not wait for result
        });
        functions.logger.info(`Audit queued: ${auditId}`, response.data);
        await auditRef.update({
            taskId: response.data.task_id,
            status: "queued",
        });
    }
    catch (error) {
        functions.logger.error(`Failed to enqueue audit: ${auditId}`, error);
        await auditRef.update({
            status: "error",
            error: "Failed to start audit pipeline. Please retry.",
        });
    }
    return null;
});
// Scheduled function: clean up old audit files (runs daily)
exports.cleanupOldAuditFiles = functions.pubsub
    .schedule("every 24 hours")
    .onRun(async () => {
    const storage = admin.storage();
    const bucket = storage.bucket();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const [files] = await bucket.getFiles({ prefix: "audits/" });
    const deletePromises = files
        .filter(f => f.metadata.timeCreated && new Date(f.metadata.timeCreated) < cutoffDate)
        .map(f => f.delete());
    await Promise.all(deletePromises);
    functions.logger.info(`Deleted ${deletePromises.length} old audit files`);
    return null;
});
//# sourceMappingURL=index.js.map