"""MarineGuard AI — Sonar Input Provider Abstraction.

SonarInputProvider
├── FileSonarProvider      — loads images from a directory
├── SimulatedSonarProvider — sequential frame playback (simulated live)
└── LiveSonarProvider      — reserved for future hardware integration
"""

import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Generator, List, Optional, Tuple

import cv2
import numpy as np

from backend.utils.config import Config


class SonarInputProvider(ABC):
    """Abstract base class for sonar data sources."""

    @abstractmethod
    def get_frames(self) -> Generator[Tuple[str, np.ndarray], None, None]:
        """Yield (filename, image) tuples."""
        ...

    @abstractmethod
    def get_frame_count(self) -> int:
        """Return total number of frames available."""
        ...


class FileSonarProvider(SonarInputProvider):
    """Load sonar images from a directory."""

    def __init__(self, directory: str | Path):
        self.directory = Path(directory)
        self._files = sorted([
            f for f in self.directory.iterdir()
            if f.is_file() and f.suffix.lower() in Config.ALLOWED_EXTENSIONS
        ])

    def get_frames(self) -> Generator[Tuple[str, np.ndarray], None, None]:
        for f in self._files:
            img = cv2.imread(str(f))
            if img is not None:
                yield f.name, img

    def get_frame_count(self) -> int:
        return len(self._files)


class SimulatedSonarProvider(SonarInputProvider):
    """Sequential frame playback simulating a live sonar feed.
    
    IMPORTANT: This is a SIMULATED feed using recorded data.
    It must NOT be represented as a real ocean sonar feed.
    """

    def __init__(
        self,
        directory: str | Path = None,
        fps: float = 2.0,
        loop: bool = False,
    ):
        self.directory = Path(directory) if directory else Config.SAMPLE_DATA_DIR
        self.fps = fps
        self.loop = loop
        self._files = sorted([
            f for f in self.directory.iterdir()
            if f.is_file() and f.suffix.lower() in Config.ALLOWED_EXTENSIONS
        ]) if self.directory.exists() else []
        self._frame_delay = 1.0 / max(fps, 0.1)

    def get_frames(self) -> Generator[Tuple[str, np.ndarray], None, None]:
        while True:
            for f in self._files:
                img = cv2.imread(str(f))
                if img is not None:
                    time.sleep(self._frame_delay)
                    yield f.name, img
            if not self.loop:
                break

    def get_frame_count(self) -> int:
        return len(self._files)


class LiveSonarProvider(SonarInputProvider):
    """RESERVED for future real sonar hardware integration.
    
    This provider would connect to real sonar hardware via:
    - Network stream (UDP/TCP)
    - ROS topic
    - Hardware API (e.g., ARIS SDK)
    
    NOT IMPLEMENTED — raises NotImplementedError.
    """

    def __init__(self, *args, **kwargs):
        raise NotImplementedError(
            "LiveSonarProvider is reserved for future hardware integration. "
            "Use SimulatedSonarProvider for testing."
        )

    def get_frames(self):
        raise NotImplementedError

    def get_frame_count(self) -> int:
        raise NotImplementedError
