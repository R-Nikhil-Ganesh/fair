import io
import pathlib
import pickle
from dataclasses import dataclass, field
from typing import Any, Literal

import numpy as np
import pandas as pd
from google.cloud import storage

from fairness_engine import FairnessResult, compute_fairness_metrics


@dataclass
class CounterfactualEntry:
	changed_attribute: str
	original_value: Any
	counterfactual_value: Any
	counterfactual_prediction: int
	decision_changed: bool


@dataclass
class CounterfactualSummary:
	record_index: int
	original_prediction: int
	original_protected_value: Any
	flip_count: int           # how many counterfactuals changed the decision
	total_tested: int
	flip_rate: float          # fraction of counterfactuals that flipped
	entries: list             # list[CounterfactualEntry] as dicts
	narrative: str


@dataclass
class ModelAuditResult:
	model_type: Literal["sklearn", "onnx"]
	feature_columns: list[str]
	prediction_counts: dict[str, int]
	model_accuracy: float
	model_file_size_kb: float
	# Dual fairness breakdown
	historical_fairness: FairnessResult   # ground-truth labels
	model_fairness: FairnessResult        # model predictions
	# Counterfactual interrogation (sampled from high-confidence denied records)
	counterfactual_data: CounterfactualSummary


# ── Loaders ─────────────────────────────────────────────────────────────────

def load_model_from_storage(
	storage_client: storage.Client,
	bucket_name: str,
	model_path: str,
) -> tuple[Any, Literal["sklearn", "onnx"]]:
	bucket = storage_client.bucket(bucket_name)
	blob = bucket.blob(model_path)
	model_bytes = blob.download_as_bytes()
	bytes_buffer = io.BytesIO(model_bytes)

	extension = pathlib.Path(model_path).suffix.lower()
	if extension == ".pkl":
		bytes_buffer.seek(0)
		return pickle.load(bytes_buffer), "sklearn"

	if extension == ".onnx":
		try:
			import onnxruntime
		except ImportError:
			raise ValueError("onnxruntime is not installed. Only .pkl models are supported.")
		filename = pathlib.Path(model_path).name
		tmp_dir = pathlib.Path("/tmp")
		tmp_dir.mkdir(parents=True, exist_ok=True)
		tmp_path = tmp_dir / filename
		tmp_path.write_bytes(model_bytes)
		return onnxruntime.InferenceSession(str(tmp_path)), "onnx"

	raise ValueError(
		f"Unrecognized model extension '{extension}'. Expected .pkl or .onnx."
	)


# ── Prediction ───────────────────────────────────────────────────────────────

def generate_predictions(
	model: Any,
	model_type: Literal["sklearn", "onnx"],
	df: pd.DataFrame,
	feature_columns: list[str],
) -> np.ndarray:
	if model_type == "sklearn":
		input_df = df if isinstance(df, pd.DataFrame) else pd.DataFrame(df, columns=feature_columns)
		try:
			return np.asarray(model.predict(input_df))
		except (KeyError, ValueError, TypeError):
			return np.asarray(model.predict(input_df[feature_columns]))

	import onnxruntime  # only needed for onnx path
	input_name = model.get_inputs()[0].name
	x_float32 = df[feature_columns].values.astype(np.float32)
	predictions = model.run(None, {input_name: x_float32})
	return np.asarray(predictions[0]).flatten()


# ── Counterfactual ───────────────────────────────────────────────────────────

