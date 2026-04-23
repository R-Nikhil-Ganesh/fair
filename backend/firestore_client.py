import google.cloud.firestore
from google.cloud.firestore import SERVER_TIMESTAMP

db = google.cloud.firestore.Client()


def _audit_doc_ref(uid: str, audit_id: str):
	return db.collection("audits").document(uid).collection("audits").document(audit_id)


def update_audit_status(uid: str, audit_id: str, status: str, progress: int):
	_audit_doc_ref(uid, audit_id).set(
		{
			"status": status,
			"progress": progress,
			"updatedAt": SERVER_TIMESTAMP,
		},
		merge=True,
	)


def update_audit_results(uid: str, audit_id: str, results: dict):
	_audit_doc_ref(uid, audit_id).set(
		{
			"status": "complete",
			"progress": 100,
			"completedAt": SERVER_TIMESTAMP,
			"updatedAt": SERVER_TIMESTAMP,
			"results": results,
		},
		merge=True,
	)


def update_audit_error(uid: str, audit_id: str, error_message: str):
	_audit_doc_ref(uid, audit_id).set(
		{
			"status": "error",
			"error": error_message,
			"updatedAt": SERVER_TIMESTAMP,
		},
		merge=True,
	)


def write_progress_checkpoint(uid: str, audit_id: str, step: str, progress: int):
	_audit_doc_ref(uid, audit_id).set(
		{
			"currentStep": step,
			"progress": progress,
			"updatedAt": SERVER_TIMESTAMP,
		},
		merge=True,
	)
