# IBVAP — Intelligent Border Video Analytics Platform

> **Hackathon Prototype Solution for Problem Statement 26187**  
> *Ministry of Home Affairs / Sashastra Seema Bal (SSB), Police II Division*

---

## 1. Problem Statement: The CCTV Intelligence Gap

Border security forces operate thousands of IP-based CCTV cameras along extensive, difficult-terrain frontiers. However, traditional CCTV systems suffer from critical operational limitations:
- **Operator Fatigue**: Human operators monitoring dozens of video feeds experience cognitive overload within 20 minutes, leading to missed events.
- **Dumb Feeds**: Legacy cameras passively record pixels without understanding scene context, object trajectories, or security perimeter breaches.
- **Evidence Integrity Risks**: Captured footage lacks immediate cryptographic stamping, leaving chain-of-custody vulnerable to dispute.

## 2. Solution: The IBVAP Decision Layer

**IBVAP (Intelligent Border Video Analytics Platform)** transforms existing CCTV infrastructure into an **AI-powered Border Intelligence Network**. 

Rather than replacing cameras, IBVAP adds an intelligent decision layer on top of video streams:
1. **Real-Time Detection & Persistent Tracking**: Identifies persons, vehicles, and motorbikes with stable tracking IDs (`PERSON #17`).
2. **Dynamic Virtual Fencing**: Enforces polygon-based restricted zones with automatic crossing detection.
3. **Transparent Risk Prioritization**: Computes a prototype risk score (0–100) based on clear operational rules (intrusion, night-time conditions, perimeter vector, dwell time).
4. **Instant WebSocket Alerting**: Pushes high-priority alerts with audio cues to operator terminals in sub-second time.
5. **Cryptographic Evidence Ledger**: Automatically captures incident keyframes, stamps security metadata, and generates **SHA-256 hashes** linked in a tamper-evident audit chain.

---

## 3. System Architecture

```text
                    EXISTING IP CCTV / RTSP / MP4 / WEBCAM
                                      │
                                      ▼
                           [Video Ingestion Engine]
                                      │
                                      ▼
                        [AI Detection Layer: YOLOv8]
                         ├── Person Detection
                         └── Vehicle Detection (Car, Bike, Truck, Bus)
                                      │
                                      ▼
                        [Object Tracking: ByteTrack]
                         ├── Persistent Track ID (#17)
                         └── Trajectory Breadcrumbs
                                      │
                                      ▼
                     [Virtual Fence / Polygon Analysis]
                         ├── Point-in-Polygon (cv2)
                         └── Intrusion Cooldown Debounce
                                      │
                                      ▼
                     [Transparent Rule-based Risk Engine]
                         ├── Base Target: +10
                         ├── Restricted-Zone Intrusion: +40
                         ├── Night / Low-Light Movement: +15
                         └── Perimeter Heading Vector: +20
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        [Evidence Service]                       [Alert Broadcaster]
      ├── Annotated Keyframe Stamp              └── Real-Time WebSockets
      ├── SHA-256 Hash Generation                        │
      └── Tamper Verification API                        ▼
                   │                           [FastAPI Gateway Server]
                   ▼                           (REST API + Live MJPEG)
           [SQLite / DB]                                 │
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      ▼
                     [React Tactical SOC Dashboard]
                      ├── Live CCTV Stream with AI HUD
                      ├── Interactive Virtual Fence Configurator
                      ├── Real-Time Alert Drawer & Audio Chime
                      ├── Incident Details & Evidence Inspector
                      └── Immutable Audit Trail & CSV Export
```

---

## 4. Feature Matrix

### P0 Core MVP (Fully Operational)
- [x] **Multi-Source Video Ingestion**: MP4 files, local webcam, and RTSP streams.
- [x] **YOLOv8 Real-Time Object Detection**: Detects persons, cars, motorcycles, trucks, and buses.
- [x] **ByteTrack Persistent Tracking**: Stable track IDs (`PERSON #17`) and trajectory history.
- [x] **Virtual Fence / Restricted Zone Configurator**: Operators can draw and arm polygon boundaries directly on the video canvas.
- [x] **Rule-Based Prototype Risk Scoring**: 0–100 score mapped to `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` with full factor transparency.
- [x] **Real-Time WebSocket Alerts**: Instant notification delivery with sound chime and severity badges.
- [x] **Tamper-Evident SHA-256 Evidence Capture**: Stamped snapshot generation and cryptographic integrity verification.
- [x] **Interactive Command & Control Dashboard**: Dark SOC aesthetic, high information density, responsive controls.
- [x] **Audit Trail & Role-Based Auth**: Salted PBKDF2 password hashing, JWT tokens, roles (`ADMIN`, `OPERATOR`, `VIEWER`), and comprehensive activity logging.

### P1 Advanced Capabilities
- [x] **Day / Night Lighting Classifier**: Frame luminance analysis to flag low-light/night conditions and elevate risk scoring.
- [x] **ANPR (Automatic Number Plate Recognition)**: Vehicle plate region extraction and character recognition.
- [x] **Zero-Failure Demo Engine**: 4 built-in synthetic surveillance video generators for 100% reliable evaluation.

---

## 5. Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide-React, WebSocket client.
- **Backend**: Python 3.13 / 3.11+, FastAPI, Uvicorn, WebSockets, Pydantic v2.
- **Computer Vision & AI**: OpenCV 4.x, Ultralytics YOLOv8, ByteTrack tracker.
- **Database & Security**: SQLite / SQLAlchemy, Python-Jose (JWT), PBKDF2-SHA256, SHA-256 evidence hashing.
- **DevOps & Containers**: Docker, Docker Compose, Multi-stage builds, Alpine Nginx 1.27 reverse proxy.