def _generate_counterfactual_summary(
	model: Any,
	model_type: str,
	df: pd.DataFrame,
	predictions: np.ndarray,
	protected_attribute: str,
	feature_columns: list[str],
	favorable_label: int = 1,
	max_records: int = 5,
) -> CounterfactualSummary:
	"""
	Pick up to `max_records` records predicted as denied (≠ favorable_label),
	flip their protected attribute value, re-predict, and report how often
	the decision changes.
	"""
	# Find indices that were predicted denied
	denied_mask = (predictions != favorable_label)
	denied_indices = np.where(denied_mask)[0]

	if len(denied_indices) == 0:
		# Everyone approved — sample first N records instead
		denied_indices = np.arange(min(max_records, len(df)))

	sample_indices = denied_indices[:max_records]
	unique_values = df[protected_attribute].dropna().unique().tolist()

	all_entries = []
	flip_count = 0
	total_tested = 0

	for idx in sample_indices:
		record = df.iloc[[idx]].copy()
		original_pred = int(predictions[idx])
		original_val = record[protected_attribute].iloc[0]

		for cf_val in unique_values:
			if cf_val == original_val:
				continue
			modified = record.copy()
			modified[protected_attribute] = cf_val
			try:
				cf_pred_arr = generate_predictions(model, model_type, modified, feature_columns)
				cf_pred = int(np.asarray(cf_pred_arr).flatten()[0])
			except Exception:
				continue

			changed = cf_pred != original_pred
			if changed:
				flip_count += 1
			total_tested += 1

			all_entries.append({
				"record_index": int(idx),
				"changed_attribute": protected_attribute,
				"original_value": str(original_val),
				"counterfactual_value": str(cf_val),
				"original_prediction": original_pred,
				"counterfactual_prediction": cf_pred,
				"decision_changed": changed,
			})

	flip_rate = round(flip_count / total_tested, 4) if total_tested > 0 else 0.0

	# Build narrative
	if total_tested == 0:
		narrative = (
			f"No counterfactual pairs could be tested for attribute '{protected_attribute}'. "
			"This may mean all records share the same group value."
		)
	elif flip_rate == 0:
		narrative = (
			f"Counterfactual analysis tested {total_tested} denied applicants. "
			f"Changing the '{protected_attribute}' attribute did NOT alter any decisions, "
			"suggesting the model does not rely on this attribute for denials."
		)
	elif flip_rate >= 0.5:
		narrative = (
			f"⚠ High counterfactual flip rate detected. "
			f"Of {total_tested} tested pairs, {flip_count} ({flip_rate*100:.0f}%) "
			f"changed their outcome when '{protected_attribute}' was altered. "
			"This is strong evidence that the model's decisions are sensitive to this "
			"protected attribute — a potential fairness violation."
		)
	else:
		narrative = (
			f"Counterfactual analysis tested {total_tested} denied applicants. "
			f"{flip_count} ({flip_rate*100:.0f}%) changed their outcome when "
			f"'{protected_attribute}' was altered to a different group value. "
			"Moderate sensitivity detected; manual review is recommended."
		)

	return CounterfactualSummary(
		record_index=int(sample_indices[0]) if len(sample_indices) > 0 else -1,
		original_prediction=int(predictions[sample_indices[0]]) if len(sample_indices) > 0 else -1,
		original_protected_value=str(df[protected_attribute].iloc[sample_indices[0]]) if len(sample_indices) > 0 else "",
		flip_count=flip_count,
		total_tested=total_tested,
		flip_rate=flip_rate,
		entries=all_entries,
		narrative=narrative,
	)


# ── Main audit ───────────────────────────────────────────────────────────────

def run_model_audit(
	model_path: str,
	csv_df: pd.DataFrame,
	protected_attribute: str,
	target_column: str,
	domain: str,
	gcs_bucket: str,
	storage_client,
	favorable_label: int = 1,
) -> ModelAuditResult:
	bucket = storage_client.bucket(gcs_bucket)
	model_blob = bucket.blob(model_path)
	model_bytes = model_blob.download_as_bytes()
	model_file_size_kb = round(float(len(model_bytes)) / 1024.0, 4)

	model, model_type = load_model_from_storage(storage_client, gcs_bucket, model_path)

	feature_columns = [
		c for c in csv_df.columns if c != target_column and c != protected_attribute
	]

	predictions = generate_predictions(model, model_type, csv_df, feature_columns)

	original_labels = csv_df[target_column].to_numpy(copy=True)

	# ── Historical fairness (ground-truth labels) ──
	historical_fairness = compute_fairness_metrics(
		csv_df,
		protected_attribute=protected_attribute,
		target_column=target_column,
		favorable_label=favorable_label,
		domain=domain,
	)

	# ── Model fairness (model predictions) ──
	audited_df = csv_df.copy()
	audited_df[target_column] = predictions
	model_fairness = compute_fairness_metrics(
		audited_df,
		protected_attribute=protected_attribute,
		target_column=target_column,
		favorable_label=favorable_label,
		domain=domain,
	)

	# ── Prediction counts ──
	unique_values, unique_counts = np.unique(predictions, return_counts=True)
	prediction_counts = {
		str(int(v)): int(c)
		for v, c in zip(unique_values.tolist(), unique_counts.tolist())
	}

	# ── Accuracy ──
	model_accuracy = round(float(np.mean(predictions == original_labels)), 4)

	# ── Counterfactuals ──
	counterfactual_data = _generate_counterfactual_summary(
		model=model,
		model_type=model_type,
		df=csv_df,
		predictions=predictions,
		protected_attribute=protected_attribute,
		feature_columns=feature_columns,
		favorable_label=favorable_label,
	)

	return ModelAuditResult(
		model_type=model_type,
		feature_columns=feature_columns,
		prediction_counts=prediction_counts,
		model_accuracy=model_accuracy,
		model_file_size_kb=model_file_size_kb,
		historical_fairness=historical_fairness,
		model_fairness=model_fairness,
		counterfactual_data=counterfactual_data,
	)
