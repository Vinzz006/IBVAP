import time
import math
import logging
from types import SimpleNamespace
from typing import Dict, List, Any, Optional
import numpy as np
import torch
from ultralytics.trackers.byte_tracker import BYTETracker

from backend.config import settings
from backend.ai.batch_inference import batch_engine, TARGET_CLASSES

logger = logging.getLogger("ObjectTracker")

class TrackedObject:
    __slots__ = (
        "track_id", "class_id", "class_name", "bbox", "confidence",
        "first_seen", "last_seen", "centroid", "history",
        "was_in_zone", "is_in_zone", "last_alert_time", "velocity_est"
    )

    def __init__(self, track_id: int, class_id: int, class_name: str, bbox: List[int], confidence: float, current_time: Optional[float] = None):
        t = current_time or time.monotonic()
        self.track_id = track_id
        self.class_id = class_id
        self.class_name = class_name
        self.bbox = bbox  # [x1, y1, x2, y2]
        self.confidence = confidence
        self.first_seen = t
        self.last_seen = t
        self.history: List[List[int]] = []
        self.was_in_zone = False
        self.is_in_zone = False
        self.last_alert_time = 0.0
        self.velocity_est: List[float] = [0.0, 0.0]
        self.update_centroid()

    @property
    def label(self) -> str:
        return f"{self.class_name.upper()} #{self.track_id}"

    def update_centroid(self):
        cx = int((self.bbox[0] + self.bbox[2]) >> 1)
        cy = int((self.bbox[1] + self.bbox[3]) >> 1)
        self.centroid = [cx, cy]
        self.history.append([cx, cy])
        if len(self.history) > 30:
            self.history.pop(0)

    def update(self, bbox: List[int], confidence: float, current_time: Optional[float] = None):
        t = current_time or time.monotonic()
        dt = max(0.01, t - self.last_seen)
        old_cx, old_cy = self.centroid
        self.bbox = bbox
        self.confidence = confidence
        self.last_seen = t
        self.update_centroid()
        new_cx, new_cy = self.centroid
        
        # Exponential moving average velocity filter
        vx = (new_cx - old_cx) / dt
        vy = (new_cy - old_cy) / dt
        self.velocity_est = [
            0.7 * self.velocity_est[0] + 0.3 * vx,
            0.7 * self.velocity_est[1] + 0.3 * vy
        ]

    def extrapolate(self, dt: float, max_w: int = 1920, max_h: int = 1080):
        """Linearly extrapolates bbox position based on estimated velocity during skipped frames."""
        dx = int(self.velocity_est[0] * dt)
        dy = int(self.velocity_est[1] * dt)
        x1 = max(0, min(max_w, self.bbox[0] + dx))
        y1 = max(0, min(max_h, self.bbox[1] + dy))
        x2 = max(0, min(max_w, self.bbox[2] + dx))
        y2 = max(0, min(max_h, self.bbox[3] + dy))
        self.bbox = [x1, y1, x2, y2]
        self.centroid = [int((x1 + x2) >> 1), int((y1 + y2) >> 1)]

    @property
    def dwell_time(self) -> float:
        return max(0.0, self.last_seen - self.first_seen)

    @property
    def velocity(self) -> List[float]:
        return [round(self.velocity_est[0], 2), round(self.velocity_est[1], 2)]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "track_id": self.track_id,
            "class_id": self.class_id,
            "class_name": self.class_name,
            "label": self.label,
            "bbox": self.bbox,
            "centroid": self.centroid,
            "confidence": self.confidence,
            "dwell_time": round(self.dwell_time, 1),
            "history": self.history,
            "is_in_zone": self.is_in_zone,
            "velocity": self.velocity
        }

