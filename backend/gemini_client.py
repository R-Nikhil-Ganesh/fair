import json
import os
from dataclasses import dataclass
from typing import Literal

import vertexai
from vertexai.generative_models import GenerativeModel

from counterfactuals import CounterfactualResult
from fairness_engine import FairnessResult

project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
vertexai.init(
	project=project_id,
	location=os.environ.get("VERTEX_AI_LOCATION", "us-central1"),
)
model = GenerativeModel("gemini-1.5-flash-002")


@dataclass
class MitigationStep:
	rank: int
	title: str
	description: str
	difficulty: Literal["low", "medium", "high"]
	regulatory_reference: str
	estimated_impact: Literal["low", "medium", "high"]


@dataclass
class GeminiAuditOutput:
	bias_narrative: str
	severity_summary: str
	mitigation_plan: list[MitigationStep]
	raw_response_tokens: int


def _response_text(response) -> str:
	text = getattr(response, "text", "")
	if text:
		return text.strip()
	return ""


def generate_bias_narrative(
	fairness_result: FairnessResult,
	domain: str,
	protected_attribute: str,
) -> str:
	groups_with_rates = ", ".join(
		[
			f"{group}: {rate}"
			for group, rate in fairness_result.group_approval_rates.items()
		]
	)

	prompt = f"""You are a fairness auditor writing a report for a compliance officer who has NO
machine learning background. Write 2-3 paragraphs in plain English explaining
the following bias findings from a {domain} decision system.
Protected attribute analyzed: {protected_attribute}
Groups found: {groups_with_rates}
Flagged metrics: {fairness_result.flagged_metrics}
Disparate impact ratio: {fairness_result.disparate_impact_ratio}
(below 0.80 violates the legal 80% rule in lending and employment)
Demographic parity difference: {fairness_result.demographic_parity_difference}
Equalized odds difference: {fairness_result.equalized_odds_difference}
Overall status: {fairness_result.overall_status}
Write in plain English. Avoid statistical jargon. Explain what this means for
real people affected by this system. Start with a one-sentence summary of the
most critical finding. Do not include bullet points. Do not mention model names.
Output ONLY the narrative text, nothing else."""

	response = model.generate_content(prompt)
	return _response_text(response)


def generate_mitigation_plan(
	fairness_result: FairnessResult,
	domain: str,
	protected_attribute: str,
) -> list[MitigationStep]:
	base_prompt = f"""You are an AI fairness expert. A {domain} decision system has been audited and
shows the following bias:
Flagged metrics: {fairness_result.flagged_metrics}
Disparate impact ratio: {fairness_result.disparate_impact_ratio}
Overall status: {fairness_result.overall_status}
Protected attribute: {protected_attribute}
Generate EXACTLY 4 mitigation steps ranked by priority (1 = most urgent).
Respond with ONLY a valid JSON array, no markdown, no explanation, no code blocks.
The JSON must match this schema exactly:
[
{{
"rank": 1,
"title": "short action title",
"description": "2-3 sentence description of what to do",
"difficulty": "low|medium|high",
"regulatory_reference": "specific law or regulation, or empty string",
"estimated_impact": "low|medium|high"
}}
]"""

	strict_prompt = (
		base_prompt
		+ "\nReturn ONLY raw JSON. No prose, no markdown, no code fences, no trailing text."
	)

	last_error: Exception | None = None
	for prompt in (base_prompt, strict_prompt):
		response = model.generate_content(prompt)
		raw = _response_text(response)
		try:
			parsed = json.loads(raw)
			if not isinstance(parsed, list):
				raise ValueError("Expected a JSON array.")

			steps: list[MitigationStep] = []
			for item in parsed:
				if not isinstance(item, dict):
					raise ValueError("Each mitigation step must be a JSON object.")
				steps.append(
					MitigationStep(
						rank=int(item.get("rank")),
						title=str(item.get("title", "")),
						description=str(item.get("description", "")),
						difficulty=str(item.get("difficulty", "")).lower(),
						regulatory_reference=str(item.get("regulatory_reference", "")),
						estimated_impact=str(item.get("estimated_impact", "")).lower(),
					)
				)
			return steps
		except Exception as exc:  # noqa: BLE001
			last_error = exc

	raise ValueError(f"Failed to parse mitigation plan JSON after retry: {last_error}")


def generate_counterfactual_narrative(
	counterfactual_result: CounterfactualResult,
	domain: str,
) -> str:
	changed_lines = []
	for entry in counterfactual_result.counterfactuals:
		if entry.decision_changed:
			outcome = "approved" if entry.counterfactual_prediction == 1 else "denied"
			changed_lines.append(
				f"If {entry.changed_attribute} were {entry.counterfactual_value}: decision would be {outcome}"
			)
	changed_outcomes = "\n".join(changed_lines) if changed_lines else "None"
	original_decision = "approved" if counterfactual_result.original_prediction == 1 else "denied"

	prompt = f"""Write ONE paragraph (3-5 sentences) in plain English narrating the following
counterfactual analysis of a {domain} decision. Write as if speaking directly
to the affected person. Be factual and compassionate.
Original protected attribute value: {counterfactual_result.original_protected_value}
Original decision: {original_decision}
Changed outcomes when attribute was altered:
{changed_outcomes}
Output ONLY the paragraph, no headers, no bullet points."""

	response = model.generate_content(prompt)
	return _response_text(response)
