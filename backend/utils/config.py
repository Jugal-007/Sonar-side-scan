"""MarineGuard AI — Centralized Configuration."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_PROJECT_ROOT / ".env")


def _bool(val: str) -> bool:
    return val.lower() in ("true", "1", "yes")


class Config:
    """Application-wide settings read from environment variables."""

    # Paths
    PROJECT_ROOT = _PROJECT_ROOT
    UPLOAD_DIR = _PROJECT_ROOT / os.getenv("UPLOAD_DIR", "uploads")
    REPORT_DIR = _PROJECT_ROOT / os.getenv("REPORT_DIR", "reports")
    SAMPLE_DATA_DIR = _PROJECT_ROOT / "sample_data"
    DATASET1_PATH = _PROJECT_ROOT / os.getenv("DATASET1_PATH", "datasets/forward_sonar")
    DATASET2_PATH = _PROJECT_ROOT / os.getenv("DATASET2_PATH", "datasets/sonar_mine")

    # Server
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    DEBUG = _bool(os.getenv("DEBUG", "true"))

    # Model
    MODEL_PATH = _PROJECT_ROOT / os.getenv("MODEL_PATH", "ml/models/trained/best.pt")
    MODEL_NAME = os.getenv("MODEL_NAME", "yolo11s.pt")
    IMAGE_SIZE = int(os.getenv("IMAGE_SIZE", "640"))
    CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.25"))
    DEVICE = os.getenv("DEVICE", "auto")  # auto | cpu | cuda | cuda:0

    # Preprocessing
    ENABLE_CLAHE = _bool(os.getenv("ENABLE_CLAHE", "true"))
    ENABLE_NOISE_REDUCTION = _bool(os.getenv("ENABLE_NOISE_REDUCTION", "true"))
    ENABLE_CONTRAST_ENHANCEMENT = _bool(os.getenv("ENABLE_CONTRAST_ENHANCEMENT", "true"))
    RESIZE_WIDTH = int(os.getenv("RESIZE_WIDTH", "640"))
    RESIZE_HEIGHT = int(os.getenv("RESIZE_HEIGHT", "640"))

    # Anomaly scoring weights (must sum to ~1.0)
    WEIGHT_AI_CONFIDENCE = float(os.getenv("WEIGHT_AI_CONFIDENCE", "0.50"))
    WEIGHT_SHADOW_EVIDENCE = float(os.getenv("WEIGHT_SHADOW_EVIDENCE", "0.20"))
    WEIGHT_SHAPE = float(os.getenv("WEIGHT_SHAPE", "0.15"))
    WEIGHT_TEXTURE = float(os.getenv("WEIGHT_TEXTURE", "0.10"))
    WEIGHT_IMAGE_QUALITY = float(os.getenv("WEIGHT_IMAGE_QUALITY", "0.05"))

    # Severity thresholds
    SEVERITY_LOW_MAX = int(os.getenv("SEVERITY_LOW_MAX", "49"))
    SEVERITY_SUSPICIOUS_MAX = int(os.getenv("SEVERITY_SUSPICIOUS_MAX", "74"))
    SEVERITY_HIGH_MAX = int(os.getenv("SEVERITY_HIGH_MAX", "89"))

    # Upload limits
    MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
    ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif"}

    @classmethod
    def ensure_dirs(cls):
        """Create required directories."""
        cls.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        cls.REPORT_DIR.mkdir(parents=True, exist_ok=True)
        cls.SAMPLE_DATA_DIR.mkdir(parents=True, exist_ok=True)
        (_PROJECT_ROOT / "ml" / "models" / "trained").mkdir(parents=True, exist_ok=True)
        (_PROJECT_ROOT / "ml" / "models" / "pretrained").mkdir(parents=True, exist_ok=True)
        (_PROJECT_ROOT / "ml" / "datasets" / "processed").mkdir(parents=True, exist_ok=True)

    @classmethod
    def severity_label(cls, score: float) -> str:
        """Map 0-100 anomaly score to severity label."""
        pct = score * 100 if score <= 1.0 else score
        if pct <= cls.SEVERITY_LOW_MAX:
            return "LOW"
        elif pct <= cls.SEVERITY_SUSPICIOUS_MAX:
            return "SUSPICIOUS"
        elif pct <= cls.SEVERITY_HIGH_MAX:
            return "HIGH"
        return "CRITICAL"
