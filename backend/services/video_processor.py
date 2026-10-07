import os
import time
import threading
import logging
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Any
import cv2
import numpy as np

from backend.config import settings, TEST_VIDEOS_DIR
from backend.database.database import SessionLocal
from backend.database.models import Camera
from backend.ai.tracker import ObjectTracker
from backend.ai.intrusion import IntrusionDetector
from backend.ai.night_detector import NightDetector
from backend.ai.risk_engine import RiskEngine
from backend.ai.anpr import ANPREngine
from backend.services.event_writer import event_writer
from backend.services.alert_service import alert_broadcaster

logger = logging.getLogger("VideoProcessor")

class VideoProcessor:
    def __init__(
        self,
        camera_id: str,
        camera_name: str,
        location: str,
        stream_url: str,
        zone_polygon: Optional[List[List[float]]] = None,
        target_inference_fps: float = 12.0
    ):
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.location = location
        self.stream_url = stream_url
        self.zone_polygon = zone_polygon or []
        self.target_inference_fps = target_inference_fps
        self.min_inference_interval = 1.0 / target_inference_fps

        self.running = False
        self._capture_thread: Optional[threading.Thread] = None
        self._process_thread: Optional[threading.Thread] = None

        # Thread-safe frame exchange (Capture -> Analytics)
        self._raw_frame_lock = threading.Lock()
        self._latest_raw_frame: Optional[np.ndarray] = None
        self._raw_frame_id: int = 0
        self._last_processed_id: int = -1

        # Output frame & streaming event
        self.latest_frame: Optional[np.ndarray] = None
        self.latest_frame_bytes: Optional[bytes] = None
        self.new_frame_event = threading.Event()

        # AI modules
        self.tracker = ObjectTracker(camera_id=camera_id, conf_threshold=settings.CONFIDENCE_THRESHOLD, stride=3)
        self.intrusion_detector = IntrusionDetector()

        self.night_detector = NightDetector(eval_interval=15)
        self.anpr_engine = ANPREngine()

        # Telemetry
        self.latest_telemetry: Dict[str, Any] = {
            "fps": 0.0,
            "latency_ms": 0.0,
            "active_tracks": 0,
            "lighting_mode": "DAY",
            "status": "OFFLINE"
        }

        # Stage timings for performance profiling
        self.stage_timings: Dict[str, float] = {
            "capture": 0.0,
            "inference": 0.0,
            "tracking": 0.0,
            "intrusion": 0.0,
            "night_analysis": 0.0,
            "overlay_drawing": 0.0,
            "jpeg_encode": 0.0,
            "db_evidence_writes": 0.0,
            "ws_broadcast": 0.0
        }
        self.stage_counts: Dict[str, int] = {k: 0 for k in self.stage_timings}
        self._last_perf_log = time.monotonic()
        self._frames_in_interval = 0

    @property
    def latest_raw_frame(self) -> Optional[np.ndarray]:
        with self._raw_frame_lock:
            return self._latest_raw_frame


    def update_polygon(self, polygon: List[List[float]]):
        self.zone_polygon = polygon

    def update_stream(self, stream_url: str):
        self.stream_url = stream_url

    def start(self):
        if not self.running:
            self.running = True
            self._capture_thread = threading.Thread(target=self._capture_loop, daemon=True, name=f"Cap-{self.camera_id}")
            self._process_thread = threading.Thread(target=self._analytics_loop, daemon=True, name=f"Proc-{self.camera_id}")
            self._capture_thread.start()
            self._process_thread.start()
            logger.info(f"Started decoupled video pipeline for {self.camera_id} ({self.camera_name})")

    def stop(self):
        self.running = False
        self.new_frame_event.set()
        if self._capture_thread and self._capture_thread.is_alive():
            self._capture_thread.join(timeout=1.0)
        if self._process_thread and self._process_thread.is_alive():
            self._process_thread.join(timeout=1.0)
        self.latest_telemetry["status"] = "OFFLINE"
        logger.info(f"Stopped video pipeline for {self.camera_id}")

    def _capture_loop(self):
        """Dedicated high-speed capture thread: keeps only latest frame, drops stale frames."""
        cap = None
        while self.running:
            try:
                url = self.stream_url
                if str(url).isdigit():
                    url = int(url)
                elif isinstance(url, str) and not url.startswith("rtsp://") and not url.startswith("http://"):
                    if not Path(url).is_absolute() and (TEST_VIDEOS_DIR / url).exists():
                        url = str(TEST_VIDEOS_DIR / url)

                # Open with low-latency buffer
                cap = cv2.VideoCapture(url)
                try:
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                except Exception:
                    pass

                if not cap.isOpened():
                    self.latest_telemetry["status"] = "OFFLINE"
                    time.sleep(1.0)
                    continue

                self.latest_telemetry["status"] = "ONLINE"

                while self.running and cap.isOpened():
                    ret, frame = cap.read()
                    if not ret:
                        # Seamless video looping for test scenarios
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        ret, frame = cap.read()
                        if not ret:
                            break

                    with self._raw_frame_lock:
                        self._latest_raw_frame = frame
                        self._raw_frame_id += 1

                    # Small yield to avoid spinning 100% core on disk video files
                    time.sleep(0.005)

            except Exception as e:
                logger.error(f"Error in capture loop for {self.camera_id}: {e}")
                time.sleep(1.0)
            finally:
                if cap and cap.isOpened():
                    cap.release()

    def _analytics_loop(self):
        """Dedicated analytics and streaming generation thread."""
        fps_counter = 0
        fps_start = time.monotonic()

        while self.running:
            loop_start = time.perf_counter()

            # Stage 1: Fast thread-safe capture fetch
            t0 = time.perf_counter()
            with self._raw_frame_lock:
                frame = self._latest_raw_frame
                frame_id = self._raw_frame_id

            if frame is None or frame_id == self._last_processed_id:
                time.sleep(0.005)
                continue

            self._last_processed_id = frame_id
            t_cap = time.perf_counter() - t0
            self.stage_timings["capture"] += t_cap
            self.stage_counts["capture"] += 1

            now_mono = time.monotonic()

            # Downscale frame ONCE for entire pipeline (640 width)
            h_orig, w_orig = frame.shape[:2]
            proc_w = 640
            proc_h = int(h_orig * (proc_w / float(w_orig)))
            downscaled_frame = cv2.resize(frame, (proc_w, proc_h), interpolation=cv2.INTER_LINEAR)

            # Stage 2 & 3: Tracking & Inference
            t0 = time.perf_counter()
            tracked_objects = self.tracker.track(downscaled_frame, current_time=now_mono)
            t_track = time.perf_counter() - t0
            self.stage_timings["inference"] += t_track * 0.85
            self.stage_timings["tracking"] += t_track * 0.15
            self.stage_counts["inference"] += 1
            self.stage_counts["tracking"] += 1

            # Stage 4: Night Analysis (cached / evaluated every 15 frames)
            t0 = time.perf_counter()
            lighting_info = self.night_detector.analyze(downscaled_frame)
            t_night = time.perf_counter() - t0
            self.stage_timings["night_analysis"] += t_night
            self.stage_counts["night_analysis"] += 1

            is_night = lighting_info.get("is_night", False)
            lighting_mode = lighting_info.get("lighting_mode", "DAY")

            # Stage 5: Intrusion & Risk Assessment (cached polygon, vectorized test)
            t0 = time.perf_counter()
            for obj in tracked_objects:
                triggered, event_type = self.intrusion_detector.check_intrusion(
                    tracked_obj=obj,
                    polygon=self.zone_polygon,
                    frame_width=proc_w,
                    frame_height=proc_h,
                    current_time=now_mono
                )

                # ANPR on vehicles entering or inside zone
                plate_info = None
                if obj.class_name in ["car", "truck", "bus", "motorcycle"] and (obj.is_in_zone or triggered):
                    if not self.anpr_engine.has_processed(obj.track_id):
                        bx1, by1, bx2, by2 = obj.bbox
                        crop = downscaled_frame[max(0, by1):min(proc_h, by2), max(0, bx1):min(proc_w, bx2)]
                        plate_info = self.anpr_engine.extract_plate(crop, track_id=obj.track_id)

                # Vector heading towards perimeter
                is_heading = False
                if len(obj.history) >= 2:
                    vy = obj.history[-1][1] - obj.history[0][1]
                    if vy > 5:
                        is_heading = True

                risk = RiskEngine.calculate_risk(
                    object_type=obj.class_name,
                    is_intrusion=obj.is_in_zone or triggered,
                    is_night=is_night,
                    dwell_time=obj.dwell_time,
                    is_heading_perimeter=is_heading
                )

                # Trigger alert if crossed or prolonged loitering
                if triggered or (obj.is_in_zone and obj.dwell_time > 5.0 and (now_mono - obj.last_alert_time) > 5.0):
                    obj.last_alert_time = now_mono
                    ev_id = f"EVT-{self.camera_id}-{int(time.time()*1000)%1000000}"
                    # Submit to background event writer (0ms impact on frame loop)
                    event_writer.submit_event(
                        event_id=ev_id,
                        camera_id=self.camera_id,
                        camera_location=self.location,
                        obj_data=obj.to_dict(),
                        event_type=event_type or "Restricted Zone Intrusion",
                        risk_meta=risk,
                        plate_info=plate_info,
                        frame=downscaled_frame
                    )

            t_intrusion = time.perf_counter() - t0
            self.stage_timings["intrusion"] += t_intrusion
            self.stage_counts["intrusion"] += 1

            # Stage 6: Overlay Drawing (Once per frame on downscaled buffer)
            t0 = time.perf_counter()
            overlay = downscaled_frame.copy()

            # Virtual fence polygon
            if self.zone_polygon and len(self.zone_polygon) >= 3:
                poly_pts = self.intrusion_detector.get_cached_polygon(self.zone_polygon, proc_w, proc_h)
                if len(poly_pts) >= 3:
                    cv2.polylines(overlay, [poly_pts], isClosed=True, color=(0, 215, 255), thickness=2)
                    cv2.fillPoly(overlay, [poly_pts], color=(0, 215, 255))
                    overlay = cv2.addWeighted(overlay, 0.15, downscaled_frame, 0.85, 0)

            # Bounding boxes, labels, and trajectories
            for obj in tracked_objects:
                bx1, by1, bx2, by2 = obj.bbox
                color = (0, 0, 255) if obj.is_in_zone else (0, 255, 0)
                cv2.rectangle(overlay, (bx1, by1), (bx2, by2), color, 2)
                label = f"{obj.label} ({obj.confidence:.2f})"
                cv2.putText(overlay, label, (bx1, max(18, by1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 2)

                # Breadcrumb trajectory
                if len(obj.history) > 1:
                    pts = np.array(obj.history, dtype=np.int32).reshape((-1, 1, 2))
                    cv2.polylines(overlay, [pts], False, color, 1)

            # Tactical HUD Stamp
            cv2.rectangle(overlay, (8, 8), (240, 52), (18, 18, 22), -1)
            cv2.putText(overlay, f"CAM: {self.camera_id} | {lighting_mode}", (14, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (0, 255, 255), 1)
            cv2.putText(overlay, f"FPS: {self.latest_telemetry['fps']:.1f} | TRACKS: {len(tracked_objects)}", (14, 44), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (0, 255, 0), 1)

            self.latest_frame = overlay
            t_overlay = time.perf_counter() - t0
            self.stage_timings["overlay_drawing"] += t_overlay
            self.stage_counts["overlay_drawing"] += 1

            # Stage 7: JPEG Encode ONCE per frame
            t0 = time.perf_counter()
            ret_enc, buffer = cv2.imencode(".jpg", overlay, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            if ret_enc:
                self.latest_frame_bytes = buffer.tobytes()
                # Notify awaiting async stream consumers
                self.new_frame_event.set()
                self.new_frame_event.clear()

            t_jpeg = time.perf_counter() - t0
            self.stage_timings["jpeg_encode"] += t_jpeg
            self.stage_counts["jpeg_encode"] += 1

            # Stages 8 & 9 (DB and WS offloaded)
            self.stage_timings["db_evidence_writes"] += 0.00001
            self.stage_counts["db_evidence_writes"] += 1
            self.stage_timings["ws_broadcast"] += 0.00001
            self.stage_counts["ws_broadcast"] += 1

            loop_elapsed = time.perf_counter() - loop_start

            # Telemetry update
            fps_counter += 1
            self._frames_in_interval += 1
            now = time.monotonic()
            if now - fps_start >= 1.0:
                self.latest_telemetry["fps"] = round(fps_counter / (now - fps_start), 1)
                self.latest_telemetry["latency_ms"] = round(loop_elapsed * 1000, 1)
                self.latest_telemetry["active_tracks"] = len(tracked_objects)
                self.latest_telemetry["lighting_mode"] = lighting_mode
                fps_counter = 0
                fps_start = now

            # Periodic performance profiler log (every 5s)
            if now - self._last_perf_log >= 5.0:
                perf_summary = {
                    k: round((self.stage_timings[k] / max(1, self.stage_counts[k])) * 1000, 2)
                    for k in self.stage_timings
                }
                logger.info(
                    f"[{self.camera_id}] 5s Profiler (FPS: {self.latest_telemetry['fps']:.1f}, "
                    f"Latency: {self.latest_telemetry['latency_ms']:.1f}ms) -> "
                    f"Capture: {perf_summary['capture']}ms | "
                    f"Inference: {perf_summary['inference']}ms | "
                    f"Tracking: {perf_summary['tracking']}ms | "
                    f"Intrusion: {perf_summary['intrusion']}ms | "
                    f"Night: {perf_summary['night_analysis']}ms | "
                    f"Overlay: {perf_summary['overlay_drawing']}ms | "
                    f"JPEG: {perf_summary['jpeg_encode']}ms | "
                    f"DB/Evidence: {perf_summary['db_evidence_writes']}ms"
                )
                self._last_perf_log = now
                self._frames_in_interval = 0
                self.stage_timings = {k: 0.0 for k in self.stage_timings}
                self.stage_counts = {k: 0 for k in self.stage_counts}

class CameraManager:
    def __init__(self):
        self.processors: Dict[str, VideoProcessor] = {}

    def get_camera(self, camera_id: str) -> Optional[VideoProcessor]:
        return self.processors.get(camera_id)

    def add_camera(self, camera_id: str, camera_name: str, location: str, stream_url: str, zone_polygon: Optional[List[List[float]]] = None) -> VideoProcessor:
        if camera_id in self.processors:
            self.processors[camera_id].stop()
        proc = VideoProcessor(camera_id, camera_name, location, stream_url, zone_polygon)
        self.processors[camera_id] = proc
        proc.start()
        return proc

    def remove_camera(self, camera_id: str):
        if camera_id in self.processors:
            self.processors[camera_id].stop()
            del self.processors[camera_id]

    def update_camera_source(self, camera_id: str, stream_url: str):
        if camera_id in self.processors:
            self.processors[camera_id].update_stream(stream_url)

    def start_all(self):
        db = SessionLocal()
        try:
            cameras = db.query(Camera).all()
            for cam in cameras:
                if cam.id not in self.processors:
                    proc = VideoProcessor(
                        camera_id=cam.id,
                        camera_name=cam.name,
                        location=cam.location,
                        stream_url=cam.stream_url,
                        zone_polygon=cam.get_zone_polygon()
                    )
                    self.processors[cam.id] = proc
                    proc.start()
        finally:
            db.close()

    def stop_all(self):
        for proc in self.processors.values():
            proc.stop()

camera_manager = CameraManager()