class ObjectTracker:
    def __init__(
        self,
        camera_id: str = "CAM-DEFAULT",
        conf_threshold: float = settings.CONFIDENCE_THRESHOLD,
        stride: int = 2
    ):
        self.camera_id = camera_id
        self.conf_threshold = conf_threshold
        self.stride = stride
        self.frame_idx = 0
        self.active_tracks: Dict[int, TrackedObject] = {}
        self.max_lost_seconds = 2.0
        self._last_frame_time = time.monotonic()

        # Dedicated per-camera ByteTracker instance (Correctness fix: no ID collision across cameras)
        tracker_args = SimpleNamespace(
            track_thresh=self.conf_threshold,
            match_thresh=0.8,
            track_buffer=30,
            frame_rate=30,
            mot20=False
        )
        self.byte_tracker = BYTETracker(tracker_args, frame_rate=30)

    def track(self, frame: np.ndarray, current_time: Optional[float] = None) -> List[TrackedObject]:
        if frame is None or frame.size == 0:
            return []

        now = current_time or time.monotonic()
        dt = max(0.001, now - self._last_frame_time)
        self._last_frame_time = now
        self.frame_idx += 1

        # Intermediate frame optimization: linearly extrapolate tracks during skipped frames
        if (self.frame_idx % self.stride) != 0:
            if self.active_tracks:
                h, w = frame.shape[:2]
                expired_ids = []
                for tid, obj in self.active_tracks.items():
                    if (now - obj.last_seen) > self.max_lost_seconds:
                        expired_ids.append(tid)
                    else:
                        obj.extrapolate(dt, max_w=w, max_h=h)

                for tid in expired_ids:
                    del self.active_tracks[tid]
                return list(self.active_tracks.values())
            return []

        # Request batch inference from the centralized worker
        detections = batch_engine.submit_and_wait(self.camera_id, frame)

        # Update per-camera ByteTracker
        if detections:
            # Format detections for ByteTrack: [x1, y1, x2, y2, score, class_id]
            dets_arr = np.array([
                [d["bbox"][0], d["bbox"][1], d["bbox"][2], d["bbox"][3], d["confidence"], d["class_id"]]
                for d in detections
            ], dtype=np.float32)

            class SimpleResults:
                def __init__(self, bboxes, confs, cls_ids):
                    self.xyxy = bboxes
                    self.conf = confs
                    self.cls = cls_ids

            bboxes_t = torch.from_numpy(dets_arr[:, :4])
            confs_t = torch.from_numpy(dets_arr[:, 4])
            cls_t = torch.from_numpy(dets_arr[:, 5])
            res_obj = SimpleResults(bboxes_t, confs_t, cls_t)

            try:
                tracks = self.byte_tracker.update(res_obj, img=frame)
            except Exception:
                tracks = []

            updated_ids = set()
            if len(tracks) > 0:
                for trk in tracks:
                    # trk format: [x1, y1, x2, y2, track_id, score, class_id, idx]
                    coords = [int(trk[0]), int(trk[1]), int(trk[2]), int(trk[3])]
                    track_id = int(trk[4])
                    conf = float(trk[5])
                    cls_id = int(trk[6])
                    class_name = TARGET_CLASSES.get(cls_id, "target")

                    updated_ids.add(track_id)
                    if track_id in self.active_tracks:
                        self.active_tracks[track_id].update(coords, round(conf, 3), current_time=now)
                    else:
                        self.active_tracks[track_id] = TrackedObject(
                            track_id=track_id,
                            class_id=cls_id,
                            class_name=class_name,
                            bbox=coords,
                            confidence=round(conf, 3),
                            current_time=now
                        )

            # Fallback for detections not assigned by ByteTracker yet
            for d in detections:
                cx = (d["bbox"][0] + d["bbox"][2]) >> 1
                cy = (d["bbox"][1] + d["bbox"][3]) >> 1
                # If no active track close to this centroid, add fallback
                matched = False
                for tid in updated_ids:
                    obj = self.active_tracks.get(tid)
                    if obj and abs(obj.centroid[0] - cx) < 30 and abs(obj.centroid[1] - cy) < 30:
                        matched = True
                        break
                if not matched:
                    fid = (hash((self.camera_id, cx >> 5, cy >> 5)) & 0x7FFFFFFF) % 10000
                    if fid not in self.active_tracks:
                        self.active_tracks[fid] = TrackedObject(
                            track_id=fid,
                            class_id=d["class_id"],
                            class_name=d["class_name"],
                            bbox=d["bbox"],
                            confidence=d["confidence"],
                            current_time=now
                        )

        # Cleanup stale tracks
        expired_ids = [
            tid for tid, obj in self.active_tracks.items()
            if (now - obj.last_seen) > self.max_lost_seconds
        ]
        for tid in expired_ids:
            del self.active_tracks[tid]

        return list(self.active_tracks.values())
