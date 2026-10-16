import unicodedata
from typing import Tuple, Optional
import cv2
import numpy as np

# Map common unicode punctuation / symbols to clean ASCII equivalents
GLYPH_MAP = {
    "\u2014": "-",   # em dash —
    "\u2013": "-",   # en dash –
    "\u2012": "-",   # figure dash
    "\u2015": "-",   # horizontal bar
    "\u2022": "|",   # bullet •
    "\u2023": ">",   # triangular bullet
    "\u25b6": ">",   # black right-pointing triangle ▶
    "\u25c0": "<",   # black left-pointing triangle
    "\u2713": "OK",  # check mark ✓
    "\u2714": "OK",  # heavy check mark ✔
    "\u2717": "X",   # cross mark ✗
    "\u2718": "X",   # heavy cross mark ✘
    "\u201c": '"',   # left double quote “
    "\u201d": '"',   # right double quote ”
    "\u2018": "'",   # left single quote ‘
    "\u2019": "'",   # right single quote ’
    "\u2026": "...", # horizontal ellipsis …
    "\u00a0": " ",   # non-breaking space
    "\u00b0": " deg",# degree symbol °
    "\u00d7": "x",   # multiplication sign ×
    "\u2265": ">=",  # greater than or equal
    "\u2264": "<=",  # less than or equal
}

def to_overlay_text(text: Optional[str]) -> str:
    """
    Normalizes any unicode string to clean, printable ASCII for OpenCV text rendering.
    Prevents OpenCV FONT_HERSHEY_SIMPLEX glyph corruption ('?', '???').
    """
    if text is None:
        return ""
    
    if not isinstance(text, str):
        text = str(text)

    # 1. Apply explicit mappings for common domain characters
    for src, dst in GLYPH_MAP.items():
        if src in text:
            text = text.replace(src, dst)

    # 2. Decompose remaining unicode characters (e.g., accented characters)
    normalized = unicodedata.normalize("NFKD", text)

    # 3. Filter to ASCII printable characters (range 32 - 126) + newline
    ascii_chars = []
    for ch in normalized:
        code = ord(ch)
        if 32 <= code <= 126:
            ascii_chars.append(ch)
        elif code == 10:  # preserve newline
            ascii_chars.append(ch)
        elif code < 32:
            ascii_chars.append(" ")
        else:
            # Fallback for unmapped high-unicode characters
            ascii_chars.append(" ")

    result = "".join(ascii_chars)
    # Collapse multiple consecutive spaces
    while "  " in result:
        result = result.replace("  ", " ")
    return result.strip()

def put_overlay_text(
    img: np.ndarray,
    text: str,
    org: Tuple[int, int],
    font_face: int = cv2.FONT_HERSHEY_SIMPLEX,
    font_scale: float = 0.40,
    color: Tuple[int, int, int] = (255, 255, 255),
    thickness: int = 1,
    line_type: int = cv2.LINE_AA,
    bg_color: Optional[Tuple[int, int, int]] = None,
    padding: int = 3
) -> Tuple[int, int]:
    """
    Puts text on an image using safe ASCII normalization and optional background pill
    to avoid collisions and overlapping visual noise.
    
    Returns the bounding size (width, height) of the rendered text block.
    """
    clean_text = to_overlay_text(text)

    # Guard: ensure no non-ASCII character ever reaches OpenCV putText
    for ch in clean_text:
        if ord(ch) > 127:
            raise ValueError(f"Non-ASCII character {ch!r} reached put_overlay_text after normalization")

    (tw, th), baseline = cv2.getTextSize(clean_text, font_face, font_scale, thickness)
    x, y = org

    # Draw anchored background if requested
    if bg_color is not None:
        x1 = max(0, x - padding)
        y1 = max(0, y - th - padding)
        x2 = min(img.shape[1], x + tw + padding)
        y2 = min(img.shape[0], y + baseline + padding)
        cv2.rectangle(img, (x1, y1), (x2, y2), bg_color, -1)

    cv2.putText(
        img,
        clean_text,
        (x, y),
        font_face,
        font_scale,
        color,
        thickness,
        line_type
    )

    return (tw, th)
