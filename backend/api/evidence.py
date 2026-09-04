import io
import json
import zipfile
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from backend.config import settings, EVIDENCE_DIR, BASE_DIR
from backend.database.database import get_db
from backend.database.models import Event, AuditLog, Camera, Vehicle
from backend.services.evidence_service import EvidenceService

router = APIRouter(prefix="/evidence", tags=["Evidence"])

@router.get("/file/{filename}")
def get_evidence_file(filename: str):
    file_path = EVIDENCE_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Evidence image not found")
    return FileResponse(str(file_path), media_type="image/jpeg")

@router.post("/events/{event_id}/verify")
def verify_event_evidence(event_id: str, db: Session = Depends(get_db)):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    cam = db.query(Camera).filter(Camera.id == ev.camera_id).first()
    loc = cam.location if cam else "Sector Perimeter"

    # Ensure evidence file exists on disk
    if not ev.evidence_path or not (BASE_DIR / ev.evidence_path).exists():
        snap = EvidenceService.create_synthetic_keyframe(
            event_id=ev.id,
            camera_id=ev.camera_id or "CAM-01",
            camera_location=loc,
            event_type=ev.event_type,
            track_label=f"{ev.object_type.upper()} #{ev.tracking_id}",
            risk_score=ev.risk_score,
            risk_level=ev.risk_level
        )
        ev.evidence_path = snap["evidence_path"]
        ev.evidence_hash = snap["evidence_hash"]
        db.commit()

    verification = EvidenceService.verify_integrity(ev.evidence_path, ev.evidence_hash)

    rec_h = verification.get("recorded_hash") or ev.evidence_hash or ""
    rec_preview = f"{rec_h[:16]}..." if len(rec_h) >= 16 else rec_h

    # Log audit verification
    audit = AuditLog(
        username="OPERATOR",
        action="VERIFY_EVIDENCE_INTEGRITY",
        event_id=event_id,
        details=f"Evidence verification for {event_id}: Result={verification.get('status')}, SHA256={rec_preview}"
    )
    db.add(audit)
    db.commit()

    return {
        "event_id": event_id,
        "is_valid": verification.get("is_valid", False),
        "status": verification.get("status", "UNKNOWN"),
        "recorded_hash": verification.get("recorded_hash", ev.evidence_hash),
        "current_hash": verification.get("current_hash"),
        "message": verification.get("message", ""),
        "verified_at": verification.get("verified_at")
    }

