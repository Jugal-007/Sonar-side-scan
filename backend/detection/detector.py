"""MarineGuard AI — Object Detection Abstraction.

Detector
├── YOLODetector  — loads trained YOLO weights, performs inference
└── MockDetector  — deterministic demo detections (no model required)
"""

import time
import uuid
import random
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime, timezone

import cv2
import numpy as np


class Detection:
    """A single object detection result."""

    def __init__(
        self,
        class_name: str,
        class_id: int,
        confidence: float,
        bbox: Dict[str, int],  # x, y, width, height (pixel coords)
        image_name: str = "",
        model_name: str = "",
    ):
        self.id = str(uuid.uuid4())[:8]
        self.class_name = class_name
        self.class_id = class_id
        self.confidence = confidence
        self.bbox = bbox
        self.image_name = image_name
        self.model_name = model_name
        self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "class": self.class_name,
            "class_id": self.class_id,
            "confidence": round(self.confidence, 4),
            "bbox": self.bbox,
            "image_name": self.image_name,
            "model_name": self.model_name,
            "timestamp": self.timestamp,
        }


class DetectionResult:
    """Container for all detections from a single image."""

    def __init__(
        self,
        image_name: str,
        detections: List[Detection],
        processing_time_ms: float,
        model_name: str,
        image_width: int = 0,
        image_height: int = 0,
    ):
        self.image_name = image_name
        self.detections = detections
        self.processing_time_ms = processing_time_ms
        self.model_name = model_name
        self.image_width = image_width
        self.image_height = image_height
        self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {
            "image_name": self.image_name,
            "detections": [d.to_dict() for d in self.detections],
            "detection_count": len(self.detections),
            "processing_time_ms": round(self.processing_time_ms, 2),
            "model_name": self.model_name,
            "image_width": self.image_width,
            "image_height": self.image_height,
            "timestamp": self.timestamp,
        }


class Detector(ABC):
    """Abstract base class for object detectors."""

    @abstractmethod
    def detect(self, image: np.ndarray, image_name: str = "unknown") -> DetectionResult:
        """Run detection on a single image."""
        ...

    @abstractmethod
    def get_class_names(self) -> List[str]:
        """Return the list of class names the model can detect."""
        ...

    @abstractmethod
    def get_model_info(self) -> dict:
        """Return model metadata."""
        ...


class YOLODetector(Detector):
    """YOLO-based detector using Ultralytics."""

    def __init__(self, model_path: str | Path, confidence: float = 0.25, device: str = "auto"):
        from ultralytics import YOLO
        import torch

        self.model_path = Path(model_path)
        self.confidence = confidence

        # Determine device
        if device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        # Load model ONCE
        self.model = YOLO(str(self.model_path))
        self.model.to(self.device)

        # Extract class names
        self._class_names = list(self.model.names.values()) if hasattr(self.model, "names") else []
        self._model_name = self.model_path.stem

    def detect(self, image: np.ndarray, image_name: str = "unknown") -> DetectionResult:
        """Run YOLO inference on an image."""
        start = time.perf_counter()
        h, w = image.shape[:2]

        results = self.model.predict(
            image,
            conf=self.confidence,
            verbose=False,
            device=self.device,
        )

        detections = []
        if results and len(results) > 0:
            result = results[0]
            if result.boxes is not None:
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    cls_id = int(box.cls[0].cpu().numpy())
                    conf = float(box.conf[0].cpu().numpy())
                    cls_name = self._class_names[cls_id] if cls_id < len(self._class_names) else f"class_{cls_id}"

                    detections.append(Detection(
                        class_name=cls_name,
                        class_id=cls_id,
                        confidence=conf,
                        bbox={
                            "x": int(x1),
                            "y": int(y1),
                            "width": int(x2 - x1),
                            "height": int(y2 - y1),
                        },
                        image_name=image_name,
                        model_name=self._model_name,
                    ))

        elapsed = (time.perf_counter() - start) * 1000
        return DetectionResult(
            image_name=image_name,
            detections=detections,
            processing_time_ms=elapsed,
            model_name=self._model_name,
            image_width=w,
            image_height=h,
        )

    def get_class_names(self) -> List[str]:
        return self._class_names

    def get_model_info(self) -> dict:
        import torch
        return {
            "model_name": self._model_name,
            "model_path": str(self.model_path),
            "architecture": "YOLO (Ultralytics)",
            "classes": self._class_names,
            "num_classes": len(self._class_names),
            "device": self.device,
            "cuda_available": torch.cuda.is_available(),
            "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
            "confidence_threshold": self.confidence,
            "status": "ACTIVE",
            "mode": "inference",
        }


class MockDetector(Detector):
    """Deterministic mock detector for demo mode when no trained weights exist.
    
    WARNING: Results from MockDetector are synthetic and must NOT be presented
    as real AI detection results. Always label outputs as "DEMO MODE".
    """

    DEMO_CLASSES = ["mine", "can", "bottle", "drink-carton", "chain",
                    "propeller", "tire", "hook", "valve", "shampoo-bottle", "standing-bottle"]

    def __init__(self):
        self._rng = random.Random(42)

    def detect(self, image: np.ndarray, image_name: str = "unknown") -> DetectionResult:
        """Generate synthetic detections for demo purposes."""
        start = time.perf_counter()
        h, w = image.shape[:2]

        # Generate 1-3 demo detections
        num = self._rng.randint(1, 3)
        detections = []
        for _ in range(num):
            cls_id = self._rng.randint(0, len(self.DEMO_CLASSES) - 1)
            bw = self._rng.randint(40, min(200, w // 3))
            bh = self._rng.randint(30, min(150, h // 3))
            bx = self._rng.randint(10, max(11, w - bw - 10))
            by = self._rng.randint(10, max(11, h - bh - 10))

            detections.append(Detection(
                class_name=self.DEMO_CLASSES[cls_id],
                class_id=cls_id,
                confidence=round(self._rng.uniform(0.45, 0.98), 4),
                bbox={"x": bx, "y": by, "width": bw, "height": bh},
                image_name=image_name,
                model_name="MockDetector (DEMO)",
            ))

        elapsed = (time.perf_counter() - start) * 1000 + self._rng.uniform(5, 20)
        return DetectionResult(
            image_name=image_name,
            detections=detections,
            processing_time_ms=elapsed,
            model_name="MockDetector (DEMO)",
            image_width=w,
            image_height=h,
        )

    def get_class_names(self) -> List[str]:
        return self.DEMO_CLASSES

    def get_model_info(self) -> dict:
        return {
            "model_name": "MockDetector",
            "model_path": "N/A",
            "architecture": "Mock (Demo Mode)",
            "classes": self.DEMO_CLASSES,
            "num_classes": len(self.DEMO_CLASSES),
            "device": "cpu",
            "cuda_available": False,
            "confidence_threshold": 0.25,
            "status": "DEMO",
            "mode": "mock",
            "warning": "This is a DEMO detector. Results are synthetic.",
        }


def create_detector() -> Detector:
    """Factory: create the best available detector.
    
    Returns YOLODetector if trained weights exist, otherwise MockDetector.
    """
    from backend.utils.config import Config

    if Config.MODEL_PATH.exists():
        try:
            return YOLODetector(
                model_path=Config.MODEL_PATH,
                confidence=Config.CONFIDENCE_THRESHOLD,
                device=Config.DEVICE,
            )
        except Exception as e:
            print(f"[MarineGuard] Failed to load YOLO model: {e}")
            print("[MarineGuard] Falling back to MockDetector (Demo Mode)")

    print("[MarineGuard] No trained weights found. Using MockDetector (Demo Mode)")
    return MockDetector()
