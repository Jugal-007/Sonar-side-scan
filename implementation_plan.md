# MarineGuard AI — Improvement Implementation Plan

## Background

MarineGuard AI is a sonar-based underwater object classification and anomaly detection system. It takes sonar images, runs YOLO11 inference, scores anomalies with a heuristic composite scorer, and presents results through a React + Vite dashboard. The core goal is **helping operators quickly identify and classify man-made objects** on the seabed.

---

## Full Audit Summary

### ✅ What's Working Well
- Clean architecture: preprocessing → detection → anomaly scoring → geotagging pipeline
- YOLO + MockDetector fallback pattern is solid
- Glassmorphism dark marine-tech UI aesthetic is visually strong
- Backend supports single image, batch, and ZIP upload
- Live simulation, detection history, geo map, model status pages all exist

---

### 🔴 Critical Gaps (Functionality)

**1. Detection History is non-functional after page reload**
All detections are stored **in-memory** in `_detections: List[dict]` in `routes.py`. Any server restart wipes all history. There is no persistence layer whatsoever — no database, no file-based store.

**2. Search & Filter in Detection History are UI-only shells**
The Search input and Filter button in `DetectionHistory.jsx` render but do nothing — no `onChange` handler, no filtering logic is wired up on the frontend.

**3. The Anomaly Score Breakdown is never shown to the user**
The backend computes a rich 5-component breakdown (AI confidence, shadow evidence, shape, texture, image quality) and returns it as `anomaly_details`. The frontend completely ignores this data — users only see the final `anomaly_pct` number with no explanation of *why* an object was scored that way.

**4. No Classification Confidence Visualization**
The detection cards only show a raw percentage string (e.g. `87.3%`). There is no visual indicator (progress bar, ring) that helps operators quickly gauge certainty, especially important for 11-class classification.

**5. Batch/ZIP upload exists in the backend but not the frontend**
`/api/analyze/batch` and `/api/analyze/zip` endpoints are fully implemented but completely absent from the UI.

**6. Live Simulation runs at 1 FPS with no speed control**
The interval is hardcoded to `1000ms` with no UI option to increase/decrease playback speed.

**7. MapView has no interaction / filtering**
There is no way to filter map markers by severity, class, or time range. With many detections, the map becomes an indistinguishable cluster.

---

### 🟡 Design & UX Issues

**8. Dashboard is nearly empty — no charts**
The Dashboard only shows 5 KPI numbers. There are no visualizations of detection distribution, severity breakdown over time, or per-class counts, making it useless as an operational overview.

**9. Classification result lacks visual identity per class**
Each of the 11 classes (mine, can, bottle, tire, chain...) renders identically — same icon, same font, same color. High-priority objects like "mine" look identical to "bottle". Adding per-class icons or color-coding would dramatically improve operator identification speed.

**10. No "Result Detail" drilldown view**
Clicking a detection row in History or an alert in Live Simulation does nothing. There is no way to open a detail panel showing the annotated image, bounding box info, anomaly breakdown, and geo coordinates together.

**11. No visual feedback for analysis processing stages**
During `analyzeImage`, users see a spinning loader. There is no staged progress indicator (Uploading → Preprocessing → Inferring → Scoring) that would help operators understand what's happening.

**12. Model Status page is passive/static**
It shows model config but has no live inference benchmark ("Run Benchmark") button, no per-class accuracy indicators from training, and no way to adjust the confidence threshold live.

---

## Proposed Changes

### Phase 0 — UI/UX Overhaul (Emil Kowalski / High-End Design System)

> Deliver a sophisticated, world-class UI inspired by Linear, Vercel, and Emil Kowalski's work. This means buttery smooth spring animations, subtle borders, perfect shadows, and premium interactions.

#### 1. Core UI Libraries & Theming
- **Install `sonner`**: For impeccable, smooth toast notifications on file uploads, analysis completion, and errors.
- **Install `vaul`**: For the `DetectionDetailModal`, providing a fluid, mobile-friendly drawer/bottom-sheet experience that scales beautifully to desktop.
- **Refine `index.css`**: Update the dark mode color palette. Move to a deep, sophisticated dark (`#09090B` background, `#FAFAFA` text) with subtle `border-white/10` borders, `backdrop-blur-xl` frosted glass, and sophisticated glow effects for critical alerts.

#### 2. Advanced Micro-Interactions (Framer Motion)
- **Layout Animations**: When filtering or searching the `DetectionHistory`, use Framer Motion's `<motion.ul layout>` so items elegantly slide into their new positions instead of jarringly disappearing.
- **Spring Physics**: Replace standard CSS transitions with spring physics (`type: "spring", stiffness: 400, damping: 30`) for hovers, clicks, and page transitions to make the app feel alive.
- **View Transitions**: Use `AnimatePresence` to crossfade smoothly between Dashboard, History, and Map views.

---

### Phase 1 — Fix Functionality (High Impact, Core)

---

#### A. Detection Persistence (SQLite)

