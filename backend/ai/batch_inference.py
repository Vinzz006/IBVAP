import os
import time
import queue
import threading
import logging
from pathlib import Path
from types import SimpleNamespace
from typing import List, Dict, Tuple, Optional, Any
import numpy as np
import torch
from ultralytics import YOLO

from backend.config import settings, MODELS_DIR

logger = logging.getLogger("BatchInferenceEngine")

TARGET_CLASSES = {
    0: "person",
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck"
}

class InferenceTask:
    __slots__ = ("camera_id", "frame", "event", "results", "submit_time")
    def __init__(self, camera_id: str, frame: np.ndarray):
        self.camera_id = camera_id
        self.frame = frame
        self.event = threading.Event()
        self.results: List[Dict[str, Any]] = []
        self.submit_time = time.monotonic()

class BatchInferenceEngine:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(BatchInferenceEngine, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_name: str = settings.YOLO_MODEL_NAME):
        if self._initialized:
            return
        self._initialized = True

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model_path = model_name if Path(model_name).exists() else str(MODELS_DIR / "yolov8n.pt") if (MODELS_DIR / "yolov8n.pt").exists() else "yolov8n.pt"
        logger.info(f"Initializing YOLO engine ({self.device}) from {self.model_path}")
        self.model = YOLO(self.model_path)
        if self.device == "cuda":
            try:
                self.model.to("cuda")
            except Exception as e:
                logger.warning(f"CUDA initialization failed: {e}")


        # Warmup model
        self._warmup()

        # Batch queue & worker thread
        self.queue: queue.Queue[InferenceTask] = queue.Queue(maxsize=128)
        self.running = True
        self.batch_size = 4
        self.max_wait_seconds = 0.002  # 2ms micro-batch collection
        self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True, name="YOLOBatchWorker")
        self.worker_thread.start()
        logger.info("YOLO batch inference worker thread started.")

    def _warmup(self):
        try:
            dummy = np.zeros((settings.YOLO_IMGSZ, settings.YOLO_IMGSZ, 3), dtype=np.uint8)
            _ = self.model.predict(
                [dummy],
                imgsz=settings.YOLO_IMGSZ,
                classes=settings.YOLO_CLASSES,
                conf=settings.CONFIDENCE_THRESHOLD,
                verbose=False
            )
            logger.info("YOLO model warmup complete.")
        except Exception as e:
            logger.warning(f"Model warmup warning: {e}")

    def predict_batch(self, tasks: List[InferenceTask]):
        if not tasks:
            return

        frames = [t.frame for t in tasks]
        try:
            batch_results = self.model.predict(
                frames,
                imgsz=settings.YOLO_IMGSZ,
                classes=settings.YOLO_CLASSES,
                conf=settings.CONFIDENCE_THRESHOLD,
                verbose=False,
                half=(self.device == "cuda")
            )

            for task, r in zip(tasks, batch_results):
                detections = []
                boxes = r.boxes
                if boxes is not None and len(boxes) > 0:
                    xyxy_arr = boxes.xyxy.cpu().numpy()
                    conf_arr = boxes.conf.cpu().numpy()
                    cls_arr = boxes.cls.cpu().numpy().astype(int)

                    for i in range(len(xyxy_arr)):
                        cls_id = int(cls_arr[i])
                        if cls_id in TARGET_CLASSES:
                            coords = xyxy_arr[i]
                            detections.append({
                                "bbox": [int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3])],
                                "confidence": float(conf_arr[i]),
                                "class_id": cls_id,
                                "class_name": TARGET_CLASSES[cls_id]
                            })
                task.results = detections
                task.event.set()

        except Exception as e:
            logger.error(f"Error during batch inference: {e}", exc_info=True)
            for task in tasks:
                task.results = []
                task.event.set()

    def _worker_loop(self):
        while self.running:
            tasks: List[InferenceTask] = []
            try:
                first_task = self.queue.get(timeout=0.05)
                tasks.append(first_task)
            except queue.Empty:
                continue

            start_collect = time.monotonic()
            while len(tasks) < self.batch_size:
                timeout = max(0.0, self.max_wait_seconds - (time.monotonic() - start_collect))
                if timeout <= 0.0:
                    break
                try:
                    next_task = self.queue.get(timeout=timeout)
                    tasks.append(next_task)
                except queue.Empty:
                    break

            self.predict_batch(tasks)

    def submit_and_wait(self, camera_id: str, frame: np.ndarray, timeout: float = 0.5) -> List[Dict[str, Any]]:
        task = InferenceTask(camera_id, frame)
        try:
            self.queue.put_nowait(task)
        except queue.Full:
            return []

        if task.event.wait(timeout=timeout):
            return task.results
        else:
            return []

batch_engine = BatchInferenceEngine()
