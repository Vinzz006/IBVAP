import time
from typing import List, Tuple, Optional
import cv2
import numpy as np
from backend.config import settings

class IntrusionDetector:
    def __init__(self, cooldown_seconds: float = settings.INTRUSION_COOLDOWN_SECONDS):
        self.cooldown_seconds = cooldown_seconds
        # Polygon cache to prevent redundant numpy allocations on every frame
        self._cached_poly: Optional[List[List[float]]] = None
        self._cached_w: int = 0
        self._cached_h: int = 0
        self._cached_pts: Optional[np.ndarray] = None

    @staticmethod
    def denormalize_polygon(polygon: List[List[float]], width: int, height: int) -> np.ndarray:
        """
        Converts normalized polygon points [[0.2, 0.3], [0.8, 0.3], ...] to pixel coordinates.
        """
        if not polygon:
            return np.array([], dtype=np.int32)

        pixel_pts = []
        for pt in polygon:
            x, y = pt[0], pt[1]
            if x <= 1.0 and y <= 1.0:
                pixel_pts.append([int(x * width), int(y * height)])
            else:
                pixel_pts.append([int(x), int(y)])
        return np.array(pixel_pts, dtype=np.int32)

    def get_cached_polygon(self, polygon: List[List[float]], width: int, height: int) -> np.ndarray:
        if (self._cached_pts is not None and 
            self._cached_poly == polygon and 
            self._cached_w == width and 
            self._cached_h == height):
            return self._cached_pts

        self._cached_pts = self.denormalize_polygon(polygon, width, height)
        self._cached_poly = polygon
        self._cached_w = width
        self._cached_h = height
        return self._cached_pts

    def is_inside_zone(self, centroid: List[int], polygon_pts: np.ndarray) -> bool:
        if len(polygon_pts) < 3:
            return False
        dist = cv2.pointPolygonTest(polygon_pts, (float(centroid[0]), float(centroid[1])), False)
        return dist >= 0

    def check_intrusion(
        self,
        tracked_obj,
        polygon: List[List[float]],
        frame_width: int,
        frame_height: int,
        current_time: Optional[float] = None
    ) -> Tuple[bool, str]:
        """
        Checks if a tracked object has caused a security breach.
        Returns: (event_triggered: bool, event_type: str)
        """
        if not polygon or len(polygon) < 3:
            return False, ""

        poly_pts = self.get_cached_polygon(polygon, frame_width, frame_height)
        inside = self.is_inside_zone(tracked_obj.centroid, poly_pts)
        now = current_time or time.monotonic()

        was_inside = tracked_obj.is_in_zone
        tracked_obj.was_in_zone = was_inside
        tracked_obj.is_in_zone = inside

        # Trigger 1: Perimeter Crossing (outside -> inside) with debounce
        if inside and not was_inside:
            if (now - tracked_obj.last_alert_time) > self.cooldown_seconds:
                tracked_obj.last_alert_time = now
                return True, "Restricted Zone Intrusion"

        # Trigger 2: Prolonged loitering inside restricted zone (> 10s)
        if inside and was_inside:
            if (now - tracked_obj.last_alert_time) > (self.cooldown_seconds * 3):
                tracked_obj.last_alert_time = now
                return True, "Restricted Zone Loitering"

        return False, ""
