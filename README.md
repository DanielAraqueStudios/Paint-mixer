# Paint Mixer — Cloud-Based Hardware/Software Solution

> ESP32 + Railway Cloud · FastAPI + Embedded MQTT Broker · Peristaltic Pumps · L298N H-Bridge Drivers  
> Mechatronics Engineering · 7th Semester · Actuators Course · UMNG

An automated paint-color mixing system that dispenses four pigment channels (White base, Red, Green, Blue) through calibrated peristaltic pumps, then blends them with a DC mixer motor. Color orders are sent from a browser-based web UI to a FastAPI backend hosted on Railway, which publishes commands to an embedded MQTT broker. The ESP32 connects to the same broker over the internet to receive orders and report status.

---

## System Architecture

```
┌──────────────────────┐   HTTPS    ┌─────────────────────────────────┐
│   Browser            │◄──────────►│  Railway Cloud Service          │
│   Angular SPA        │            │  ┌─────────────┐  ┌──────────┐  │
│   paint-mixer-       │            │  │  FastAPI    │  │ Postgres │  │
│   production.up.     │            │  │  REST API   │◄►│  DB      │  │
│   railway.app        │            │  └──────┬──────┘  └──────────┘  │
└──────────────────────┘            │         │                        │
                                    │  ┌──────▼──────┐                │
                                    │  │ Embedded    │                │
                                    │  │ MQTT Broker │                │
                                    │  │ port 1884   │                │
                                    │  └──────┬──────┘                │
                                    └─────────┼────────────────────── ┘
                                              │ TCP (Railway proxy)
                                    zephyr.proxy.rlwy.net:12721
                                              │
                                    ┌─────────▼──────────┐
                                    │      ESP32          │
                                    │  mezclador_wifi.ino │
                                    │  NVS config via     │
                                    │  UART (Serial)      │
                                    └────┬───────────┬────┘
                                         │           │
                             ┌───────────▼─┐   ┌─────▼───────────┐
                             │  L298N #1   │   │   L298N #2       │
                             │ White + Red │   │ Green+Blue+Mixer │
                             └──┬───────┬──┘   └──┬────┬────┬─────┘
                                │       │          │    │    │
                             White    Red        Green Blue Mixer
                             Pump    Pump        Pump  Pump  Motor
```

---

## Hardware Components

| Component | Qty | Specs |
|---|---|---|
| ESP32 Development Board | 1 | WiFi-enabled, 3.3 V logic |
| L298N Dual H-Bridge Module | 2 | 5–46 V motor supply, 2 A per channel |
| 12 VDC Peristaltic Pump Motor | 4 | ~3.16 ml/s flow rate (calibrated) |
| 12 VDC DC Mixer Motor | 1 | Direction-controlled via H-bridge |
| 12 V Power Supply | 1 | Minimum 5 A recommended |
| 5 V Regulator / USB supply | 1 | Powering ESP32 logic |
| Tubing (food-grade) | — | Matched to pump head diameter |
| 700 ml mixing vessel | 1 | Clear container preferred |

---

## Wiring — GPIO Pin Mapping

> L298N ENA/ENB pins must be **jumpered to 5 V** (always enabled).  
> The ESP32 controls only direction via IN1–IN4 logic.

| Signal | ESP32 GPIO | L298N Board | Channel |
|---|---|---|---|
| White pump IN1 (+) | 13 | L298N #1 | A |
| White pump IN2 (−) | 12 | L298N #1 | A |
| Red pump IN1 (+) | 14 | L298N #1 | B |
| Red pump IN2 (−) | 27 | L298N #1 | B |
| Green pump IN1 (+) | 26 | L298N #2 | A |
| Green pump IN2 (−) | 25 | L298N #2 | A |
| Blue pump IN1 (+) | 33 | L298N #2 | B |
| Blue pump IN2 (−) | 32 | L298N #2 | B |
| Mixer motor IN1 (+) | 18 | L298N #2 | Extra |
| Mixer motor IN2 (−) | 19 | L298N #2 | Extra |

---

## Software Components

### Backend — `api/`

| File | Purpose |
|---|---|
| `api/main.py` | FastAPI app, embedded MQTT broker startup, REST endpoints |
| `api/broker.py` | Custom asyncio MQTT v3.1.1 broker (CONNECT/PUBLISH/SUBSCRIBE/PING) |
| `api/auth.py` | JWT auth, bcrypt password hashing, device token management |
| `api/models.py` | SQLAlchemy ORM models (User, Command, SavedColor) |
| `api/requirements.txt` | Python dependencies |

### Frontend — `web/`

Angular SPA served as static files by FastAPI. Communicates with the backend via REST API using JWT bearer tokens.

### Firmware — `HARDWARE/`

| File | Purpose |
|---|---|
| `HARDWARE/mezclador_wifi.ino` | ESP32 firmware — UART config mode, NVS credential storage, non-blocking pump state machine, MQTT client |

