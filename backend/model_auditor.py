import io
import pathlib
import pickle
from dataclasses import dataclass
from typing import Any, Literal

import numpy as np
import onnxruntime
import pandas as pd
from google.cloud import storage
from sklearn import preprocessing

from fairness_engine import FairnessResult, compute_fairness_metrics


@dataclass
class ModelAuditResult:
	model_type: Literal["sklearn", "onnx"]
	feature_columns: list[str]
	prediction_counts: dict[str, int]
	model_accuracy: float
	fairness_result: FairnessResult
	model_file_size_kb: float


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
		filename = pathlib.Path(model_path).name
		tmp_dir = pathlib.Path("/tmp")
		tmp_dir.mkdir(parents=True, exist_ok=True)
		tmp_path = tmp_dir / filename
		tmp_path.write_bytes(model_bytes)
		return onnxruntime.InferenceSession(str(tmp_path)), "onnx"

	raise ValueError(
		f"Unrecognized model extension '{extension}'. Expected .pkl or .onnx."
	)


def generate_predictions(
	model: Any,
	model_type: Literal["sklearn", "onnx"],
	df: pd.DataFrame,
	feature_columns: list[str],
) -> np.ndarray:
	if model_type == "sklearn":
		input_df = df
		if not isinstance(input_df, pd.DataFrame):
			input_df = pd.DataFrame(input_df, columns=feature_columns)
		try:
			return np.asarray(model.predict(input_df))
		except (KeyError, ValueError, TypeError):
			return np.asarray(model.predict(input_df[feature_columns]))

	input_name = model.get_inputs()[0].name
	x_float32 = df[feature_columns].values.astype(np.float32)
	predictions = model.run(None, {input_name: x_float32})
	return np.asarray(predictions[0]).flatten()


def run_model_audit(
	model_path: str,
	csv_df: pd.DataFrame,
	protected_attribute: str,
	target_column: str,
	domain: str,
	gcs_bucket: str,
	storage_client,
) -> ModelAuditResult:
	bucket = storage_client.bucket(gcs_bucket)
	model_blob = bucket.blob(model_path)
	model_file_size_kb = round(float(len(model_blob.download_as_bytes())) / 1024.0, 4)

	model, model_type = load_model_from_storage(storage_client, gcs_bucket, model_path)

	feature_columns = [
		c for c in csv_df.columns if c != target_column and c != protected_attribute
	]

	predictions = generate_predictions(model, model_type, csv_df, feature_columns)

	original_labels = csv_df[target_column].to_numpy(copy=True)
	audited_df = csv_df.copy()
	audited_df[target_column] = predictions

	fairness_result = compute_fairness_metrics(
		audited_df,
		protected_attribute=protected_attribute,
		target_column=target_column,
		favorable_label=1,
		domain=domain,
	)

	unique_values, unique_counts = np.unique(predictions, return_counts=True)
	prediction_counts = {
		str(int(value)): int(count)
		for value, count in zip(unique_values.tolist(), unique_counts.tolist())
	}

	model_accuracy = -1.0
	if target_column in csv_df.columns:
		model_accuracy = round(float(np.mean(predictions == original_labels)), 4)

	return ModelAuditResult(
		model_type=model_type,
		feature_columns=feature_columns,
		prediction_counts=prediction_counts,
		model_accuracy=model_accuracy,
		fairness_result=fairness_result,
		model_file_size_kb=model_file_size_kb,
	)