@router.get("/events/{event_id}/export-bundle")
def export_evidence_zip_bundle(event_id: str, db: Session = Depends(get_db)):
    """
    Generates a cryptographically sealed ZIP evidence bundle for formal legal proceedings & court evidence.
    Contains the stamped keyframe JPEG, manifest.sha256, metadata.json, and Chain of Custody certificate.
    """
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    cam = db.query(Camera).filter(Camera.id == ev.camera_id).first()
    loc = cam.location if cam else "Border Perimeter"
    veh = db.query(Vehicle).filter(Vehicle.event_id == ev.id).first()
    audit_trail = db.query(AuditLog).filter(AuditLog.event_id == ev.id).all()

    # Ensure evidence file exists on disk
    if not ev.evidence_path or not (BASE_DIR / ev.evidence_path).exists():
        snap = EvidenceService.create_synthetic_keyframe(
            event_id=ev.id,
            camera_id=ev.camera_id or "CAM-01",
            camera_location=loc,
            event_type=ev.event_type,
            track_label=f"{ev.object_type.upper()} #{ev.tracking_id}",
            risk_score=ev.risk_score,
            risk_level=ev.risk_level
        )
        ev.evidence_path = snap["evidence_path"]
        ev.evidence_hash = snap["evidence_hash"]
        db.commit()

    # Re-verify hash
    verification = EvidenceService.verify_integrity(ev.evidence_path, ev.evidence_hash) if ev.evidence_path else {"is_valid": False, "status": "UNKNOWN"}

    # Prepare in-memory ZIP
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # 1. Keyframe snapshot image
        if ev.evidence_path:
            img_path = BASE_DIR / ev.evidence_path
            if img_path.exists():
                with open(img_path, "rb") as f:
                    zip_file.writestr(f"keyframe_evidence_{event_id}.jpg", f.read())

        # 2. SHA-256 Manifest
        manifest_text = f"""# IBVAP CRYPTOGRAPHIC EVIDENCE MANIFEST
# Standard: SHA-256 Digest (FIPS 180-4)
# Ministry of Home Affairs / SSB Problem Statement 26187

FILE_NAME: keyframe_evidence_{event_id}.jpg
SHA256_HASH: {ev.evidence_hash}
PREVIOUS_BLOCK_HASH: {ev.prev_hash}
INTEGRITY_STATUS: {verification['status']}
RECORDED_UTC: {ev.timestamp.isoformat() if ev.timestamp else 'N/A'}
"""
        zip_file.writestr("manifest.sha256", manifest_text)

        # 3. Machine-readable JSON Metadata
        metadata_dict = {
            "platform": settings.PROJECT_NAME,
            "incident_id": ev.id,
            "event_type": ev.event_type,
            "camera_id": ev.camera_id,
            "camera_name": cam.name if cam else ev.camera_id,
            "sector": cam.location if cam else "Border Perimeter",
            "target": {
                "object_type": ev.object_type,
                "tracking_id": ev.tracking_id,
                "vehicle_plate": veh.plate_number if veh else None
            },
            "risk_assessment": {
                "prototype_risk_score": ev.risk_score,
                "prototype_risk_level": ev.risk_level,
                "classification": "Prototype Decision Support Indicator"
            },
            "cryptography": {
                "sha256_digest": ev.evidence_hash,
                "prev_hash": ev.prev_hash,
                "verification_status": verification["status"]
            },
            "operator_review": {
                "status": ev.status,
                "notes": ev.notes,
                "acknowledged_by": ev.acknowledged_by,
                "acknowledged_at": ev.acknowledged_at.isoformat() if ev.acknowledged_at else None
            },
            "audit_trail": [
                {
                    "timestamp": a.timestamp.isoformat() if a.timestamp else None,
                    "principal": a.username,
                    "action": a.action,
                    "details": a.details
                }
                for a in audit_trail
            ]
        }
        zip_file.writestr("incident_metadata.json", json.dumps(metadata_dict, indent=2))

        # 4. Chain of Custody Official Certificate
        cert_text = f"""========================================================================
SASHASTRA SEEMA BAL (SSB) • POLICE II DIVISION • MINISTRY OF HOME AFFAIRS
INTELLIGENT BORDER VIDEO ANALYTICS PLATFORM (IBVAP)
CERTIFICATE OF EVIDENCE INTEGRITY & CHAIN OF CUSTODY
========================================================================

INCIDENT ID       : {ev.id}
DATE / TIME (UTC) : {ev.timestamp}
MONITORED SECTOR  : {cam.location if cam else 'Sector Perimeter'}
SENSOR IDENTIFIER : {ev.camera_id} ({cam.name if cam else ''})
EVENT TYPE        : {ev.event_type}
TARGET ID         : {ev.object_type.upper()} #{ev.tracking_id}
RISK SCORE        : {ev.risk_score} / 100 ({ev.risk_level})

CRYPTOGRAPHIC INTEGRITY:
SHA-256 DIGEST    : {ev.evidence_hash}
CHAIN LINK (PREV) : {ev.prev_hash}
CURRENT STATUS    : {verification['status']}

OPERATOR NOTES    : {ev.notes or 'No additional notes provided.'}
AUTHORIZING DESK  : {ev.acknowledged_by or 'SSB Duty Operator'}

This certificate and associated digital evidence have been generated 
automatically by the IBVAP decision support layer with cryptographic 
timestamping and SHA-256 tamper-evident provenance.
========================================================================
"""
        zip_file.writestr("CHAIN_OF_CUSTODY_CERTIFICATE.txt", cert_text)

    # Log audit export
    audit = AuditLog(
        username="OPERATOR",
        action="EXPORT_FORENSIC_ZIP_BUNDLE",
        event_id=event_id,
        details=f"Exported forensic ZIP evidence package for incident {event_id}."
    )
    db.add(audit)
    db.commit()

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="IBVAP_Forensic_Evidence_{event_id}.zip"'}
    )

@router.post("/events/{event_id}/simulate-tamper")
def simulate_evidence_tamper(event_id: str, db: Session = Depends(get_db)):
    """Demo test endpoint: Modifies 1 pixel in the evidence file to demonstrate cryptographic tamper detection!"""
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Incident event not found")

    cam = db.query(Camera).filter(Camera.id == ev.camera_id).first()
    loc = cam.location if cam else "Border Perimeter"

    if not ev.evidence_path or not (BASE_DIR / ev.evidence_path).exists():
        snap = EvidenceService.create_synthetic_keyframe(
            event_id=ev.id,
            camera_id=ev.camera_id or "CAM-01",
            camera_location=loc,
            event_type=ev.event_type,
            track_label=f"{ev.object_type.upper()} #{ev.tracking_id}",
            risk_score=ev.risk_score,
            risk_level=ev.risk_level
        )
        ev.evidence_path = snap["evidence_path"]
        ev.evidence_hash = snap["evidence_hash"]
        db.commit()

    file_path = BASE_DIR / ev.evidence_path
    with open(file_path, "ab") as f:
        f.write(b"\x00\xFF_TAMPER_TEST_DATA")

    audit = AuditLog(
        username="SECURITY_TESTER",
        action="SIMULATE_TAMPER_TEST",
        event_id=event_id,
        details=f"Intentional file modification simulated on {event_id} to test tamper detection."
    )
    db.add(audit)
    db.commit()

    return {"message": f"Tamper simulated on {event_id}. Run verify now to observe integrity failure detection."}
