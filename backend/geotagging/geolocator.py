"""MarineGuard AI — Geotagging Module.

Associates detections with geographic coordinates when metadata is available.
Accepts metadata from JSON/CSV files.

IMPORTANT: The center of an image does NOT automatically equal the GPS position
of a detected object. Accurate geolocation depends on sonar range, vehicle
position, heading, slant range, and sensor offsets.
This module implements a simple prototype calculation.
"""

import json
import csv
from pathlib import Path
from typing import Dict, List, Optional


class GeoMetadata:
    """Geographic metadata for a sonar frame."""

    def __init__(
        self,
        image: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        heading: Optional[float] = None,
        timestamp: Optional[str] = None,
        ping_number: Optional[int] = None,
        range_m: Optional[float] = None,
    ):
        self.image = image
        self.latitude = latitude
        self.longitude = longitude
        self.heading = heading
        self.timestamp = timestamp
        self.ping_number = ping_number
        self.range_m = range_m

    @property
    def has_location(self) -> bool:
        return self.latitude is not None and self.longitude is not None

    def to_dict(self) -> dict:
        return {
            "image": self.image,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "heading": self.heading,
            "timestamp": self.timestamp,
            "ping_number": self.ping_number,
            "range_m": self.range_m,
            "has_location": self.has_location,
        }


class Geolocator:
    """Manages geographic metadata for sonar frames."""

    def __init__(self):
        self._metadata: Dict[str, GeoMetadata] = {}

    def load_from_json(self, path: str | Path) -> int:
        """Load geo metadata from a JSON file.
        
        Expected format: list of objects or dict keyed by image name.
        Each entry: {image, latitude, longitude, heading?, timestamp?, ...}
        """
        path = Path(path)
        if not path.exists():
            return 0

        with open(path, "r") as f:
            data = json.load(f)

        count = 0
        if isinstance(data, list):
            for entry in data:
                meta = self._parse_entry(entry)
                if meta:
                    self._metadata[meta.image] = meta
                    count += 1
        elif isinstance(data, dict):
            for key, entry in data.items():
                if isinstance(entry, dict):
                    entry.setdefault("image", key)
                    meta = self._parse_entry(entry)
                    if meta:
                        self._metadata[meta.image] = meta
                        count += 1
        return count

    def load_from_csv(self, path: str | Path) -> int:
        """Load geo metadata from a CSV file."""
        path = Path(path)
        if not path.exists():
            return 0

        count = 0
        with open(path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                meta = self._parse_entry(row)
                if meta:
                    self._metadata[meta.image] = meta
                    count += 1
        return count

    def add_metadata(self, meta: GeoMetadata):
        """Add metadata for a single image."""
        self._metadata[meta.image] = meta

    def get_metadata(self, image_name: str) -> Optional[GeoMetadata]:
        """Get geo metadata for an image."""
        return self._metadata.get(image_name)

    def get_all(self) -> Dict[str, GeoMetadata]:
        return self._metadata

    def _parse_entry(self, entry: dict) -> Optional[GeoMetadata]:
        """Parse a dict entry into GeoMetadata."""
        image = entry.get("image", entry.get("filename", entry.get("name", "")))
        if not image:
            return None

        def _float(key):
            val = entry.get(key)
            if val is not None and val != "":
                try:
                    return float(val)
                except (ValueError, TypeError):
                    pass
            return None

        def _int(key):
            val = entry.get(key)
            if val is not None and val != "":
                try:
                    return int(val)
                except (ValueError, TypeError):
                    pass
            return None

        return GeoMetadata(
            image=image,
            latitude=_float("latitude") or _float("lat"),
            longitude=_float("longitude") or _float("lon") or _float("lng"),
            heading=_float("heading"),
            timestamp=entry.get("timestamp"),
            ping_number=_int("ping_number") or _int("ping"),
            range_m=_float("range") or _float("range_m"),
        )

    def generate_demo_metadata(self, image_names: List[str]) -> int:
        """Generate simulated geo metadata for demo purposes.
        
        Creates a transect pattern around Mumbai harbor for demonstration.
        CLEARLY LABELED as simulated data.
        """
        import math

        # Arabian Sea, off the coast of Mumbai
        base_lat = 18.9000
        base_lon = 72.7500
        count = 0

        # Lawnmower pattern parameters
        leg_length = 20
        spacing_deg = 0.0008 # Distance between parallel legs
        step_deg = 0.0003 # Distance between images on the same leg

        for i, name in enumerate(image_names):
            leg_number = i // leg_length
            step_in_leg = i % leg_length
            
            # Even legs go North, Odd legs go South
            if leg_number % 2 == 0:
                lat = base_lat + (step_in_leg * step_deg)
                heading = 0.0
            else:
                lat = base_lat + ((leg_length - 1 - step_in_leg) * step_deg)
                heading = 180.0
                
            lon = base_lon + (leg_number * spacing_deg)

            self._metadata[name] = GeoMetadata(
                image=name,
                latitude=round(lat, 6),
                longitude=round(lon, 6),
                heading=heading,
                timestamp=f"2026-09-10T12:{(i//60)%24:02d}:{i%60:02d}Z",
                ping_number=i,
                range_m=round(15.0 + (i % 10) * 0.5, 1),
            )
            count += 1

        return count
