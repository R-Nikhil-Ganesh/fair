from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn import pipeline

from model_auditor import generate_predictions


@dataclass
class CounterfactualEntry:
	changed_attribute: str
	original_value: Any
	counterfactual_value: Any
	counterfactual_prediction: int
	decision_changed: bool


@dataclass
class CounterfactualResult:
	record_index: int
	original_prediction: int
	original_protected_value: Any
	counterfactuals: list[CounterfactualEntry]
	narrative: str


def generate_counterfactuals(
	model: Any,
	model_type: str,
	df: pd.DataFrame,
	record_index: int,
	protected_attributes: list[str],
	feature_columns: list[str],
) -> CounterfactualResult:
	if record_index < 0 or record_index >= len(df):
		raise IndexError(
			f"record_index {record_index} is out of bounds for dataframe of size {len(df)}"
		)

	df_record = df.iloc[[record_index]].copy()
	original_prediction_array = generate_predictions(
		model=model,
		model_type=model_type,
		df=df_record,
		feature_columns=feature_columns,
	)
	original_prediction = int(np.asarray(original_prediction_array).flatten()[0])

	original_protected_values = {
		attr: df_record[attr].iloc[0] for attr in protected_attributes
	}

	entries: list[CounterfactualEntry] = []
	for protected_attribute in protected_attributes:
		original_value = df_record[protected_attribute].iloc[0]
		unique_values = df[protected_attribute].dropna().unique().tolist()

		for counterfactual_value in unique_values:
			if counterfactual_value == original_value:
				continue

			modified_record = df_record.copy()
			modified_record[protected_attribute] = counterfactual_value

			counterfactual_prediction_array = generate_predictions(
				model=model,
				model_type=model_type,
				df=modified_record,
				feature_columns=feature_columns,
			)
			counterfactual_prediction = int(
				np.asarray(counterfactual_prediction_array).flatten()[0]
			)

			entries.append(
				CounterfactualEntry(
					changed_attribute=protected_attribute,
					original_value=original_value,
					counterfactual_value=counterfactual_value,
					counterfactual_prediction=counterfactual_prediction,
					decision_changed=(counterfactual_prediction != original_prediction),
				)
			)

	return CounterfactualResult(
		record_index=record_index,
		original_prediction=original_prediction,
		original_protected_value=original_protected_values,
		counterfactuals=entries,
		narrative="",
	)
