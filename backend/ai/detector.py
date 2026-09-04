import logging
from typing import List, Dict, Any
import numpy as np
from ultralytics import YOLO
from backend.config import settings

logger = logging.getLogger(__name__)

# COCO Class mapping for relevant border surveillance targets
TARGET_CLASSES = {
    0: "person",
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck"
}

class ObjectDetector:
    def __init__(self, model_name: str = settings.YOLO_MODEL_NAME, conf_threshold: float = settings.CONFIDENCE_THRESHOLD):
        self.conf_threshold = conf_threshold
        try:
            logger.info(f"Loading YOLO model: {model_name}")
            self.model = YOLO(model_name)
            logger.info("YOLO model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load YOLO model {model_name}: {e}")
            raise e

    def detect(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Runs object detection on a single frame.
        Returns a list of detections: [{ 'bbox': [x1, y1, x2, y2], 'class_id': int, 'class_name': str, 'confidence': float }]
        """
        if frame is None or frame.size == 0:
            return []

        results = self.model(frame, conf=self.conf_threshold, verbose=False)
        detections = []

        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                if cls_id in TARGET_CLASSES:
                    coords = box.xyxy[0].cpu().numpy().tolist()  # [x1, y1, x2, y2]
                    conf = float(box.conf[0].item())
                    detections.append({
                        "bbox": [int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3])],
                        "class_id": cls_id,
                        "class_name": TARGET_CLASSES[cls_id],
                        "confidence": round(conf, 3)
                    })

        return detections
