from dataclasses import dataclass
from typing import Literal

import numpy as np
import pandas as pd
from aif360.algorithms.preprocessing import DisparateImpactRemover
from aif360.algorithms.preprocessing import Reweighing
from aif360.datasets import BinaryLabelDataset
from aif360.metrics import BinaryLabelDatasetMetric
from aif360.metrics import ClassificationMetric


@dataclass
class FairnessResult:
	demographic_parity_difference: float
	equalized_odds_difference: float
	average_odds_difference: float
	disparate_impact_ratio: float
	statistical_parity_difference: float
	group_approval_rates: dict[str, float]
	flagged_metrics: list[str]
	overall_status: Literal["pass", "warning", "fail"]
	row_count: int
	group_counts: dict[str, int]
	thresholds_used: dict[str, float]


DOMAIN_THRESHOLDS: dict[str, dict[str, float]] = {
	"lending": {
		"disparate_impact_ratio_min": 0.80,
		"demographic_parity_difference_max": 0.10,
		"equalized_odds_difference_max": 0.10,
	},
	"employment": {
		"disparate_impact_ratio_min": 0.80,
		"demographic_parity_difference_max": 0.10,
		"equalized_odds_difference_max": 0.12,
	},
	"insurance": {
		"disparate_impact_ratio_min": 0.85,
		"demographic_parity_difference_max": 0.08,
		"equalized_odds_difference_max": 0.10,
	},
}


def compute_fairness_metrics(
	df: pd.DataFrame,
	protected_attribute: str,
	target_column: str,
	favorable_label: int = 1,
	domain: str = "lending",
) -> FairnessResult:
	if protected_attribute not in df.columns:
		raise ValueError(
			f"Protected attribute column '{protected_attribute}' not found in dataframe."
		)
	if target_column not in df.columns:
		raise ValueError(f"Target column '{target_column}' not found in dataframe.")
	if domain not in DOMAIN_THRESHOLDS:
		valid_domains = ", ".join(DOMAIN_THRESHOLDS.keys())
		raise ValueError(
			f"Unsupported domain '{domain}'. Expected one of: {valid_domains}."
		)

	working_df = df.dropna(subset=[protected_attribute, target_column]).copy()
	if working_df.empty:
		raise ValueError(
			"No rows remain after dropping NaN values in protected_attribute/target_column."
		)

	target_binary = (working_df[target_column] == favorable_label).astype(float)
	grouped_target = target_binary.groupby(working_df[protected_attribute])

	group_approval_rates_series = grouped_target.mean()
	group_counts_series = working_df[protected_attribute].value_counts(dropna=False)

	group_approval_rates: dict[str, float] = {
		str(group_value): round(float(rate), 4)
		for group_value, rate in group_approval_rates_series.items()
	}
	group_counts: dict[str, int] = {
		str(group_value): int(count)
		for group_value, count in group_counts_series.items()
	}

	privileged_group_value = group_approval_rates_series.idxmax()
	unprivileged_group_value = group_approval_rates_series.idxmin()

	# --- AIF360 NUMERICAL PATCH ---
	# AIF360 requires the dataset to be strictly numerical.
	# We dynamically encode string protected attributes to floats.
	priv_val = privileged_group_value
	unpriv_val = unprivileged_group_value

	if (
		working_df[protected_attribute].dtype == "object"
		or working_df[protected_attribute].dtype.name == "category"
	):
		working_df[protected_attribute] = working_df[protected_attribute].astype("category")
		cat_mapping = {
			cat: code
			for code, cat in enumerate(working_df[protected_attribute].cat.categories)
		}
		working_df[protected_attribute] = (
			working_df[protected_attribute].cat.codes.astype(float)
		)

		priv_val = float(cat_mapping[privileged_group_value])
		unpriv_val = float(cat_mapping[unprivileged_group_value])
	else:
		priv_val = float(priv_val)
		unpriv_val = float(unpriv_val)
	# ------------------------------

	binary_df = working_df[[protected_attribute, target_column]].copy()
	binary_df[target_column] = (binary_df[target_column] == favorable_label).astype(int)

	dataset = BinaryLabelDataset(
		df=binary_df,
		label_names=[target_column],
		protected_attribute_names=[protected_attribute],
		favorable_label=1,
		unfavorable_label=0,
	)

	privileged_groups = [{protected_attribute: priv_val}]
	unprivileged_groups = [{protected_attribute: unpriv_val}]

	metric = BinaryLabelDatasetMetric(
		dataset,
		privileged_groups=privileged_groups,
		unprivileged_groups=unprivileged_groups,
	)

	disparate_impact = float(metric.disparate_impact())
	statistical_parity_difference = float(metric.statistical_parity_difference())
	demographic_parity_difference = abs(statistical_parity_difference)

	predicted_dataset = dataset.copy(deepcopy=True)
	cm = ClassificationMetric(
		dataset,
		predicted_dataset,
		privileged_groups=privileged_groups,
		unprivileged_groups=unprivileged_groups,
	)
	equalized_odds_difference = abs(float(cm.equal_opportunity_difference()))
	average_odds_difference = abs(float(cm.average_odds_difference()))

	thresholds_used = DOMAIN_THRESHOLDS[domain]
	flagged_metrics: list[str] = []
	if disparate_impact < thresholds_used["disparate_impact_ratio_min"]:
		flagged_metrics.append("disparate_impact")
	if (
		demographic_parity_difference
		> thresholds_used["demographic_parity_difference_max"]
	):
		flagged_metrics.append("demographic_parity")
	if equalized_odds_difference > thresholds_used["equalized_odds_difference_max"]:
		flagged_metrics.append("equalized_odds")

	if len(flagged_metrics) == 0:
		overall_status: Literal["pass", "warning", "fail"] = "pass"
	elif len(flagged_metrics) == 1:
		overall_status = "warning"
	else:
		overall_status = "fail"

	return FairnessResult(
		demographic_parity_difference=round(float(demographic_parity_difference), 4),
		equalized_odds_difference=round(float(equalized_odds_difference), 4),
		average_odds_difference=round(float(average_odds_difference), 4),
		disparate_impact_ratio=round(float(disparate_impact), 4),
		statistical_parity_difference=round(float(statistical_parity_difference), 4),
		group_approval_rates=group_approval_rates,
		flagged_metrics=flagged_metrics,
		overall_status=overall_status,
		row_count=int(len(working_df)),
		group_counts=group_counts,
		thresholds_used={
			key: round(float(value), 4) for key, value in thresholds_used.items()
		},
	)
