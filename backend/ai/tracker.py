import time
import threading
from typing import Dict, List, Any, Optional
import numpy as np
from ultralytics import YOLO
from backend.config import settings

TARGET_CLASSES = {
    0: "person",
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck"
}

class TrackedObject:
    def __init__(self, track_id: int, class_id: int, class_name: str, bbox: List[int], confidence: float):
        self.track_id = track_id
        self.class_id = class_id
        self.class_name = class_name
        self.bbox = bbox  # [x1, y1, x2, y2]
        self.confidence = confidence
        self.first_seen = time.time()
        self.last_seen = time.time()
        self.history: List[List[int]] = []  # [[cx, cy], ...]
        self.was_in_zone = False
        self.is_in_zone = False
        self.last_alert_time = 0.0
        self.update_centroid()

    def update_centroid(self):
        cx = int((self.bbox[0] + self.bbox[2]) / 2)
        cy = int((self.bbox[1] + self.bbox[3]) / 2)
        self.centroid = [cx, cy]
        self.history.append([cx, cy])
        if len(self.history) > 30:
            self.history.pop(0)

    def update(self, bbox: List[int], confidence: float):
        self.bbox = bbox
        self.confidence = confidence
        self.last_seen = time.time()
        self.update_centroid()

    @property
    def dwell_time(self) -> float:
        return self.last_seen - self.first_seen

    @property
    def velocity(self) -> List[float]:
        if len(self.history) < 3:
            return [0.0, 0.0]
        # Calculate velocity over recent points
        dx = self.history[-1][0] - self.history[0][0]
        dy = self.history[-1][1] - self.history[0][1]
        dt = max(0.1, self.dwell_time)
        return [round(dx / dt, 2), round(dy / dt, 2)]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "track_id": self.track_id,
            "class_id": self.class_id,
            "class_name": self.class_name,
            "label": f"{self.class_name.upper()} #{self.track_id}",
            "bbox": self.bbox,
            "centroid": self.centroid,
            "confidence": self.confidence,
            "dwell_time": round(self.dwell_time, 1),
            "history": self.history,
            "is_in_zone": self.is_in_zone,
            "velocity": self.velocity
        }

class ObjectTracker:
    _shared_model = None
    _shared_lock = threading.Lock()

    @classmethod
    def get_shared_model(cls, model_name: str = settings.YOLO_MODEL_NAME):
        if cls._shared_model is None:
            with cls._shared_lock:
                if cls._shared_model is None:
                    cls._shared_model = YOLO(model_name)
        return cls._shared_model

    def __init__(self, model_name: str = settings.YOLO_MODEL_NAME, conf_threshold: float = settings.CONFIDENCE_THRESHOLD, stride: int = 3):
        self.model = self.get_shared_model(model_name)
        self.conf_threshold = conf_threshold
        self.stride = stride
        self.frame_idx = 0
        self.active_tracks: Dict[int, TrackedObject] = {}
        self.max_lost_seconds = 2.0

    def track(self, frame: np.ndarray) -> List[TrackedObject]:
        """
        Runs tracking on a frame using YOLO's built-in ByteTrack integration.
        Uses inference stride and optimized imgsz=384 for smooth real-time CPU performance.
        """
        if frame is None or frame.size == 0:
            return []

        self.frame_idx += 1
        current_time = time.time()

        # Intermediate frame optimization: skip deep inference and interpolate/persist current tracks
        if (self.frame_idx % self.stride) != 0:
            if self.active_tracks:
                # Cleanup stale tracks
                expired_ids = [
                    tid for tid, obj in self.active_tracks.items()
                    if (current_time - obj.last_seen) > self.max_lost_seconds
                ]
                for tid in expired_ids:
                    del self.active_tracks[tid]
                return list(self.active_tracks.values())
            return []

        # Synchronize access to shared neural network to prevent CPU core contention
        with self._shared_lock:
            results = self.model.track(
                frame,
                imgsz=384,
                conf=self.conf_threshold,
                persist=True,
                tracker="bytetrack.yaml",
                verbose=False
            )

        updated_ids = set()

        for r in results:
            boxes = r.boxes
            if boxes is None or len(boxes) == 0:
                continue

            for box in boxes:
                cls_id = int(box.cls[0].item())
                if cls_id not in TARGET_CLASSES:
                    continue

                coords = box.xyxy[0].cpu().numpy().tolist()
                bbox = [int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3])]
                conf = float(box.conf[0].item())

                # If tracker ID is assigned
                if box.id is not None:
                    track_id = int(box.id[0].item())
                else:
                    # Fallback ID based on position if tracker warmup
                    cx = int((bbox[0] + bbox[2]) / 2)
                    cy = int((bbox[1] + bbox[3]) / 2)
                    track_id = hash((cx // 30, cy // 30)) % 10000

                updated_ids.add(track_id)

                if track_id in self.active_tracks:
                    self.active_tracks[track_id].update(bbox, round(conf, 3))
                else:
                    self.active_tracks[track_id] = TrackedObject(
                        track_id=track_id,
                        class_id=cls_id,
                        class_name=TARGET_CLASSES[cls_id],
                        bbox=bbox,
                        confidence=round(conf, 3)
                    )

        # Cleanup stale tracks
        expired_ids = [
            tid for tid, obj in self.active_tracks.items()
            if (current_time - obj.last_seen) > self.max_lost_seconds
        ]
        for tid in expired_ids:
            del self.active_tracks[tid]

        return list(self.active_tracks.values())
