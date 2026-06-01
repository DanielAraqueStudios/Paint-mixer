# Paint Mixer — Cloud-Based Hardware/Software Solution

> ESP32 + Firebase Realtime Database · Peristaltic Pumps · L298N H-Bridge Drivers  
> Mechatronics Engineering · 7th Semester · Actuators Course · UMNG

An automated paint-color mixing system that dispenses four pigment channels (White base, Red, Green, Blue) through calibrated peristaltic pumps, then blends them with a DC mixer motor. Color orders are sent from a browser-based web UI through Firebase Realtime Database, which the ESP32 listens to in real time.

---

## System Architecture

```
┌─────────────────────┐        ┌──────────────────────┐
│   Web Browser       │        │  Firebase Realtime DB │
│  mezclador_web.html │◄──────►│  mezclador/orden      │
│  40-color palette   │  WiFi  │  mezclador/estado     │
└─────────────────────┘        └──────────┬───────────┘
                                           │ WiFi
                                 ┌─────────▼──────────┐
                                 │      ESP32          │
                                 │  mezclador_pintura  │
                                 │  .ino               │
                                 │  Calculates pump    │
                                 │  timing from ml     │
                                 └────┬───────────┬────┘
                                      │           │
                          ┌───────────▼─┐   ┌─────▼───────────┐
                          │  L298N #1   │   │   L298N #2       │
                          │ White + Red │   │ Green+Blue+Mixer │
                          └──┬───────┬──┘   └──┬────┬────┬─────┘
                             │       │          │    │    │
                          White    Red        Green Blue Mixer
                          Pump    Pump        Pump  Pump  Motor
                          12VDC  12VDC       12VDC 12VDC  12VDC
                             │       │          │    │
                             └───────┴──────────┴────┘
                                          │
                                   ┌──────▼───────┐
                                   │ Mixing Vessel │
                                   │   700 ml max  │
                                   └───────────────┘
```

---

## Hardware Components

| Component | Qty | Specs |
|---|---|---|
| ESP32 Development Board | 1 | WiFi-enabled, 3.3 V logic |
| L298N Dual H-Bridge Module | 2 | 5–46 V motor supply, 2 A per channel |
| 12 VDC Peristaltic Pump Motor | 4 | ~8 ml/s flow rate (calibrated) |
| 12 VDC DC Mixer Motor | 1 | PWM speed-controllable |
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

| File | Purpose |
|---|---|
| `HARDWARE/mezclador_pintura.ino` | Production ESP32 firmware — calibrated pump control, dispensing logic, mixer orchestration |
| `HARDWARE/mezclador_web.html` | Single-page web UI — 40-color palette, Firebase integration, order dispatch |
| `HARDWARE/CODIGO 1.txt` | Prototype / reference sketch — basic serial toggle control, alternate GPIO mapping |

---

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) and create a new project.
2. Enable **Realtime Database** (start in test mode for development).
3. Note your project credentials: **API Key**, **Database URL**, and **Project ID**.
4. Open `mezclador_web.html` in a browser.
5. Click the **config button** in the header (appears automatically on first launch).
6. Enter your credentials in the modal and click **Save**. They are stored in `localStorage`.

Required Firebase RTDB paths (created automatically on first order):

```
mezclador/
  ├── orden/
  │     ├── color       (string)  e.g. "Azul cielo"
  │     ├── ml_blanca   (number)  e.g. 436
  │     ├── ml_roja     (number)  e.g. 0
  │     ├── ml_verde    (number)  e.g. 66
  │     ├── ml_azul     (number)  e.g. 198
  │     ├── timestamp   (number)  Unix ms
  │     └── estado      (string)  "pendiente"
  └── estado            (string)  idle | recibido | mezclando | listo | error
```

---

## ESP32 Firmware Setup

### Prerequisites

- Arduino IDE 2.x or PlatformIO
- ESP32 board package: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
- Serial monitor at **115200 baud**

### Flash Steps

1. Open `HARDWARE/mezclador_pintura.ino` in Arduino IDE.
2. Select board: **ESP32 Dev Module**.
3. Adjust the flow-rate constants if you have re-calibrated your pumps (see Calibration below):
   ```cpp
   float caudal_blanca = 8.0;  // ml/s
   float caudal_roja   = 8.0;
   float caudal_verde  = 8.0;
   float caudal_azul   = 8.0;
   ```
4. Add your WiFi and Firebase credentials to the sketch (section to be completed for IoT integration — see `loop()` comment).
5. Upload and open the Serial Monitor.

> **Note:** The current firmware calls `mezclar()` directly from `setup()` as a demonstration. Full Firebase listener integration is indicated in `loop()` and should be implemented with the Firebase ESP32 library.

---

## Color System

The color catalog uses a **unit-based** formulation:

- **1 unit = 22 ml** of pigment
- **Total batch = 700 ml** per mix
- White base is **automatically calculated**: `white = 700 − (R + G + B) × 22`
- Maximum pigment per channel: 14 units = 308 ml

Example — *Azul cielo* (Sky Blue):

| Channel | Units | ml |
|---|---|---|
| White base | — | 436 (auto) |
| Red | 0 | 0 |
| Green | 3 | 66 |
| Blue | 9 | 198 |
| **Total** | | **700** |

Firmware call: `mezclar(0, 66, 198);`

