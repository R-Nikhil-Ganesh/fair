import io
import os
from dataclasses import asdict
from pathlib import Path

import pandas as pd
from celery import Celery
from google.cloud import storage
from google.cloud.firestore import SERVER_TIMESTAMP
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

from fairness_engine import compute_fairness_metrics
from firestore_client import (
	db,
	update_audit_error,
	update_audit_results,
	update_audit_status,
	write_progress_checkpoint,
)
from gemini_client import GeminiAuditOutput, generate_bias_narrative, generate_mitigation_plan
from model_auditor import run_model_audit
from pii_detector import detect_pii

app = Celery(
	"fairlens",
	broker=os.environ["REDIS_URL"],
	backend=os.environ["REDIS_URL"],
)
app.conf.task_serializer = "json"
app.conf.result_expires = 3600


def _audit_doc_ref(uid: str, audit_id: str):
	return db.collection("audits").document(uid).collection("audits").document(audit_id)


def _load_csv_from_storage(storage_client: storage.Client, bucket_name: str, csv_path: str) -> pd.DataFrame:
	bucket = storage_client.bucket(bucket_name)
	blob = bucket.blob(csv_path)
	blob_bytes = blob.download_as_bytes()
	return pd.read_csv(io.BytesIO(blob_bytes))


def _severity_summary(flag_count: int) -> str:
	if flag_count == 0:
		return "No critical bias signals detected across the primary fairness metrics."
	if flag_count == 1:
		return "Notable bias detected in 1 of 3 metrics."
	return f"Critical bias detected in {flag_count} of 3 metrics."


@app.task(bind=True, max_retries=3, default_retry_delay=30)
def run_audit_task(self, audit_params: dict):
	uid = str(audit_params["uid"])
	audit_id = str(audit_params["audit_id"])

	try:
		update_audit_status(uid, audit_id, "running", 10)
		write_progress_checkpoint(uid, audit_id, "loading_csv", 10)

		storage_client = storage.Client()
		bucket_name = os.environ["FIREBASE_STORAGE_BUCKET"]
		df = _load_csv_from_storage(storage_client, bucket_name, audit_params["csv_path"])

		write_progress_checkpoint(uid, audit_id, "detecting_pii", 20)
		pii_result = detect_pii(df)
		_audit_doc_ref(uid, audit_id).set(
			{
				"piiDetection": asdict(pii_result),
				"updatedAt": SERVER_TIMESTAMP,
			},
			merge=True,
		)

		write_progress_checkpoint(uid, audit_id, "computing_metrics", 40)
		try:
			fairness_result = compute_fairness_metrics(
				df=df,
				protected_attribute=audit_params["protected_attribute"],
				target_column=audit_params["target_column"],
				favorable_label=int(audit_params.get("favorable_label", 1)),
				domain=str(audit_params.get("domain", "lending")),
			)
		except ValueError as exc:
			update_audit_error(uid, audit_id, str(exc))
			return {"status": "error", "audit_id": audit_id, "error": str(exc)}

		domain = str(audit_params.get("domain", "lending"))
		protected_attribute = str(audit_params["protected_attribute"])

		write_progress_checkpoint(uid, audit_id, "running_gemini_narrative", 60)
		bias_narrative = generate_bias_narrative(
			fairness_result=fairness_result,
			domain=domain,
			protected_attribute=protected_attribute,
		)

		write_progress_checkpoint(uid, audit_id, "running_gemini_mitigation", 75)
		mitigation_plan = generate_mitigation_plan(
			fairness_result=fairness_result,
			domain=domain,
			protected_attribute=protected_attribute,
		)
		gemini_output = GeminiAuditOutput(
			bias_narrative=bias_narrative,
			severity_summary=_severity_summary(len(fairness_result.flagged_metrics)),
			mitigation_plan=mitigation_plan,
			raw_response_tokens=0,
		)

		write_progress_checkpoint(uid, audit_id, "complete", 100)
		update_audit_results(
			uid,
			audit_id,
			{
				"fairnessMetrics": asdict(fairness_result),
				"geminiOutput": {
					"biasNarrative": gemini_output.bias_narrative,
					"severitySummary": gemini_output.severity_summary,
					"mitigationPlan": [asdict(step) for step in gemini_output.mitigation_plan],
				},
				"piiDetection": asdict(pii_result),
				"rowCount": int(len(df)),
			},
		)
		return {"status": "complete", "audit_id": audit_id}

	except Exception as exc:  # noqa: BLE001
		update_audit_error(uid, audit_id, str(exc))
		raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=30)
