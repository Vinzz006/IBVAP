import pytest
import numpy as np
from backend.utils.text import to_overlay_text, put_overlay_text

def test_to_overlay_text_ascii_normalization():
    # Em-dash
    assert to_overlay_text("Sector A — Frontier Road") == "Sector A - Frontier Road"
    # Bullet
    assert to_overlay_text("PRIVACY PROTECTED VIEW • FACIAL REGIONS") == "PRIVACY PROTECTED VIEW | FACIAL REGIONS"
    # Curly quotes
    assert to_overlay_text('Target “Alpha” in ‘Sector B’') == "Target \"Alpha\" in 'Sector B'"
    # Degree symbol and accents
    assert "deg" in to_overlay_text("Elevation 45°")
    # Clean ASCII remains unchanged
    assert to_overlay_text("CAM-01 | FPS: 15.0") == "CAM-01 | FPS: 15.0"

def test_put_overlay_text_renders_on_image():
    img = np.zeros((200, 400, 3), dtype=np.uint8)
    tw, th = put_overlay_text(img, "Sector A — Frontier Road • Armed", (10, 50), bg_color=(20, 20, 20))
    assert tw > 0
    assert th > 0
    # Image should have drawn pixels
    assert np.any(img > 0)

def test_put_overlay_text_fails_on_non_ascii_leak(monkeypatch):
    """Fails if any non-ASCII character bypasses normalization and reaches put_overlay_text."""
    img = np.zeros((100, 200, 3), dtype=np.uint8)
    # Monkeypatch to_overlay_text to simulate a broken normalizer
    monkeypatch.setattr("backend.utils.text.to_overlay_text", lambda s: "Bad Unicode: \u2014")
    with pytest.raises(ValueError, match="Non-ASCII character"):
        put_overlay_text(img, "Test", (10, 30))
