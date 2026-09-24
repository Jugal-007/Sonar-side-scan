"""MarineGuard AI — FastAPI Backend Application.

AI-Powered Underwater Marine Debris & Anomaly Detection System.
"""

import sys
from pathlib import Path

# Ensure project root is on path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.utils.config import Config
from backend.detection.detector import create_detector
from backend.api.routes import router, init_services

# Ensure directories exist
Config.ensure_dirs()

# Create app
app = FastAPI(
    title="MarineGuard AI",
    description="AI-Powered Underwater Marine Debris & Anomaly Detection System",
    version="1.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static dirs
if Config.UPLOAD_DIR.exists():
    app.mount("/uploads", StaticFiles(directory=str(Config.UPLOAD_DIR)), name="uploads")
if Config.REPORT_DIR.exists():
    app.mount("/reports", StaticFiles(directory=str(Config.REPORT_DIR)), name="reports")
if Config.SAMPLE_DATA_DIR.exists():
    app.mount("/sample_data", StaticFiles(directory=str(Config.SAMPLE_DATA_DIR)), name="sample_data")

# Initialize detector
detector = create_detector()
init_services(detector)

# Register routes
app.include_router(router)

print(f"""
╔══════════════════════════════════════════════════════════╗
║              MARINEGUARD AI — Backend                    ║
║   AI-Powered Sonar Anomaly Detection System              ║
╠══════════════════════════════════════════════════════════╣
║  Model:  {detector.get_model_info().get('model_name', 'N/A'):47s} ║
║  Mode:   {detector.get_model_info().get('mode', 'N/A'):47s} ║
║  Device: {detector.get_model_info().get('device', 'N/A'):47s} ║
║  Classes: {str(len(detector.get_class_names())):46s} ║
╚══════════════════════════════════════════════════════════╝
""")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=Config.HOST, port=Config.PORT, reload=Config.DEBUG)
