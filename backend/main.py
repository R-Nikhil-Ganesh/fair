import os
from functools import lru_cache
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import firestore
from pydantic import BaseModel
from slowapi import Limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from celery_worker import run_audit_task, run_model_audit_task


class AuditStartRequest(BaseModel):
	audit_id: str
	csv_path: str
	protected_attribute: str
	target_column: str
	favorable_label: int = 1
	domain: Literal["lending", "employment", "insurance"] = "lending"
	uid: str


class ModelAuditRequest(BaseModel):
	audit_id: str
	model_path: str
	csv_path: str
	protected_attribute: str
	target_column: str
	uid: str


def _parse_cors_origins() -> list[str]:
	origins_raw = os.getenv(
		"BACKEND_CORS_ORIGINS",
		"http://localhost:3000",
	)
	return [origin.strip() for origin in origins_raw.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def _get_firestore_client() -> firestore.Client:
	project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
	return firestore.Client(project=project_id) if project_id else firestore.Client()


app = FastAPI(title="FairLens API", version="1.0.0")

app.add_middleware(
	CORSMiddleware,
	allow_origins=_parse_cors_origins(),
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


@app.post("/api/audit/start")
@limiter.limit("10/minute")
async def start_audit(request: Request, audit_start_request: AuditStartRequest):
	if not audit_start_request.audit_id.strip():
		raise HTTPException(status_code=400, detail="audit_id must be non-empty")

	task = run_audit_task.delay(audit_start_request.dict())
	db = _get_firestore_client()
	db.document(
		f"audits/{audit_start_request.uid}/audits/{audit_start_request.audit_id}"
	).set(
		{
			"status": "queued",
			"taskId": str(task.id),
			"updatedAt": firestore.SERVER_TIMESTAMP,
		},
		merge=True,
	)

	return {
		"status": "queued",
		"audit_id": audit_start_request.audit_id,
		"task_id": str(task.id),
	}


@app.post("/api/audit/model")
@limiter.limit("5/minute")
async def start_model_audit(request: Request, model_audit_request: ModelAuditRequest):
	if not model_audit_request.audit_id.strip():
		raise HTTPException(status_code=400, detail="audit_id must be non-empty")

	task = run_model_audit_task.delay(model_audit_request.dict())
	db = _get_firestore_client()
	db.document(
		f"audits/{model_audit_request.uid}/audits/{model_audit_request.audit_id}"
	).set(
		{
			"status": "queued",
			"taskId": str(task.id),
			"updatedAt": firestore.SERVER_TIMESTAMP,
		},
		merge=True,
	)

	return {
		"status": "queued",
		"audit_id": model_audit_request.audit_id,
		"task_id": str(task.id),
	}


@app.get("/api/audit/{audit_id}/status")
@limiter.limit("60/minute")
async def get_audit_status(request: Request, audit_id: str, uid: str = Query(...)):
	db = _get_firestore_client()
	doc_ref = db.document(f"audits/{uid}/audits/{audit_id}")
	snapshot = doc_ref.get()

	if not snapshot.exists:
		raise HTTPException(status_code=404, detail="Audit not found")

	data = snapshot.to_dict() or {}
	data["audit_id"] = audit_id
	return data


@app.get("/api/health")
async def health_check():
	return {"status": "ok", "version": "1.0.0"}