---

## Usage

1. Open `mezclador_web.html` in any modern browser.
2. Connect Firebase (first-time config modal opens automatically).
3. Browse or filter the 40-color palette.
4. Click a color card — the right sidebar shows the mix recipe in ml.
5. Click **Enviar orden a la ESP32**.
6. The activity log shows real-time status updates received from the ESP32 via Firebase.

---

## Color Catalog

**Reds / Naranja**

| Color | R (units) | G (units) | B (units) | White (ml) |
|---|---|---|---|---|
| Rojo puro | 14 | 0 | 0 | 392 |
| Naranja | 10 | 4 | 0 | 392 |
| Naranja claro | 7 | 3 | 0 | 440 |
| Rojo oscuro | 11 | 1 | 1 | 370 |
| Rojo rosado | 8 | 0 | 3 | 478 |
| Rosa claro | 5 | 0 | 2 | 546 |
| Rosa fuerte | 7 | 0 | 4 | 478 |
| Salmón | 6 | 2 | 1 | 478 |
| Durazno | 5 | 3 | 1 | 501 |
| Café/Marrón | 7 | 3 | 2 | 396 |
| Café claro | 5 | 3 | 2 | 440 |
| Terracota | 9 | 2 | 1 | 392 |

**Greens**

| Color | R (units) | G (units) | B (units) | White (ml) |
|---|---|---|---|---|
| Verde puro | 0 | 14 | 0 | 392 |
| Verde lima | 3 | 10 | 0 | 414 |
| Verde oliva | 4 | 7 | 1 | 436 |
| Verde oscuro | 1 | 11 | 1 | 413 |
| Verde menta | 2 | 8 | 4 | 392 |
| Verde agua | 0 | 7 | 5 | 436 |
| Verde bosque | 1 | 9 | 2 | 436 |

**Blues**

| Color | R (units) | G (units) | B (units) | White (ml) |
|---|---|---|---|---|
| Azul puro | 0 | 0 | 14 | 392 |
| Azul cielo | 0 | 3 | 9 | 436 |
| Azul marino | 0 | 1 | 12 | 414 |
| Azul real | 1 | 2 | 10 | 413 |
| Azul turquesa | 0 | 5 | 7 | 436 |
| Azul acero | 2 | 3 | 8 | 413 |
| Azul lavanda | 4 | 2 | 7 | 413 |

**Mix (Secondary / Tertiary)**

| Color | R (units) | G (units) | B (units) | White (ml) |
|---|---|---|---|---|
| Amarillo | 8 | 8 | 0 | 348 |
| Cyan | 0 | 8 | 8 | 348 |
| Magenta | 8 | 0 | 8 | 348 |
| Morado | 6 | 0 | 6 | 436 |
| Violeta | 5 | 1 | 7 | 413 |
| Púrpura | 7 | 0 | 5 | 436 |

**Neutrals**

| Color | R (units) | G (units) | B (units) | White (ml) |
|---|---|---|---|---|
| Blanco puro | 0 | 0 | 0 | 700 |
| Gris claro | 2 | 2 | 2 | 568 |
| Gris medio | 4 | 4 | 4 | 436 |
| Gris oscuro | 6 | 6 | 6 | 304 |
| Gris azulado | 2 | 3 | 5 | 436 |
| Gris verdoso | 2 | 4 | 2 | 524 |
| Beige | 3 | 3 | 1 | 545 |
| Crema | 2 | 2 | 0 | 612 |

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

> All four pumps are assumed identical at 8.0 ml/s from the factory. Calibrate individually for best accuracy.

---

## ESP32 State Machine (Firebase `estado`)

```
          [power on]
               │
           ┌───▼───┐
           │  idle │◄──────────────────────┐
           └───┬───┘                        │
               │ order written to           │
               │ mezclador/orden            │
          ┌────▼────┐                       │
          │recibido │                       │
          └────┬────┘                       │
               │ dispensing starts          │
         ┌─────▼──────┐                     │
         │ mezclando  │                     │
         └─────┬──────┘                     │
               │ mix complete               │
           ┌───▼───┐                        │
           │ listo │────────────────────────┘
           └───────┘
               │ (on any exception)
           ┌───▼───┐
           │ error │
           └───────┘
```

---

## Serial Debug

Open the Arduino IDE Serial Monitor (or any terminal) at **115200 baud**.

A typical mix cycle log:

```
Mezclador listo.

==============================
 INICIANDO CICLO DE MEZCLA
==============================
  Blanca : 436.0 ml
  Roja   : 0.0 ml
  Verde  : 66.0 ml
  Azul   : 198.0 ml
------------------------------
  → Dispensando BLANCA: 436.0 ml  (54500 ms)
  → Dispensando VERDE: 66.0 ml  (8250 ms)
  → Dispensando AZUL: 198.0 ml  (24750 ms)

  → Mezclando por 15 segundos...
  ✓ Mezcla completada.
==============================
```

---

## Academic Credits

**Course:** Actuadores — 7th Semester, Mechatronics Engineering  
**Institution:** Universidad Militar Nueva Granada (UMNG)  
**Author:** Daniel Araque — lcdanielaraque@gmail.com  
**Repository:** [Paint-mixer-cloud-based-hardware-software-cloud-solution](https://github.com/DanielAraqueStudios)
