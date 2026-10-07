from typing import Dict, Any, Optional
import cv2
import numpy as np

class NightDetector:
    """
    Ultra-lightweight ambient lighting & day/night classifier.
    Analyzes a 64x64 downscaled grayscale thumbnail every N frames with exponential moving average smoothing.
    """
    def __init__(
        self,
        night_threshold: float = 65.0,
        twilight_threshold: float = 95.0,
        eval_interval: int = 15
    ):
        self.night_threshold = night_threshold
        self.twilight_threshold = twilight_threshold
        self.eval_interval = eval_interval
        self.frame_idx = 0
        self._smoothed_brightness = 128.0
        self._cached_result: Dict[str, Any] = {
            "is_night": False,
            "lighting_mode": "DAY",
            "brightness": 128.0
        }

    def analyze(self, frame: np.ndarray) -> Dict[str, Any]:
        if frame is None or frame.size == 0:
            return self._cached_result

        self.frame_idx += 1
        if (self.frame_idx % self.eval_interval) != 0 and self.frame_idx > 1:
            return self._cached_result

        # Convert to small 64x64 grayscale
        if len(frame.shape) == 3:
            small_gray = cv2.resize(
                cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY),
                (64, 64),
                interpolation=cv2.INTER_NEAREST
            )
        else:
            small_gray = cv2.resize(frame, (64, 64), interpolation=cv2.INTER_NEAREST)

        current_b = float(np.mean(small_gray))
        self._smoothed_brightness = 0.7 * self._smoothed_brightness + 0.3 * current_b

        if self._smoothed_brightness < self.night_threshold:
            lighting_mode = "NIGHT"
            is_night = True
        elif self._smoothed_brightness < self.twilight_threshold:
            lighting_mode = "TWILIGHT"
            is_night = True
        else:
            lighting_mode = "DAY"
            is_night = False

        self._cached_result = {
            "is_night": is_night,
            "lighting_mode": lighting_mode,
            "brightness": round(self._smoothed_brightness, 1)
        }
        return self._cached_result