> Fix the data loss on server restart. Use SQLite via `aiosqlite` so no external DB is needed.

##### [MODIFY] `backend/api/routes.py`
- Replace the `_detections: List[dict]` in-memory store with calls to a new persistence service
- On startup, load existing detections from the DB
- On each new detection, write to DB

##### [NEW] `backend/database/store.py`
- SQLite-backed detection store using `sqlite3` (sync, no new deps)
- `init_db()`, `insert_detection()`, `get_detections(limit, offset, filters)`, `get_stats()`
- DB file saved to `reports/detections.db`

---

#### B. Wire up Search & Filter in Detection History

##### [MODIFY] `frontend/src/pages/DetectionHistory.jsx`
- Add `searchTerm`, `severityFilter`, `classFilter` state
- `onChange` on the search input → filter `detections` array client-side
- Filter button → dropdown with severity options (ALL / LOW / SUSPICIOUS / HIGH / CRITICAL)
- Show count of filtered vs total results

---

#### C. Anomaly Score Breakdown Panel

##### [MODIFY] `frontend/src/pages/SonarAnalysis.jsx`
- When a detection is selected, show a new `<AnomalyBreakdown>` panel
- Display the 5 components as labeled progress bars with weight labels
- Use the `anomaly_details.components` data already returned by the backend

##### [NEW] `frontend/src/components/AnomalyBreakdown.jsx`
- Reusable component: receives `components` dict, renders a stacked bar chart breakdown
- Color-coded by contribution magnitude

---

#### D. Batch / ZIP Upload UI

##### [MODIFY] `frontend/src/pages/SonarAnalysis.jsx`
- Add a tab toggle: `Single Image | Batch Upload | ZIP Archive`
- Single: existing drag-and-drop
- Batch: multi-file input (`multiple` attribute), shows file list with remove buttons
- ZIP: single .zip file upload
- After batch/zip analysis, show a summary table of all results

---

### Phase 2 — Improve Classification UX (High Impact, Visual)

---

#### E. Per-Class Icons & Color Coding

> The most impactful visual change for the core use case. Operators need to instantly recognize object types.

##### [NEW] `frontend/src/utils/classConfig.js`
```js
// Maps each of the 11 YOLO classes to a display color, icon name, and risk level
export const CLASS_CONFIG = {
  mine:            { color: '#ff0055', icon: 'Bomb',         risk: 'critical' },
  can:             { color: '#00d4ff', icon: 'Trash2',       risk: 'low' },
  bottle:          { color: '#00d4ff', icon: 'Trash2',       risk: 'low' },
  'drink-carton':  { color: '#00d4ff', icon: 'Package',      risk: 'low' },
  chain:           { color: '#ffb800', icon: 'Link',         risk: 'medium' },
  propeller:       { color: '#ffb800', icon: 'Wind',         risk: 'medium' },
  tire:            { color: '#8b9bb4', icon: 'Circle',       risk: 'low' },
  hook:            { color: '#ff5e00', icon: 'Anchor',       risk: 'high' },
  valve:           { color: '#ff5e00', icon: 'Settings',     risk: 'high' },
  'shampoo-bottle':{ color: '#00d4ff', icon: 'Droplets',     risk: 'low' },
  'standing-bottle':{ color: '#00d4ff', icon: 'Trash2',     risk: 'low' },
};
```

##### [MODIFY] `frontend/src/pages/SonarAnalysis.jsx`, `DetectionHistory.jsx`, `LiveSimulation.jsx`
- Replace plain uppercase class name text with `<ClassBadge>` component
- ClassBadge shows: colored icon + class name + risk indicator

##### [NEW] `frontend/src/components/ClassBadge.jsx`
- Receives `className` prop, looks up `CLASS_CONFIG`, renders icon + label

---

#### F. Confidence Visualization — Radial / Bar Indicators

##### [MODIFY] `frontend/src/pages/SonarAnalysis.jsx`
- Replace raw `87.3%` text in detection cards with a small SVG arc/ring meter
- Show both AI confidence and anomaly score as visual rings side-by-side

##### [NEW] `frontend/src/components/ConfidenceRing.jsx`
- SVG-based circular progress indicator, animated with CSS stroke-dashoffset
- Color interpolates: green (low) → orange (mid) → red (high)

---

#### G. Detection Detail Drilldown Panel / Modal

> One of the most requested UX patterns for any inspection tool — clicking a detection should open full context. We will use **Vaul** to render this as a gorgeous, interactive drawer.

##### [NEW] `frontend/src/components/DetectionDetailModal.jsx`
- Triggered by clicking any detection row (History) or alert card (Live)
- Built using `vaul` for a buttery smooth drag-to-dismiss drawer experience.
- Shows:
  - Annotated image thumbnail (from `annotated_image` b64 stored with detection)
  - Full anomaly score breakdown (using `<AnomalyBreakdown>`)
  - Geo coordinates on a mini-map (Leaflet)
  - Class badge + confidence ring
  - Copy-to-clipboard detection ID
  - Download annotated image button