---

## Cloud Deployment (Railway)

The entire backend runs as a single Railway service:

- **HTTP**: `paint-mixer-production.up.railway.app` → port `8000` (FastAPI + Angular SPA)
- **MQTT TCP proxy**: `zephyr.proxy.rlwy.net:12721` → internal port `1884` (embedded MQTT broker)
- **Database**: Railway PostgreSQL (connected via `DATABASE_URL` env var)

### Required Railway Environment Variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | Railway Postgres connection string (auto-set by Railway) |
| `JWT_SECRET` | Random secret for signing JWT tokens |
| `PORT` | `8000` |
| `MQTT_PORT` | `1884` |

---

## ESP32 Firmware Setup

### Prerequisites

- Arduino IDE 2.x
- ESP32 board package: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
- Libraries: `PubSubClient`, `ArduinoJson`, `Preferences` (built-in)
- Serial monitor at **115200 baud**

### Flash & Configure

1. Open `HARDWARE/mezclador_wifi.ino` in Arduino IDE.
2. Select board: **ESP32 Dev Module**, flash the firmware.
3. Open Serial Monitor at **115200 baud**.
4. On first boot you have **3 seconds** to type `config` — or it enters config mode automatically if no credentials are stored.
5. Enter the 6 values when prompted:

| Prompt | Value |
|---|---|
| WiFi SSID | your hotspot name |
| WiFi Contraseña | your hotspot password |
| MQTT Host | `zephyr.proxy.rlwy.net` |
| MQTT Puerto | `12721` |
| MQTT Usuario | your registered email |
| MQTT Token | 32-char hex token from `/profile → Mostrar token` |

6. Credentials are saved to ESP32 flash (NVS) and survive power cycles. To reconfigure, type `config` in Serial Monitor within 3 seconds of boot.

### Getting Your Device Token

1. Register/login at `paint-mixer-production.up.railway.app`
2. Go to **Profile** (top-right menu)
3. Click **Mostrar token**
4. Copy the 32-character hex token shown under "Contraseña MQTT"

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register with email + password |
| POST | `/api/auth/login` | — | Login, receive JWT |
| GET | `/api/auth/me` | JWT | Current user info |
| GET | `/api/auth/device-token` | JWT | Get ESP32 MQTT token |
| POST | `/api/auth/device-token/regenerate` | JWT | Regenerate token |
| POST | `/api/command` | JWT | Send mix command to ESP32 |
| GET | `/api/command` | — | Get latest command |
| GET | `/api/profile` | JWT | Profile + mix history |
| POST | `/api/colors` | JWT | Save a color |
| GET | `/api/colors` | JWT | List saved colors |
| DELETE | `/api/colors/{id}` | JWT | Delete saved color |
| GET | `/api/health` | — | Service health check |

---

## MQTT Protocol

**Broker**: embedded in FastAPI process, listens on port `1884`.  
**Auth**: every client must authenticate with `username=email` and `password=deviceToken`.

| Topic | Direction | Payload |
|---|---|---|
| `mixer/command` | Server → ESP32 | `{"id":1,"color":"Azul cielo","mlBlanca":436,"mlRoja":0,"mlVerde":66,"mlAzul":198}` |
| `mixer/status` | ESP32 → Server | `{"id":1,"status":"mixing"}` |

Status values: `received` → `mixing` → `done` / `error`

---

## Pump Calibration

Run this procedure whenever a pump is replaced or if volume accuracy degrades:

1. Connect the pump output to a graduated cylinder.
2. Run the pump for exactly **10 seconds** at full speed.
3. Measure the collected volume in ml.
4. Update the constant in the firmware:
   ```cpp
   float caudal_blanca = <measured_ml> / 10.0;  // ml/s
   ```
5. Repeat for each pump channel.
6. Re-flash the firmware.

> Current calibrated value: **3.16 ml/s** per channel.

---

## Color System

- **Total batch = 700 ml** per mix
- White base fills the remainder: `mlBlanca = 700 − mlRoja − mlVerde − mlAzul`
- Maximum pigment per channel: ~308 ml

---

## Local Development

```bash
# Backend
cd api
pip install -r requirements.txt
DATABASE_URL=sqlite:///./dev.db JWT_SECRET=dev uvicorn main:app --reload --port 8000

# Frontend (Angular)
cd web
npm install
npm run build -- --configuration production
# Output lands in web/dist/web/browser — served automatically by FastAPI
```

---

## Academic Credits

**Course:** Actuadores — 7th Semester, Mechatronics Engineering  
**Institution:** Universidad Militar Nueva Granada (UMNG)  
**Author:** Daniel Araque — lcdanielaraque@gmail.com  
**Repository:** [Paint-mixer-cloud-based-hardware-software-cloud-solution](https://github.com/DanielAraqueStudios/Paint-mixer)
