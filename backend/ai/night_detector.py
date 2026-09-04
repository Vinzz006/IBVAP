from typing import Dict, Any
import cv2
import numpy as np

class NightDetector:
    """
    Lightweight ambient lighting & day/night classifier based on frame luminance analysis.
    """
    def __init__(self, night_threshold: float = 65.0, twilight_threshold: float = 95.0):
        self.night_threshold = night_threshold
        self.twilight_threshold = twilight_threshold

    def analyze(self, frame: np.ndarray) -> Dict[str, Any]:
        if frame is None or frame.size == 0:
            return {"is_night": False, "lighting_mode": "DAY", "brightness": 128.0}

        # Convert to grayscale to measure overall luminance
        if len(frame.shape) == 3:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        else:
            gray = frame

        # Compute average luminance
        brightness = float(np.mean(gray))

        if brightness < self.night_threshold:
            lighting_mode = "NIGHT"
            is_night = True
        elif brightness < self.twilight_threshold:
            lighting_mode = "TWILIGHT"
            is_night = True
        else:
            lighting_mode = "DAY"
            is_night = False

        return {
            "is_night": is_night,
            "lighting_mode": lighting_mode,
            "brightness": round(brightness, 1)
        }
