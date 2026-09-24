"""MarineGuard AI — Report Generator.

Generates CSV and JSON reports from detection results.
"""

import csv
import json
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime, timezone

from backend.utils.config import Config


class ReportGenerator:
    """Generate downloadable reports from detection results."""

    FIELDS = [
        "id", "image", "class", "confidence", "shadow_score",
        "anomaly_score", "anomaly_pct", "severity",
        "latitude", "longitude",
        "x", "y", "width", "height",
        "timestamp", "processing_time_ms", "model_name",
    ]

    def __init__(self):
        Config.ensure_dirs()

    def flatten_detection(
        self,
        detection: dict,
        anomaly: Optional[dict] = None,
        geo: Optional[dict] = None,
        processing_time_ms: float = 0,
    ) -> dict:
        """Flatten a detection + anomaly + geo into a report row."""
        bbox = detection.get("bbox", {})
        return {
            "id": detection.get("id", ""),
            "image": detection.get("image_name", ""),
            "class": detection.get("class", ""),
            "confidence": detection.get("confidence", 0),
            "shadow_score": (
                anomaly.get("components", {}).get("shadow_evidence", {}).get("value", 0)
                if anomaly else 0
            ),
            "anomaly_score": anomaly.get("anomaly_score", 0) if anomaly else 0,
            "anomaly_pct": anomaly.get("anomaly_pct", 0) if anomaly else 0,
            "severity": anomaly.get("severity", "N/A") if anomaly else "N/A",
            "latitude": geo.get("latitude") if geo else None,
            "longitude": geo.get("longitude") if geo else None,
            "x": bbox.get("x", 0),
            "y": bbox.get("y", 0),
            "width": bbox.get("width", 0),
            "height": bbox.get("height", 0),
            "timestamp": detection.get("timestamp", ""),
            "processing_time_ms": round(processing_time_ms, 2),
            "model_name": detection.get("model_name", ""),
        }

    def generate_json(self, rows: List[dict], filename: str = None) -> Path:
        """Generate a JSON report file."""
        if not filename:
            ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            filename = f"marineguard_report_{ts}.json"

        path = Config.REPORT_DIR / filename
        report = {
            "report_name": "MarineGuard AI Detection Report",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_detections": len(rows),
            "detections": rows,
        }

        with open(path, "w") as f:
            json.dump(report, f, indent=2, default=str)
        return path

    def generate_csv(self, rows: List[dict], filename: str = None) -> Path:
        """Generate a CSV report file."""
        if not filename:
            ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            filename = f"marineguard_report_{ts}.csv"

        path = Config.REPORT_DIR / filename

        with open(path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=self.FIELDS, extrasaction="ignore")
            writer.writeheader()
            for row in rows:
                writer.writerow(row)
        return path
