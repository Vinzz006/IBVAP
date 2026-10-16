# IBVAP System Audit & Architectural Review

## 1. Architecture (10 Lines)
- **Backend API**: Python FastAPI application exposing REST endpoints and WebSocket (`/ws/alerts`) for real-time telemetry and alerts.
- **Data Layer**: SQLite database (`ibvap.db`) with SQLAlchemy ORM models managing cameras, events, vehicles, sectors, edge nodes, and audit logs.
- **Computer Vision Pipeline**: Decoupled OpenCV threaded capture & inference loop running YOLOv8n object detection and per-camera ByteTrack trackers.
- **Analytics & Defense**: Night vision detector, ANPR plate recognition, and normalized polygon ray-casting intrusion detection.
- **Evidence Ledger**: Cryptographic SHA-256 tamper-evident keyframe snapshot generator with hash provenance chaining.
- **Frontend Stack**: Single Page Application built with React 18, Vite, Tailwind CSS v3, and Lucide Icons.
- **Networking & Edge Model**: Dual central/edge state machine simulating disconnected edge nodes with idempotent sync queues.
- **Telemetry Ingestion**: MJPEG stream generator with overlaid HUD bounding boxes and live sensor status broadcasting.

---

## 2. Page & Tab Functional Audit (13 Destinations)

