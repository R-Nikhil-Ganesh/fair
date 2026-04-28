"""Generate a tiny sklearn model for local FairLend AI testing.

The backend model audit flow accepts either .pkl or .onnx files. This script
trains a simple pipeline on the bundled German Credit sample CSV and writes a
pickle artifact that can be uploaded directly in the app.
"""

from __future__ import annotations

import pickle
from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT / "public" / "datasets" / "german_credit_sample.csv"
OUTPUT_PATH = ROOT / "backend" / "test_assets" / "german_credit_sample_model.pkl"


def build_model() -> Pipeline:
    dataset = pd.read_csv(DATASET_PATH)

    feature_columns = ["age", "credit_amount", "duration", "purpose"]
    target_column = "credit_risk"

    features = dataset[feature_columns]
    target = dataset[target_column]

    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", StandardScaler(), ["age", "credit_amount", "duration"]),
            ("categorical", OneHotEncoder(handle_unknown="ignore"), ["purpose"]),
        ],
        remainder="drop",
    )

    model = Pipeline(
        steps=[
            ("preprocess", preprocessor),
            ("classifier", LogisticRegression(max_iter=1000, random_state=42)),
        ]
    )

    model.fit(features, target)
    score = accuracy_score(target, model.predict(features))
    print(f"Training accuracy on sample data: {score:.4f}")
    return model


def main() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    model = build_model()

    with OUTPUT_PATH.open("wb") as handle:
        pickle.dump(model, handle)

    print(f"Saved model to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()