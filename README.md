# Sonar-side-scan (MarineGuard AI)

AI-Powered Automated Underwater Marine Debris & Anomaly Detection System Using Sonar Imagery.

## Overview
MarineGuard AI is a complete, working hackathon prototype that analyzes forward-looking sonar imagery to detect man-made anomalies on the seabed. It utilizes a custom-trained YOLO object detection model combined with heuristic acoustic shadow analysis to score anomalies.

## Features
- **FastAPI Backend:** Handles inference, preprocessing, and reporting.
- **YOLO11 Object Detection:** Trained on 11 classes of marine debris.
- **Sonar Preprocessing Pipeline:** CLAHE contrast enhancement and noise reduction designed specifically for acoustic imagery.
- **Acoustic Shadow Analysis:** Prototype heuristic to evaluate shadows behind objects to verify seabed anomalies.
- **React + Vite Frontend:** Impeccable Emil Kwolski-inspired dark marine-tech design with Framer Motion animations.
- **Live Simulation:** Simulates a real-time hardware stream using sample data.
- **Geotagging:** Maps detections to geospatial coordinates.

## Quickstart

### Backend
1. Copy `.env.example` to `.env`.
2. Install dependencies: `pip install -r requirements.txt` (Ensure you have PyTorch CUDA installed if you have a GPU).
3. Start the server:
   ```bash
   uvicorn backend.main:app --reload
   ```

### Frontend
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server:
   ```bash
   npm run dev
   ```

### Running Tests
End-to-End tests are built using Playwright.
```bash
cd frontend
npx playwright test
```

## Dataset Information
The system is built on a 2,035-image Forward-Looking Sonar dataset consisting of 11 classes (mine, can, bottle, drink-carton, chain, propeller, tire, hook, valve, shampoo-bottle, standing-bottle). A secondary dataset (sonar_mine) is kept for cross-modality testing.