| Page / Tab | Component | Actual Status | What It Really Does & Issues Found |
| :--- | :--- | :--- | :--- |
| **Command Center** | [`Dashboard.jsx`](file:///c:/Users/SAI/Downloads/IBVAP/frontend/src/pages/Dashboard.jsx) | **Working (with bugs)** | 3-column live CCTV dashboard (focus & 2x2 quad view), PTZ controls, virtual fence editor, acoustic HUD, live alerts drawer. Suffers from text encoding corruption on overlays and excessive glowing neon styling. |
| **Mission Center** | [`MissionCenter.jsx`](file:///c:/Users/SAI/Downloads/IBVAP/frontend/src/pages/MissionCenter.jsx) | **Partially Broken & Fake** | Incident dispatch and lifecycle management. **Broken**: Backend `MissionService` lacks lifecycle methods (`update_mission_status`, `approve_mission_response`, `escalate_mission`, `resolve_mission`), throwing 500 errors upon operator action. **Fake**: "Primary Target ID" is a raw number input defaulting to 17; stats and sector distributions are hardcoded constants. |
| **Federated Command** | [`FederatedCommand.jsx`](file:///c:/Users/SAI/Downloads/IBVAP/frontend/src/pages/FederatedCommand.jsx) | **Completely Broken** | Multi-sector topology, edge nodes, and simulated fiber cuts. **Broken**: Backend `FederationService` is missing 9 out of 12 methods invoked by `backend/api/federation.py` (`get_federated_health`, `get_correlations`, etc.), causing 500 Internal Server Errors on load. |
| **Security Center** | [`SecurityCenter.jsx`](file:///c:/Users/SAI/Downloads/IBVAP/frontend/src/pages/SecurityCenter.jsx) | **Working** | Displays zero-trust security posture score, security events table (with acknowledge/resolve), node quarantine controls, and RBAC matrix. Highly cluttered with buzzwords and neon borders. |
| **Geospatial Map** | [`GeoSectorMap.jsx`](file:///c:/Users/SAI/Downloads/IBVAP/frontend/src/components/GeoSectorMap.jsx) | **Working** | 2D interactive SVG map displaying border fence lines, terrain, sensors, and simulated UAV flight corridors. Coordinates are hardcoded; belongs as a toggle view inside Live Monitor rather than an isolated top tab. |
| **Target Journey** | [`CrossCameraTracker.jsx`](file:///c:/Users/SAI/Downloads/IBVAP/frontend/src/components/CrossCameraTracker.jsx) | **Working (with bugs)** | Reconstructs multi-camera spatiotemporal handoff timelines. Contains transit time calculation bug (`+2131m 45s transit time`), em-dash encoding bug (`Sector A — Border Road 104`), and falls back to a hardcoded mock target when query is empty. |
| **Decision Center** | [`DecisionCenter.jsx`](file:///c:/Users/SAI/Downloads/IBVAP/frontend/src/pages/DecisionCenter.jsx) | **Working (redundant/fake)** | Decision support queue prioritizing incidents. Duplicates Incident Ledger and Mission Center functionality; relies on hardcoded `CAMERA_TO_SECTOR` mappings and artificial risk scores. |
| **Digital Twin** | [`DigitalTwin.jsx`](file:///c:/Users/SAI/Downloads/IBVAP/frontend/src/pages/DigitalTwin.jsx) | **Partially Broken** | 2D simulation canvas to inject synthetic entities (`SIM-PERSON-*`) and test failures. **Broken**: "Reset Simulation" calls `/api/simulation/reset` which returns 404. Belongs in a segregated Simulation section. |
| **Threat Analytics** | [`Analytics.jsx`](file:///c:/Users/SAI/Downloads/IBVAP/frontend/src/pages/Analytics.jsx) | **Fake Data** | Incident density histograms and target breakdown. The hourly histogram in `backend/api/system.py` is synthesized with hardcoded division formulas rather than aggregating real event timestamps. |
| **Incident Ledger** | [`EventHistory.jsx`](file:///c:/Users/SAI/Downloads/IBVAP/frontend/src/pages/EventHistory.jsx) | **Working (with bugs)** | Full event history log with SHA-256 evidence verification and CSV export. Suffers from event duplication (each loitering interval creates a duplicate row) and simulation data leakage. |
| **Privacy & Setup** | [`Settings.jsx`](file:///c:/Users/SAI/Downloads/IBVAP/frontend/src/pages/Settings.jsx) | **Working** | Camera registration, hardware health diagnostics, and privacy masking policies. Needs cleaner layout and plain human copy. |
| **Red-Team Modal** | [`RedTeamModal.jsx`](file:///c:/Users/SAI/Downloads/IBVAP/frontend/src/components/RedTeamModal.jsx) | **Working (leaks test data)** | Modal on top navbar that injects stress testing scenarios. Injects test events into production DB without filtering, polluting production queues. |
| **Shift Handover Modal** | [`ShiftHandoverModal.jsx`](file:///c:/Users/SAI/Downloads/IBVAP/frontend/src/components/ShiftHandoverModal.jsx) | **Working** | Compiles daily duty shift handover report with operator sign-off. Misplaced on top navbar instead of within operational reports. |

---

## 3. Duplicated Components & Copy-Pasted CSS

1. **Stat Cards**:
   - Re-implemented with custom markup and inline styling on 6 different pages (`Dashboard`, `MissionCenter`, `FederatedCommand`, `DecisionCenter`, `Analytics`, `SecurityCenter`).
   - Common copy-pasted pattern: `p-3 rounded-xl bg-soc-850 border border-soc-700/80 shadow-md ...` without a reusable component.
2. **Modal Windows & Drawers**:
   - 10 disparate modal implementations (`EventDetailsModal`, `IncidentReportModal`, `DispatchModal`, `DroneReconModal`, `NodeRegistrationModal`, `RedTeamModal`, `ShiftHandoverModal`, `StreamSourceModal`, `VirtualZoneEditor`, plus in-page modals in `MissionCenter`).
   - Inconsistent backdrop filters, dismiss logic, and padding.
3. **Badges & Severity Indicators**:
   - Despite [`RiskBadge.jsx`](file:///c:/Users/SAI/Downloads/IBVAP/frontend/src/components/RiskBadge.jsx) existing, custom inline badges are written across 15+ files with repetitive classes (`bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold ...`).
4. **Copy-Pasted Glows & Animations**:
   - `.glow-cyan`, `.glow-red`, `.glow-green` defined in CSS and paired with inline `shadow-[0_0_15px_rgba(...)]` across headings, cards, and buttons.
   - Pervasive `animate-tactical-pulse`, `animate-pulse`, and `animate-ping` applied simultaneously to badges, dots, and borders.
5. **Tables**:
   - Tables in `EventHistory.jsx`, `FederatedCommand.jsx`, `SecurityCenter.jsx`, and `MissionCenter.jsx` have inconsistent cell alignments, lack sticky headers, lack column sorting, and have no unified pagination or empty states.

---

## 4. Hardcoded & Fake Numbers That Should Come From Real Data

1. **`backend/services/mission_service.py`**:
   - `tactical_readiness_pct: 96.5` (hardcoded constant).
   - `avg_response_minutes: 2.4` (hardcoded constant).
   - `qrf_units_deployed: 3` and `drone_recon_active: 1` (hardcoded constants).
   - `sector_distribution: {"SEC-A": 4, "SEC-B": 9, "SEC-C": 3, "SEC-D": 2}` (static mock map).
   - `resolution_times_by_priority: {"CRITICAL": 3.1, "HIGH": 5.8, "MEDIUM": 12.4, "LOW": 20.0}` (static mock map).
   - `false_positive_rate_pct: 3.2` (hardcoded constant).
2. **`backend/api/system.py`**:
   - `hourly_histogram`: Line 584 calculates hourly counts using static multipliers on total risk counts (`risk_counts["CRITICAL"] // 2`, etc.) rather than aggregating real `Event.timestamp` data with `strftime('%H', ...)`.
   - `verified_rate: "100.0%"` (hardcoded string).
3. **`backend/api/decision.py`**:
   - `CAMERA_TO_SECTOR` and `SECTOR_METADATA` dictionaries hardcoded in file rather than deriving dynamically from database relationships.
4. **`backend/api/edge.py`**:
   - `storage_free_gb: "412.5 / 512.0 GB"` (hardcoded string).
   - Fixed edge node `EDGE-NODE-SECTOR-A` hardcoded in runtime state.
5. **`frontend/src/pages/MissionCenter.jsx`**:
   - Form field "Primary Target ID" hardcodes default `17`.
   - Stat fallback `'04m 32s'` hardcoded on resolution time card.

---

## 5. Bugs Found

1. **Overlay Text Encoding Corruption ("???????", "SECTOR M0O", "Sector A ??? Frontier")**:
   - OpenCV `cv2.putText` with `FONT_HERSHEY_SIMPLEX` only supports ASCII glyphs.
   - Files like `evidence_service.py` (Line 54), `edge.py` (Line 164), `multicamera.py` (Line 61, 149), and `privacy.py` (Line 156) pass strings containing unicode em-dashes `—`, bullets `•`, and non-ASCII characters. OpenCV renders these as `???` or garbled glyphs on video and keyframes.
2. **Missing `FederationService` Methods (500 Error Crash)**:
   - `backend/services/federation_service.py` is missing 9 methods invoked by `backend/api/federation.py`: `get_federated_health`, `get_correlations`, `generate_intelligence_graph`, `get_federated_decision_priorities`, `verify_local_evidence_on_demand`, `register_edge_node`, `process_heartbeat`, `ingest_intelligence`, `run_master_demo`. Loading Federated Command crashes with 500 errors.
3. **Missing `MissionService` Methods (500 Error Crash)**:
   - `backend/services/mission_service.py` is missing lifecycle action methods: `update_mission_status`, `assign_operator`, `get_mission_timeline`, `get_mission_context`, `approve_mission_response`, `reject_mission_response`, `escalate_mission`, `resolve_mission`, `get_mission_health`.
4. **Missing Digital Twin Reset Endpoint (404 Error)**:
   - `api.resetSimulation()` calls `POST /api/simulation/reset` which does not exist in `backend/api/simulation.py`.
5. **Incident Duplication & Cooldown Failure**:
   - `backend/services/video_processor.py` line 254 creates a brand new `Event` record every 5 seconds for any loitering object. One person in the zone produces dozens of duplicate event rows with new IDs rather than updating a single incident timeline.
6. **Transit Time Calculation Bug ("2131m 45s")**:
   - In `backend/api/events.py` line 115, transit delta `delta // 60` calculates raw total minutes across disjoint event timestamps without converting into human-readable hours and days (yielding outputs like `+2131m 45s`).
7. **Contradictory Sector vs Camera Status**:
   - Simulating network loss on a sector sets `sector.status = "OFFLINE"`, while its camera feeds remain marked `"ONLINE"` and video pipelines keep running. Status is not derived from a single authority.
8. **Test Data Leakage into Production Views**:
   - Red-team tests and digital twin scenarios insert events (`EVT-RT-*`, `EVT-SIM-*`, `[STRESS TEST]`, `[SIMULATION]`) directly into the production `events` table, corrupting metrics and alert feeds.
9. **Primary Target ID Free Number Input**:
   - Mission creation dialog uses a raw `<input type="number">` defaulting to 17 rather than a searchable selector of active tracked entities.
10. **Top-Level Navigation Overflow**:
    - 13 items crowded into the top header cause truncation and wrap on screens under 1440px wide.

---

## 6. Proposed Information Architecture (Phase 2 Consolidation)

Consolidate the 13 cluttered top-level tabs into a **calm, clean Left Sidebar** with **6 primary destinations**:

```
+------------------+-------------------------------------------------------+
| IBVAP v1.0       |                                                       |
+------------------+                                                       |
| [Monitor]        |  1. Live Monitor                                      |
| [Incidents]      |     - Video feeds (Focus / Quad 2x2 grid)             |
| [Missions]       |     - Real-time alert queue with drawer               |
| [Analytics]      |     - Integrated Map View toggle (GeoSectorMap)       |
| [Network]        |                                                       |
| [Settings]       |  2. Incidents                                         |
|                  |     - Incident Queue & Ledger                         |
| -- SIMULATION -- |     - Evidence verification & keyframe inspector     |
| [Digital Twin]   |     - Audit Trail & Shift Handover tabs               |
| [Red-Team Lab]   |                                                       |
|                  |  3. Missions                                          |
|                  |     - Tactical dispatch workflow & authorization      |
|                  |     - Searchable real target selector                 |
|                  |                                                       |
|                  |  4. Analytics                                         |
|                  |     - Incident trends & hourly breach density         |
|                  |     - Target journeys (cross-camera tracker)          |
|                  |                                                       |
|                  |  5. Network                                           |
|                  |     - Edge nodes, sector health & sync status         |
|                  |     - Zero-trust security posture                     |
|                  |                                                       |
|                  |  6. Settings                                          |
|                  |     - Camera & stream sources                         |
|                  |     - Virtual boundaries, thresholds, privacy         |
+------------------+-------------------------------------------------------+
```

### Destination Breakdown:
1. **Live Monitor** (`/monitor`, defaults from `/dashboard` and `/map`):
   - Combines CCTV grid (Focus / Quad) + Live alert drawer + **Map toggle** (GeoSectorMap directly embedded as an alternative view mode, eliminating a separate top tab).
2. **Incidents** (`/incidents`, alias for `/events` and `/decision`):
   - Incident queue with detail drawer, evidence verification, and sub-tabs for **Incident Log** and **Audit Trail**.
3. **Missions** (`/missions`):
   - Focused operational dispatch, real target dropdown, and response authorization workflows.
4. **Analytics** (`/analytics`, incorporates `/journey`):
   - Real incident statistics, hourly density, sector vulnerability, and **Target Journeys** cross-camera handoff continuity.
5. **Network** (`/network`, alias for `/federation` and `/security`):
   - Edge computing nodes, sector connectivity, sync queue, and node security status.
6. **Settings** (`/settings`):
   - Sensor inputs, virtual fence editor, sensitivity controls, and privacy masking.

### Tools & Simulation (Sidebar Bottom Section):
- **Digital Twin & Stress Testing** (`/simulation`): Dedicated sandbox for entity injection and failure testing.
- **Shift Handover Report**: Accessible via action drawer or Reports tab under Incidents.

*All previous routes will have redirect aliases to preserve compatibility.*