---

## 6. Docker Quick Start (Recommended)

Start the complete IBVAP platform (Frontend, Backend, AI Engine, Database, and WebSockets) with a single command:

```bash
# 1. Clone repository and navigate to directory
git clone https://github.com/mha-ssb/IBVAP.git
cd IBVAP

# 2. Copy environment configuration
cp .env.example .env

# 3. Launch all containerized services
docker compose up --build
```

### Access URLs:
- **Tactical SOC Command Center**: [http://localhost:5173](http://localhost:5173) *(or http://localhost:3000)*
- **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Container Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 7. Local Manual Installation (Alternative)

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Backend Installation

```bash
# Install backend dependencies
pip install -r requirements.txt

# Initialize database tables and seed default users
python -m backend.scripts.seed_db

# Start backend server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Installation

```bash
cd frontend
npm install
npm run dev
```

---

## 8. Hackathon Demo Guide & Evaluation Roles

### Preset Login Credentials
| Role | Username | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full access, camera configuration, evidence ledger |
| **Operator** | `operator` | `operator123` | Live monitoring, zone editing, incident acknowledgment |
| **Viewer** | `viewer` | `viewer123` | Read-only observation feed |

### 4 One-Click Demo Scenarios
In the left sidebar under **Hackathon Demo Scenarios**, click any scenario to test the full pipeline:
1. **Border Restricted Zone Intrusion**: Suspect enters from the perimeter and crosses the virtual boundary $\rightarrow$ generates a `CRITICAL` alert, captures a stamped snapshot, and hashes it with SHA-256.
2. **Night-Time Movement Patrol**: Analyzes frame luminance, tags `NIGHT` lighting mode, and elevates risk score for low-light movement.
3. **Vehicle Checkpoint & ANPR**: Vehicle approaches the checkpoint road $\rightarrow$ detects vehicle class and extracts plate number.
4. **Normal Perimeter Patrol**: Officer walks outside the restricted zone $\rightarrow$ tracked with low risk (`LOW (10/100)`).

### Evidence Verification & Tamper Test Walkthrough
1. When an alert fires, click **"Inspect Evidence"** in the right Alert Drawer or Incident Ledger.
2. Inspect the captured snapshot, metadata overlay, and recorded SHA-256 hash.
3. Click **"Verify Evidence Integrity"** $\rightarrow$ recalculates disk file SHA-256 and displays `VERIFIED`.
4. Click **"Simulate Tamper Test"** $\rightarrow$ modifies 1 byte on disk $\rightarrow$ click **"Verify Evidence Integrity"** again to observe instant `TAMPER DETECTED` check failure!

---

## 9. API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Authenticate user & issue JWT bearer token |
| `/api/auth/me` | `GET` | Get current logged-in user profile |
| `/api/cameras` | `GET / POST` | List all cameras or register new sensor |
| `/api/cameras/{id}/stream` | `GET` | Low-latency live MJPEG video stream with AI HUD |
| `/api/cameras/{id}/zone` | `POST` | Update restricted polygon boundary coordinates |
| `/api/events` | `GET` | Query security incidents with risk & camera filters |
| `/api/events/{id}/acknowledge`| `POST` | Acknowledge incident with operator notes |
| `/api/evidence/events/{id}/verify` | `POST` | Recompute SHA-256 hash and verify file integrity |
| `/api/evidence/events/{id}/simulate-tamper` | `POST` | Demo endpoint to simulate 1-byte alteration |
| `/api/system/stats` | `GET` | Retrieve live system FPS, latency, and active tracks |
| `/api/system/trigger-scenario` | `POST` | Switch active camera to one of 4 test scenarios |
| `/ws/alerts` | `WebSocket` | Real-time bi-directional security alert & telemetry stream |

---

## 10. Automated Tests

Run backend unit and integration tests:
```bash
python -m pytest backend/tests/
```
*Tests verify password hashing, night detection luminance math, risk engine rule scoring, point-in-polygon intrusion checks, and SHA-256 evidence hashing.*

---

## 11. Limitations & Future Scope

### Honest Limitations of Current MVP
- Single-camera tracking rather than multi-camera re-identification (Re-ID).
- Prototype risk weights are rule-based indicators, not probabilistic threat models.
- Edge TPU / Jetson embedded optimization is designed in software but tested on standard CPU/GPU.

### Future Roadmap
- **Edge Deployment**: Containerized deployment on NVIDIA Jetson Orin / Intel OpenVINO edge hardware at remote border posts.
- **Multimodal Sensor Fusion**: Integration with thermal/infrared cameras, seismic ground sensors, and perimeter radar.
- **Hierarchical Command & Control (C2)**: Secure sync between Forward Outposts, Sector Headquarters, and Central SSB Command.
- **Decentralized Provenance Ledger**: Distributed ledger integration for multi-agency tamper-evident evidence sharing.

---

## 12. Human-in-the-Loop AI Ethics Statement

IBVAP is designed strictly as an **AI decision-support layer** for human operators. The system detects visual events, highlights restricted-zone breaches, prioritizes incidents by risk, and cryptographically preserves evidence. It **never** claims autonomous determination of criminal intent or automated engagement without human authorization.