def run_model_audit_task(self, audit_params: dict):
	uid = str(audit_params["uid"])
	audit_id = str(audit_params["audit_id"])

	try:
		update_audit_status(uid, audit_id, "running", 10)
		write_progress_checkpoint(uid, audit_id, "loading_csv", 10)

		storage_client = storage.Client()
		bucket_name = os.environ["FIREBASE_STORAGE_BUCKET"]
		df = _load_csv_from_storage(storage_client, bucket_name, audit_params["csv_path"])

		write_progress_checkpoint(uid, audit_id, "detecting_pii", 20)
		pii_result = detect_pii(df)
		_audit_doc_ref(uid, audit_id).set(
			{
				"piiDetection": asdict(pii_result),
				"updatedAt": SERVER_TIMESTAMP,
			},
			merge=True,
		)

		write_progress_checkpoint(uid, audit_id, "computing_metrics", 40)
		try:
			model_audit_result = run_model_audit(
				model_path=audit_params["model_path"],
				csv_df=df,
				protected_attribute=audit_params["protected_attribute"],
				target_column=audit_params["target_column"],
				domain=str(audit_params.get("domain", "lending")),
				gcs_bucket=bucket_name,
				storage_client=storage_client,
				favorable_label=int(audit_params.get("favorable_label", 1)),
			)
		except ValueError as exc:
			update_audit_error(uid, audit_id, str(exc))
			return {"status": "error", "audit_id": audit_id, "error": str(exc)}

		# Use model_fairness as primary for Gemini narrative
		fairness_result = model_audit_result.model_fairness
		domain = str(audit_params.get("domain", "lending"))
		protected_attribute = str(audit_params["protected_attribute"])

		write_progress_checkpoint(uid, audit_id, "running_gemini_narrative", 60)
		bias_narrative = generate_bias_narrative(
			fairness_result=fairness_result,
			domain=domain,
			protected_attribute=protected_attribute,
		)

		write_progress_checkpoint(uid, audit_id, "running_gemini_mitigation", 75)
		mitigation_plan = generate_mitigation_plan(
			fairness_result=fairness_result,
			domain=domain,
			protected_attribute=protected_attribute,
		)
		gemini_output = GeminiAuditOutput(
			bias_narrative=bias_narrative,
			severity_summary=_severity_summary(len(fairness_result.flagged_metrics)),
			mitigation_plan=mitigation_plan,
			raw_response_tokens=0,
		)

		write_progress_checkpoint(uid, audit_id, "complete", 100)
		update_audit_results(
			uid,
			audit_id,
			{
				# Top-level historical metrics for backward-compat
				"fairnessMetrics": asdict(model_audit_result.historical_fairness),
				# Structured model audit — frontend adapter reads results.modelAudit
				"modelAudit": {
					"model_type": model_audit_result.model_type,
					"feature_columns": model_audit_result.feature_columns,
					"prediction_counts": model_audit_result.prediction_counts,
					"model_accuracy": model_audit_result.model_accuracy,
					"model_file_size_kb": model_audit_result.model_file_size_kb,
					"historical_fairness": asdict(model_audit_result.historical_fairness),
					"model_fairness": asdict(model_audit_result.model_fairness),
					"counterfactual_data": {
						"record_index": model_audit_result.counterfactual_data.record_index,
						"original_prediction": model_audit_result.counterfactual_data.original_prediction,
						"flip_count": model_audit_result.counterfactual_data.flip_count,
						"total_tested": model_audit_result.counterfactual_data.total_tested,
						"flip_rate": model_audit_result.counterfactual_data.flip_rate,
						"narrative": model_audit_result.counterfactual_data.narrative,
						"entries": model_audit_result.counterfactual_data.entries,
					},
				},
				"geminiOutput": {
					"biasNarrative": gemini_output.bias_narrative,
					"severitySummary": gemini_output.severity_summary,
					"mitigationPlan": [asdict(step) for step in gemini_output.mitigation_plan],
				},
				"piiDetection": asdict(pii_result),
				"rowCount": int(len(df)),
			},
		)
		return {"status": "complete", "audit_id": audit_id}

	except Exception as exc:  # noqa: BLE001
		update_audit_error(uid, audit_id, str(exc))
		raise self.retry(exc=exc)
