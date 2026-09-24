"""MarineGuard AI — SQLite Detection Store."""

import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timezone
from backend.utils.config import Config

DB_PATH = Config.REPORT_DIR / "detections.db"

def init_db():
    Config.ensure_dirs()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS detections (
                id TEXT PRIMARY KEY,
                image_name TEXT,
                class_name TEXT,
                confidence REAL,
                severity TEXT,
                anomaly_pct REAL,
                timestamp TEXT,
                data JSON
            )
        ''')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_class ON detections (class_name)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_severity ON detections (severity)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON detections (timestamp)')
        
        conn.execute('''
            CREATE TABLE IF NOT EXISTS stats (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                total_frames INTEGER DEFAULT 0,
                total_detections INTEGER DEFAULT 0,
                high_risk_count INTEGER DEFAULT 0,
                total_confidence REAL DEFAULT 0.0,
                total_processing_time REAL DEFAULT 0.0
            )
        ''')
        conn.execute('INSERT OR IGNORE INTO stats (id) VALUES (1)')

def insert_detection(det: dict):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            INSERT OR REPLACE INTO detections 
            (id, image_name, class_name, confidence, severity, anomaly_pct, timestamp, data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            det.get("id"),
            det.get("image", det.get("image_name", "")),
            det.get("class", ""),
            det.get("confidence", 0.0),
            det.get("severity", "LOW"),
            det.get("anomaly_pct", 0.0),
            det.get("timestamp", ""),
            json.dumps(det)
        ))

def get_detections(limit: int = 100, offset: int = 0, severity: Optional[str] = None, cls: Optional[str] = None) -> dict:
    with sqlite3.connect(DB_PATH) as conn:
        query = "SELECT data FROM detections WHERE 1=1"
        params = []
        if severity:
            query += " AND severity = ?"
            params.append(severity.upper())
        if cls:
            query += " AND class_name = ?"
            params.append(cls.lower())
        
        count_query = query.replace("SELECT data", "SELECT COUNT(*)")
        cursor = conn.cursor()
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]

        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        return {
            "total": total,
            "detections": [json.loads(row[0]) for row in rows]
        }

def get_all_detections() -> List[dict]:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM detections ORDER BY timestamp DESC")
        return [json.loads(row[0]) for row in cursor.fetchall()]

def get_detection_by_id(detection_id: str) -> Optional[dict]:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM detections WHERE id = ?", (detection_id,))
        row = cursor.fetchone()
        if row:
            return json.loads(row[0])
        return None

def update_stats(frames: int, detections: int, high_risk: int, confidence: float, processing_time: float):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            UPDATE stats SET 
                total_frames = total_frames + ?,
                total_detections = total_detections + ?,
                high_risk_count = high_risk_count + ?,
                total_confidence = total_confidence + ?,
                total_processing_time = total_processing_time + ?
            WHERE id = 1
        ''', (frames, detections, high_risk, confidence, processing_time))

def get_stats() -> dict:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM stats WHERE id = 1')
        row = cursor.fetchone()
        if row:
            return {
                "total_frames": row[1],
                "total_detections": row[2],
                "high_risk_count": row[3],
                "total_confidence": row[4],
                "total_processing_time": row[5]
            }
        return {
            "total_frames": 0,
            "total_detections": 0,
            "high_risk_count": 0,
            "total_confidence": 0.0,
            "total_processing_time": 0.0
        }
