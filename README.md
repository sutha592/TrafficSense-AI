# 🚦 TrafficSense AI — Smart Urban Traffic Management System

> A full-stack, AI-powered traffic monitoring and management dashboard built for real-world urban intersections. Features live vehicle detection using YOLOv8, adaptive signal control, emergency handling, and automated reporting — all in a modern React + FastAPI stack.

---

## ✨ Features

- **Real-Time Dashboard** — Live vehicle counts, congestion index, average wait times, and AI response metrics across 8 junctions
- **YOLOv8 Vehicle Detection** — Browser-side ONNX inference using the YOLOv8n model to detect and classify vehicles from camera feeds
- **Adaptive Signal Control** — AI-driven traffic light phase switching based on live vehicle density per direction (N/S/E/W)
- **Emergency Mode** — Automatic ambulance detection with priority green-light routing
- **Weather-Aware Logic** — Rain mode increases wait-time estimates and adjusts junction status in real time
- **SOS Junction Handling** — Instantly flags and blocks a junction from the backend state
- **Analytics Page** — Historical traffic trends, hourly breakdowns, and predictive analytics
- **Live Monitoring** — System logs, camera feed simulation, and junction health grid
- **Scheduled Email Reports** — Auto-exports daily traffic status reports via SMTP at a user-configured time
- **Settings Panel** — Configure email, notification preferences, and export schedules

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI Components | shadcn/ui, Tailwind CSS, Lucide Icons |
| AI / ML | YOLOv8n (ONNX), ONNX Runtime Web |
| Backend | Python, FastAPI |
| Scheduling | APScheduler |
| Email | SMTP (Gmail-compatible) |
| Maps | Leaflet / Custom Traffic Map Component |
| State | React Hooks, Custom real-time data hooks |

---

## 📁 Project Structure

```
├── backend/
│   ├── main.py          # FastAPI server — junctions, logs, state, email APIs
│   └── config.py        # SMTP credentials config
│
├── public/
│   └── yolov8n.onnx     # YOLOv8 nano model (ONNX format)
│
└── src/
    ├── pages/
    │   ├── Dashboard.tsx    # Main overview with live metrics & junction table
    │   ├── Monitoring.tsx   # Camera feeds, traffic lights, system logs
    │   ├── Analytics.tsx    # Charts, trends, predictive data
    │   └── Settings.tsx     # Email config, notification preferences
    ├── components/
    │   ├── TrafficMap.tsx   # Interactive map with junction overlays
    │   ├── Header.tsx
    │   └── Sidebar.tsx
    ├── hooks/
    │   └── useRealtimeData.ts  # Custom hooks for live traffic metrics
    ├── utils/
    │   └── yoloUtils.ts     # YOLOv8 preprocessing & bounding box parsing
    └── data/
        └── indianTrafficData.ts  # Tirunelveli junction & intersection data
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+

### 1. Clone the repository

```bash
git clone https://github.com/your-username/trafficsense-ai.git
cd trafficsense-ai
```

### 2. Start the Backend

```bash
cd backend
pip install fastapi uvicorn apscheduler pydantic
uvicorn backend.main:app --reload --port 8000
```

> Set your SMTP credentials in `backend/config.py` for email reports.

### 3. Start the Frontend

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/logs` | Fetch latest 50 system logs |
| POST | `/api/logs` | Append a new log entry |
| GET | `/api/junctions` | Get live junction status (rain/SOS aware) |
| GET | `/api/state` | Get current global state (rain, SOS) |
| POST | `/api/state` | Update rain mode or SOS junction |
| GET | `/api/settings/email` | Get email/export settings |
| POST | `/api/settings/email` | Update email settings & reschedule report |

---

## 🧠 How YOLOv8 Detection Works

1. A video frame or camera snapshot is captured in the browser
2. The image is **preprocessed to 640×640** with letterbox padding
3. The **YOLOv8n ONNX model** runs inference entirely in-browser using ONNX Runtime Web
4. Bounding boxes are parsed, filtered by confidence threshold, and NMS is applied
5. Detected vehicle classes (car, bus, truck, motorcycle) are counted per direction and used to trigger signal phase changes

---

## 📊 Junction Coverage (Tirunelveli)

- Vannarpettai Signal
- Tirunelveli Junction
- Murugankurichi Signal
- New Bus Stand
- Tirunelveli Town
- KTC Nagar Intersection
- Thachanallur Bypass
- Palayamkottai Market

---

## 📬 Automated Email Reports

Configure a daily report schedule from the Settings panel. The backend uses APScheduler to send a formatted traffic summary email via SMTP at the specified time each day.

---

## 📄 License

MIT License — free to use and modify.

---

## 🙋 Author

Built with ❤️ — feel free to connect on [LinkedIn](https://linkedin.com/in/your-profile) or [GitHub](https://github.com/your-username).
