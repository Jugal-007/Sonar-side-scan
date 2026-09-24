"""MarineGuard AI — Acoustic Shadow Analysis (Prototype).

Heuristic analysis of acoustic shadows behind detected objects.
In real sonar imagery, man-made objects on the seabed cast acoustic shadows
on the far side from the sonar source. This module provides a prototype
shadow detection score.

DISCLAIMER: This is a heuristic approximation. Accurate shadow analysis
requires knowledge of sonar geometry, beam pattern, and slant range.
"""

import cv2
import numpy as np
from typing import Dict, Optional, Tuple


class ShadowAnalyzer:
    """Prototype acoustic shadow analysis for sonar imagery."""

    def __init__(self, sonar_direction: str = "top"):
        """
        Args:
            sonar_direction: Assumed direction the sonar is pointing FROM.
                'top' means sonar is at the top of the image, shadows appear below objects.
                'left', 'right', 'bottom' also supported.
        """
        self.sonar_direction = sonar_direction

    def analyze(self, image: np.ndarray, bbox: Dict[str, int]) -> dict:
        """Analyze the shadow region behind a detected object.

        Args:
            image: The sonar image (BGR or grayscale).
            bbox: Detection bounding box {x, y, width, height} in pixels.

        Returns:
            dict with shadow_score (0-1), shadow_region, and analysis details.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        h, w = gray.shape[:2]

        x, y, bw, bh = bbox["x"], bbox["y"], bbox["width"], bbox["height"]

        # Determine shadow region based on sonar direction
        shadow_region = self._get_shadow_region(x, y, bw, bh, w, h)
        if shadow_region is None:
            return {
                "shadow_score": 0.0,
                "shadow_detected": False,
                "shadow_region": None,
                "analysis": "Shadow region outside image bounds",
            }

        sx, sy, sw, sh = shadow_region

        # Extract object and shadow ROIs
        object_roi = gray[y : y + bh, x : x + bw]
        shadow_roi = gray[sy : sy + sh, sx : sx + sw]

        if object_roi.size == 0 or shadow_roi.size == 0:
            return {
                "shadow_score": 0.0,
                "shadow_detected": False,
                "shadow_region": shadow_region,
                "analysis": "ROI too small for analysis",
            }

        # Compute shadow score based on intensity difference
        obj_mean = float(np.mean(object_roi))
        shadow_mean = float(np.mean(shadow_roi))

        # Background intensity (region away from both object and shadow)
        bg_region = self._get_background_region(x, y, bw, bh, w, h)
        if bg_region:
            bx, by, bbw, bbh = bg_region
            bg_roi = gray[by : by + bbh, bx : bx + bbw]
            bg_mean = float(np.mean(bg_roi)) if bg_roi.size > 0 else 128.0
        else:
            bg_mean = float(np.mean(gray))

        # Shadow should be darker than both the object and background
        intensity_drop = max(0, bg_mean - shadow_mean) / max(bg_mean, 1.0)
        contrast_ratio = max(0, obj_mean - shadow_mean) / max(obj_mean, 1.0)

        # Shadow texture should be more uniform (lower std dev)
        shadow_std = float(np.std(shadow_roi))
        bg_std = float(np.std(gray))
        uniformity = max(0, 1.0 - shadow_std / max(bg_std, 1.0))

        # Composite shadow score
        shadow_score = float(np.clip(
            intensity_drop * 0.5 + contrast_ratio * 0.3 + uniformity * 0.2,
            0.0,
            1.0,
        ))

        return {
            "shadow_score": round(shadow_score, 4),
            "shadow_detected": shadow_score > 0.3,
            "shadow_region": {"x": sx, "y": sy, "width": sw, "height": sh},
            "object_intensity": round(obj_mean, 2),
            "shadow_intensity": round(shadow_mean, 2),
            "background_intensity": round(bg_mean, 2),
            "intensity_drop": round(intensity_drop, 4),
            "contrast_ratio": round(contrast_ratio, 4),
            "uniformity": round(uniformity, 4),
            "analysis": (
                f"Shadow score {shadow_score:.2f} — "
                f"{'Shadow detected' if shadow_score > 0.3 else 'No clear shadow'}"
            ),
        }

    def _get_shadow_region(
        self, x: int, y: int, w: int, h: int, img_w: int, img_h: int
    ) -> Optional[Tuple[int, int, int, int]]:
        """Calculate the expected shadow region based on sonar direction."""
        shadow_length = int(h * 1.5)  # Approximate shadow length

        if self.sonar_direction == "top":
            # Shadow below the object
            sy = y + h
            sx = x
            sw = w
            sh = min(shadow_length, img_h - sy)
        elif self.sonar_direction == "bottom":
            sy = max(0, y - shadow_length)
            sx = x
            sw = w
            sh = y - sy
        elif self.sonar_direction == "left":
            sx = x + w
            sy = y
            sw = min(shadow_length, img_w - sx)
            sh = h
        elif self.sonar_direction == "right":
            sx = max(0, x - shadow_length)
            sy = y
            sw = x - sx
            sh = h
        else:
            # Default: shadow below
            sy = y + h
            sx = x
            sw = w
            sh = min(shadow_length, img_h - sy)

        if sw <= 0 or sh <= 0:
            return None
        return (sx, sy, sw, sh)

    def _get_background_region(
        self, x: int, y: int, w: int, h: int, img_w: int, img_h: int
    ) -> Optional[Tuple[int, int, int, int]]:
        """Get a background region away from the object for reference."""
        # Try to get a region to the side of the object
        margin = 20
        bg_size = max(w, h)

        # Try right side
        bx = x + w + margin
        if bx + bg_size < img_w:
            return (bx, max(0, y), min(bg_size, img_w - bx), min(bg_size, img_h - y))

        # Try left side
        bx = x - margin - bg_size
        if bx >= 0:
            return (bx, max(0, y), bg_size, min(bg_size, img_h - y))

        return None

    def visualize_shadow(
        self, image: np.ndarray, bbox: Dict[str, int], shadow_result: dict
    ) -> np.ndarray:
        """Draw shadow analysis overlay on the image."""
        vis = image.copy()
        x, y, w, h = bbox["x"], bbox["y"], bbox["width"], bbox["height"]

        # Draw object bbox in cyan
        cv2.rectangle(vis, (x, y), (x + w, y + h), (255, 255, 0), 2)

        # Draw shadow region in magenta if detected
        sr = shadow_result.get("shadow_region")
        if sr and shadow_result.get("shadow_detected"):
            sx, sy, sw, sh = sr["x"], sr["y"], sr["width"], sr["height"]
            overlay = vis.copy()
            cv2.rectangle(overlay, (sx, sy), (sx + sw, sy + sh), (255, 0, 255), -1)
            cv2.addWeighted(overlay, 0.2, vis, 0.8, 0, vis)
            cv2.rectangle(vis, (sx, sy), (sx + sw, sy + sh), (255, 0, 255), 1)

        # Add score text
        score = shadow_result.get("shadow_score", 0)
        label = f"Shadow: {score:.2f}"
        cv2.putText(vis, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)

        return vis
