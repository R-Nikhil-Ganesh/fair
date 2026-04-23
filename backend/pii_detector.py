import re
from dataclasses import dataclass
from typing import Literal

import pandas as pd


@dataclass
class PIIColumn:
	column_name: str
	pii_type: Literal["email", "phone", "ssn", "name", "ip_address", "unknown_pii"]
	sample_value: str
	confidence: Literal["high", "medium"]


@dataclass
class PIIDetectionResult:
	has_pii: bool
	flagged_columns: list[PIIColumn]
	safe_to_proceed: bool


EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_PATTERN = re.compile(r"(\+?1?\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}")
SSN_PATTERN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
IP_PATTERN = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
NAME_TOKENS = ("name", "first", "last", "fname", "lname")


def _redact_sample(value: str) -> str:
	if not value:
		return ""
	if len(value) <= 5:
		return f"{value[:1]}*{value[-1:]}"
	return f"{value[:3]}*{value[-2:]}"


def _match_ratio(values: list[str], pattern: re.Pattern[str]) -> float:
	if not values:
		return 0.0
	matches = sum(1 for v in values if pattern.search(v))
	return matches / len(values)


def _first_match(values: list[str], pattern: re.Pattern[str]) -> str:
	for value in values:
		matched = pattern.search(value)
		if matched:
			return matched.group(0)
	return values[0] if values else ""


def detect_pii(df: pd.DataFrame) -> PIIDetectionResult:
	flagged_columns: list[PIIColumn] = []

	for column in df.columns:
		sampled_values = (
			df[column].dropna().astype(str).head(100).tolist()
		)
		if not sampled_values:
			continue

		column_lower = str(column).lower()

		if any(token in column_lower for token in NAME_TOKENS):
			sample_value = _redact_sample(sampled_values[0])
			flagged_columns.append(
				PIIColumn(
					column_name=str(column),
					pii_type="name",
					sample_value=sample_value,
					confidence="medium",
				)
			)
			continue

		patterns: list[tuple[Literal["email", "phone", "ssn", "ip_address"], re.Pattern[str]]] = [
			("email", EMAIL_PATTERN),
			("phone", PHONE_PATTERN),
			("ssn", SSN_PATTERN),
			("ip_address", IP_PATTERN),
		]

		matched_type: Literal[
			"email", "phone", "ssn", "ip_address", "unknown_pii"
		] | None = None
		matched_value = ""
		for pii_type, pattern in patterns:
			ratio = _match_ratio(sampled_values, pattern)
			if ratio > 0.20:
				matched_type = pii_type
				matched_value = _first_match(sampled_values, pattern)
				break

		if matched_type is not None:
			flagged_columns.append(
				PIIColumn(
					column_name=str(column),
					pii_type=matched_type,
					sample_value=_redact_sample(matched_value),
					confidence="high",
				)
			)

	return PIIDetectionResult(
		has_pii=len(flagged_columns) > 0,
		flagged_columns=flagged_columns,
		safe_to_proceed=False,
	)
