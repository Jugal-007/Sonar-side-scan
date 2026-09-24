"""MarineGuard AI — Composite Anomaly Scoring Engine.

The anomaly score is NOT simply the YOLO confidence. It is a weighted
composite of multiple evidence sources:

  AI confidence:      50%
  Shadow evidence:    20%
  Shape analysis:     15%
  Texture analysis:   10%
  Image quality:       5%

Final score is normalized to 0-100%.

Severity levels (configurable):
  0–49:   LOW
  50–74:  SUSPICIOUS
  75–89:  HIGH
  90–100: CRITICAL

DISCLAIMER: This is a heuristic scoring system. It is not trained
as a secondary classifier.
"""

import cv2
import numpy as np
from typing import Dict

from backend.utils.config import Config
from backend.anomaly.shadow_analyzer import ShadowAnalyzer


class AnomalyScorer:
    """Composite sonar anomaly scoring engine."""

    def __init__(self):
        self.shadow_analyzer = ShadowAnalyzer(sonar_direction="top")

        # Weights from config
        self.w_confidence = Config.WEIGHT_AI_CONFIDENCE
        self.w_shadow = Config.WEIGHT_SHADOW_EVIDENCE
        self.w_shape = Config.WEIGHT_SHAPE
        self.w_texture = Config.WEIGHT_TEXTURE
        self.w_quality = Config.WEIGHT_IMAGE_QUALITY

    def score(
        self,
        image: np.ndarray,
        bbox: Dict[str, int],
        ai_confidence: float,
        image_quality: float = 0.5,
    ) -> dict:
        """Compute composite anomaly score for a detection.

        Args:
            image: The sonar image (BGR).
            bbox: Detection bounding box {x, y, width, height}.
            ai_confidence: YOLO confidence (0-1).
            image_quality: Pre-computed image quality score (0-1).

        Returns:
            dict with anomaly_score, severity, and component breakdowns.
        """
        # 1. AI confidence component
        conf_score = ai_confidence

        # 2. Shadow analysis
        shadow_result = self.shadow_analyzer.analyze(image, bbox)
        shadow_score = shadow_result.get("shadow_score", 0.0)

        # 3. Shape analysis
        shape_score = self._analyze_shape(bbox)

        # 4. Texture analysis
        texture_score = self._analyze_texture(image, bbox)

        # 5. Image quality
        quality_score = image_quality

        # Weighted composite
        anomaly_score = (
            self.w_confidence * conf_score
            + self.w_shadow * shadow_score
            + self.w_shape * shape_score
            + self.w_texture * texture_score
            + self.w_quality * quality_score
        )
        anomaly_score = float(np.clip(anomaly_score, 0.0, 1.0))
        anomaly_pct = round(anomaly_score * 100, 1)
        severity = Config.severity_label(anomaly_score)

        return {
            "anomaly_score": round(anomaly_score, 4),
            "anomaly_pct": anomaly_pct,
            "severity": severity,
            "components": {
                "ai_confidence": {
                    "value": round(conf_score, 4),
                    "weight": self.w_confidence,
                    "weighted": round(self.w_confidence * conf_score, 4),
                },
                "shadow_evidence": {
                    "value": round(shadow_score, 4),
                    "weight": self.w_shadow,
                    "weighted": round(self.w_shadow * shadow_score, 4),
                    "details": shadow_result,
                },
                "shape_analysis": {
                    "value": round(shape_score, 4),
                    "weight": self.w_shape,
                    "weighted": round(self.w_shape * shape_score, 4),
                },
                "texture_analysis": {
                    "value": round(texture_score, 4),
                    "weight": self.w_texture,
                    "weighted": round(self.w_texture * texture_score, 4),
                },
                "image_quality": {
                    "value": round(quality_score, 4),
                    "weight": self.w_quality,
                    "weighted": round(self.w_quality * quality_score, 4),
                },
            },
            "disclaimer": "Heuristic scoring system — not a trained classifier.",
        }

    def _analyze_shape(self, bbox: Dict[str, int]) -> float:
        """Shape-based anomaly score.

        Man-made objects tend to have regular shapes (higher aspect-ratio regularity).
        Very elongated or very square objects may indicate man-made origin.
        """
        w, h = bbox["width"], bbox["height"]
        if w == 0 or h == 0:
            return 0.0

        aspect_ratio = max(w, h) / min(w, h)

        # Man-made objects: moderate aspect ratios (1.0-4.0)
        if 1.0 <= aspect_ratio <= 3.0:
            score = 0.8
        elif 3.0 < aspect_ratio <= 5.0:
            score = 0.6
        else:
            score = 0.3

        # Size factor: very small or very large objects are less likely to be anomalies
        area = w * h
        if area < 100:
            score *= 0.3
        elif area < 500:
            score *= 0.7
        elif area > 50000:
            score *= 0.5

        return float(np.clip(score, 0.0, 1.0))

    def _analyze_texture(self, image: np.ndarray, bbox: Dict[str, int]) -> float:
        """Texture-based anomaly score.

        Man-made objects often have different texture from the seabed.
        Measures local texture complexity using gradient analysis.
        """
        x, y, w, h = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

        img_h, img_w = gray.shape[:2]
        x = max(0, min(x, img_w - 1))
        y = max(0, min(y, img_h - 1))
        w = min(w, img_w - x)
        h = min(h, img_h - y)

        if w <= 2 or h <= 2:
            return 0.5

        roi = gray[y : y + h, x : x + w]

        # Gradient magnitude as texture measure
        gx = cv2.Sobel(roi, cv2.CV_64F, 1, 0, ksize=3)
        gy = cv2.Sobel(roi, cv2.CV_64F, 0, 1, ksize=3)
        magnitude = np.sqrt(gx ** 2 + gy ** 2)

        # Normalize gradient energy
        texture_energy = float(np.mean(magnitude))
        score = min(texture_energy / 50.0, 1.0)

        return float(np.clip(score, 0.0, 1.0))
