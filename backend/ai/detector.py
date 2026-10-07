import logging
from typing import List, Dict, Any
import numpy as np
from backend.ai.batch_inference import batch_engine, TARGET_CLASSES

logger = logging.getLogger(__name__)

class ObjectDetector:
    """
    Lightweight adapter wrapping centralized BatchInferenceEngine to avoid duplicate YOLO model memory allocations.
    """
    def __init__(self, model_name: str = None, conf_threshold: float = None):
        self.engine = batch_engine

    def detect(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        if frame is None or frame.size == 0:
            return []
        return self.engine.submit_and_wait("DETECTOR-ADAPTER", frame)
