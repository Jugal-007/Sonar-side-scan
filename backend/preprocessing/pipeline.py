"""MarineGuard AI — Sonar Image Preprocessing Pipeline.

Configurable pipeline for sonar imagery:
  Raw Sonar → Validation → Resize → Normalize → Contrast Enhancement → CLAHE → Noise Reduction
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Optional, Tuple

from backend.utils.config import Config


class SonarPreprocessor:
    """Configurable preprocessing pipeline for sonar images."""

    def __init__(
        self,
        resize: Tuple[int, int] = None,
        enable_clahe: bool = None,
        enable_noise_reduction: bool = None,
        enable_contrast: bool = None,
    ):
        self.resize = resize or (Config.RESIZE_WIDTH, Config.RESIZE_HEIGHT)
        self.enable_clahe = enable_clahe if enable_clahe is not None else Config.ENABLE_CLAHE
        self.enable_noise_reduction = (
            enable_noise_reduction if enable_noise_reduction is not None else Config.ENABLE_NOISE_REDUCTION
        )
        self.enable_contrast = (
            enable_contrast if enable_contrast is not None else Config.ENABLE_CONTRAST_ENHANCEMENT
        )

    def validate_image(self, image: np.ndarray) -> bool:
        """Check if the image is valid and non-empty."""
        if image is None:
            return False
        if image.size == 0:
            return False
        if len(image.shape) < 2:
            return False
        return True

    def load_image(self, path: str | Path) -> Optional[np.ndarray]:
        """Load an image from disk with validation."""
        path = Path(path)
        if not path.exists():
            return None
        if path.suffix.lower() not in Config.ALLOWED_EXTENSIONS:
            return None
        try:
            img = cv2.imread(str(path))
            if not self.validate_image(img):
                return None
            return img
        except Exception:
            return None

    def resize_image(self, image: np.ndarray) -> np.ndarray:
        """Resize while maintaining aspect ratio with padding."""
        h, w = image.shape[:2]
        target_w, target_h = self.resize
        scale = min(target_w / w, target_h / h)
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

        # Pad to target size (letterbox)
        canvas = np.zeros((target_h, target_w, 3), dtype=np.uint8)
        y_off = (target_h - new_h) // 2
        x_off = (target_w - new_w) // 2
        canvas[y_off : y_off + new_h, x_off : x_off + new_w] = resized
        return canvas

    def normalize(self, image: np.ndarray) -> np.ndarray:
        """Normalize pixel values to 0-255 range."""
        if image.dtype != np.uint8:
            image = cv2.normalize(image, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        return image

    def enhance_contrast(self, image: np.ndarray) -> np.ndarray:
        """Apply histogram equalization for contrast enhancement."""
        if len(image.shape) == 3:
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l_channel = lab[:, :, 0]
            l_channel = cv2.equalizeHist(l_channel)
            lab[:, :, 0] = l_channel
            return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        return cv2.equalizeHist(image)

    def apply_clahe(self, image: np.ndarray) -> np.ndarray:
        """Apply Contrast Limited Adaptive Histogram Equalization.
        
        CLAHE preserves local contrast better than global histogram equalization,
        which is important for sonar images where acoustic shadows carry information.
        """
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        if len(image.shape) == 3:
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            lab[:, :, 0] = clahe.apply(lab[:, :, 0])
            return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        return clahe.apply(image)

    def reduce_noise(self, image: np.ndarray) -> np.ndarray:
        """Apply mild noise reduction without destroying shadow information."""
        if len(image.shape) == 3:
            return cv2.fastNlMeansDenoisingColored(image, None, 6.0, 6.0, 7, 21)
        return cv2.fastNlMeansDenoising(image, None, 6.0, 7, 21)

    def process(self, image: np.ndarray) -> np.ndarray:
        """Run the full preprocessing pipeline."""
        if not self.validate_image(image):
            raise ValueError("Invalid input image")

        result = image.copy()
        result = self.normalize(result)
        result = self.resize_image(result)

        if self.enable_contrast:
            result = self.enhance_contrast(result)

        if self.enable_clahe:
            result = self.apply_clahe(result)

        if self.enable_noise_reduction:
            result = self.reduce_noise(result)

        return result

    def process_file(self, path: str | Path) -> Optional[np.ndarray]:
        """Load and process an image file."""
        image = self.load_image(path)
        if image is None:
            return None
        return self.process(image)

    def compute_quality_score(self, image: np.ndarray) -> float:
        """Estimate image quality (0-1) based on contrast and sharpness.
        
        Used as one component of the anomaly scoring system.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

        # Laplacian variance as sharpness proxy
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness = min(laplacian_var / 500.0, 1.0)

        # Contrast ratio
        p5, p95 = np.percentile(gray, [5, 95])
        contrast = min((p95 - p5) / 255.0 * 1.5, 1.0)

        return float(sharpness * 0.5 + contrast * 0.5)