##### [MODIFY] `frontend/src/pages/DetectionHistory.jsx`
- Row click → opens `<DetectionDetailModal>`
- Store annotated image b64 in detection records (backend already returns it per-frame)

##### [MODIFY] `backend/api/routes.py`
- Include `annotated_image` field in individual detection store records (currently only returned in analyze response, not stored per-detection)

---

### Phase 3 — Dashboard Visualization & Live Feed

---

#### H. Dashboard Charts

##### [MODIFY] `frontend/src/pages/Dashboard.jsx`
- Add a class distribution donut/bar chart using **Recharts** (already a common Vite dep, or add it)
- Add a severity timeline chart (detections per severity over last N frames)
- Add a "Top Detected Classes" ranked list with class badges

##### Required: install `recharts`
```bash
cd frontend && npm install recharts
```

---

#### I. Live Simulation Speed Control & Stats Overlay

##### [MODIFY] `frontend/src/pages/LiveSimulation.jsx`
- Add a speed selector: 0.5x / 1x / 2x / 4x (controls the interval ms)
- Add a live stats bar at top: total detections this session, unique classes seen, last alert time
- History panel: clicking an alert opens `<DetectionDetailModal>`

---

#### J. Map Filtering

##### [MODIFY] `frontend/src/pages/MapView.jsx`
- Add a filter sidebar: severity checkboxes (CRITICAL / HIGH / SUSPICIOUS / LOW), class dropdown
- Filter is applied client-side on the `geoData` array
- Add a legend in the bottom-left corner with color → severity mapping
- Fit map bounds to filtered markers automatically

---

### Phase 4 — Polish

---

#### K. Multi-stage Analysis Progress

##### [MODIFY] `frontend/src/pages/SonarAnalysis.jsx`
- Replace single spinner with a 4-step progress stepper:
  `[1] Uploading → [2] Preprocessing → [3] Inferring → [4] Scoring`
- Steps advance with fake timing (200ms, 500ms, then real inference time)
- Each step shows a checkmark when complete

---

#### L. Model Status — Live Benchmark

##### [MODIFY] `frontend/src/pages/ModelStatus.jsx`
- Add "Run Benchmark" button → calls `/api/analyze/image` with a built-in test image
- Shows inference time result as a gauge
- Add per-class display with icons (using `classConfig.js`)

##### [MODIFY] `backend/api/routes.py`
- Add `GET /api/model/benchmark` endpoint that runs inference on a small test image and returns timing

---

## Implementation Order

| Priority | Change | Files | Impact |
|---|---|---|---|
| 🟣 P0 | UI/UX Overhaul (Sonner, Vaul, Theming) | `index.css`, `package.json`, layout wrappers | World-class aesthetic |
| 🔴 P1 | Wire Search/Filter (DetectionHistory) | `DetectionHistory.jsx` | Fix broken UI |
| 🔴 P1 | Anomaly Breakdown Panel | `SonarAnalysis.jsx`, new `AnomalyBreakdown.jsx` | Core feature gap |
| 🔴 P1 | Per-class icons & ClassBadge | new `classConfig.js`, `ClassBadge.jsx`, 3 pages | Core identification |
| 🔴 P1 | Confidence Ring visualizer | new `ConfidenceRing.jsx`, `SonarAnalysis.jsx` | Core classification UX |
| 🟡 P2 | Detection Detail Modal | new `DetectionDetailModal.jsx`, `DetectionHistory.jsx`, `LiveSimulation.jsx` | Major UX win |
| 🟡 P2 | Dashboard Charts (Recharts) | `Dashboard.jsx`, install recharts | Operational value |
| 🟡 P2 | Batch/ZIP Upload UI | `SonarAnalysis.jsx` | Feature completeness |
| 🟢 P3 | Live Sim speed control | `LiveSimulation.jsx` | Nice to have |
| 🟢 P3 | Map filtering & legend | `MapView.jsx` | Nice to have |
| 🟢 P3 | SQLite persistence | new `backend/database/store.py`, `routes.py` | Data integrity |
| 🟢 P3 | Multi-stage progress | `SonarAnalysis.jsx` | Polish |
| 🟢 P3 | Model benchmark | `ModelStatus.jsx`, `routes.py` | Polish |

---

## Verification Plan

### Manual Verification
1. Upload a sonar image → confirm anomaly breakdown panel appears with 5 labeled bars
2. Confirm "mine" class renders with red Bomb icon vs "bottle" with cyan Trash icon
3. Click a detection row in History → confirm detail modal opens with annotated image
4. Use search box in History → confirm table filters live
5. Dashboard → confirm donut chart reflects detection data
6. Live Sim → change speed to 4x → confirm frame rate changes

### No Breaking Changes
- All existing API endpoints are unchanged — only additive modifications
- MockDetector fallback still works if no weights are present
- No new required backend dependencies (SQLite is stdlib)

