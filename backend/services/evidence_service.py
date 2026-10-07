import hashlib
import os
import cv2
import numpy as np
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List
from backend.config import BASE_DIR, EVIDENCE_DIR

class EvidenceService:
    @staticmethod
    def calculate_sha256(file_path: Path) -> str:
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    @staticmethod
    def calculate_bytes_sha256(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    @classmethod
    def save_keyframe(
        cls,
        frame: np.ndarray,
        event_id: str,
        camera_id: str,
        camera_location: str,
        event_type: str,
        track_label: str,
        risk_score: int,
        risk_level: str
    ) -> Dict[str, Any]:
        """
        Overlays cryptographic security stamp and saves keyframe to disk.
        Returns dict with relative evidence_path and SHA-256 hash.
        """
        now = datetime.now(timezone.utc)
        timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S UTC")
        
        stamped_frame = frame.copy() if frame is not None else np.zeros((480, 640, 3), dtype=np.uint8)
        h, w = stamped_frame.shape[:2]

        # Draw security banner overlay
        banner_h = 42
        cv2.rectangle(stamped_frame, (0, h - banner_h), (w, h), (15, 15, 20), -1)
        
        # Risk color
        risk_color = (0, 0, 255) if risk_level == "CRITICAL" else (0, 140, 255) if risk_level == "HIGH" else (0, 215, 255)
        cv2.rectangle(stamped_frame, (0, h - banner_h), (8, h), risk_color, -1)

        # Text banner
        line1 = f"IBVAP EVIDENCE LEDGER | {event_id} | {camera_id} - {camera_location} | {timestamp_str}"
        line2 = f"ALERT: {event_type.upper()} | TARGET: {track_label} | RISK: {risk_score}/100 ({risk_level}) | SHA-256 SEALED"

        cv2.putText(stamped_frame, line1, (16, h - 24), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (220, 220, 220), 1, cv2.LINE_AA)
        cv2.putText(stamped_frame, line2, (16, h - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.42, risk_color, 1, cv2.LINE_AA)

        filename = f"{event_id}_{int(now.timestamp())}.jpg"
        file_path = EVIDENCE_DIR / filename

        # Encode with JPEG quality 85
        encode_success, buffer = cv2.imencode(".jpg", stamped_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        if encode_success:
            img_bytes = buffer.tobytes()
            with open(file_path, "wb") as f:
                f.write(img_bytes)
            file_hash = cls.calculate_bytes_sha256(img_bytes)
        else:
            cv2.imwrite(str(file_path), stamped_frame)
            file_hash = cls.calculate_sha256(file_path)

        rel_path = f"evidence/{filename}"
        return {
            "evidence_path": rel_path,
            "evidence_hash": file_hash,
            "timestamp": now.isoformat(),
            "filename": filename
        }

    @classmethod
    def capture_snapshot(
        cls,
        frame: np.ndarray,
        event_id: str,
        camera_id: str,
        camera_location: str,
        event_type: str,
        track_label: str,
        risk_score: int,
        risk_level: str,
        bbox: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        return cls.save_keyframe(
            frame=frame,
            event_id=event_id,
            camera_id=camera_id,
            camera_location=camera_location,
            event_type=event_type,
            track_label=track_label,
            risk_score=risk_score,
            risk_level=risk_level
        )


    @classmethod
    def create_synthetic_keyframe(
        cls,
        event_id: str,
        camera_id: str = "CAM-01",
        camera_location: str = "Sector Perimeter",
        event_type: str = "Restricted Zone Intrusion",
        track_label: str = "PERSON #17",
        risk_score: int = 85,
        risk_level: str = "CRITICAL"
    ) -> Dict[str, Any]:
        # Generate clean synthetic frame
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        # Background gradient
        for y in range(480):
            val = int(25 + 20 * (y / 480))
            img[y, :] = (val, val + 5, val + 10)

        # Draw grid
        for x in range(0, 640, 40):
            cv2.line(img, (x, 0), (x, 480), (40, 45, 50), 1)
        for y in range(0, 480, 40):
            cv2.line(img, (0, y), (640, y), (40, 45, 50), 1)

        # Draw synthetic bounding box
        cv2.rectangle(img, (260, 160), (360, 360), (0, 0, 255), 2)
        cv2.putText(img, track_label, (260, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        return cls.save_keyframe(
            frame=img,
            event_id=event_id,
            camera_id=camera_id,
            camera_location=camera_location,
            event_type=event_type,
            track_label=track_label,
            risk_score=risk_score,
            risk_level=risk_level
        )

    @classmethod
    def verify_integrity(cls, relative_path: str, recorded_hash: str) -> Dict[str, Any]:
        if not relative_path:
            return {
                "is_valid": False,
                "status": "MISSING_PATH",
                "recorded_hash": recorded_hash,
                "current_hash": None,
                "message": "No evidence path recorded for this event.",
                "verified_at": datetime.now(timezone.utc).isoformat()
            }

        full_path = BASE_DIR / relative_path
        if not full_path.exists():
            return {
                "is_valid": False,
                "status": "FILE_NOT_FOUND",
                "recorded_hash": recorded_hash,
                "current_hash": None,
                "message": f"Evidence file not found on disk at {relative_path}.",
                "verified_at": datetime.now(timezone.utc).isoformat()
            }

        current_hash = cls.calculate_sha256(full_path)
        is_valid = (current_hash.lower() == (recorded_hash or "").lower())

        return {
            "is_valid": is_valid,
            "status": "VERIFIED" if is_valid else "TAMPER_DETECTED",
            "recorded_hash": recorded_hash,
            "current_hash": current_hash,
            "message": "Cryptographic SHA-256 seal matches disk keyframe exactly." if is_valid else "ALERT: SHA-256 mismatch! Evidence file was modified or corrupted.",
            "verified_at": datetime.now(timezone.utc).isoformat()
        }

    @classmethod
    def simulate_tamper(cls, relative_path: str) -> bool:
        full_path = BASE_DIR / relative_path
        if not full_path.exists():
            return False
        with open(full_path, "r+b") as f:
            f.seek(100)
            byte = f.read(1)
            f.seek(100)
            # Flip bits of one byte
            f.write(bytes([byte[0] ^ 0xFF]) if byte else b"\x00")
        return True
