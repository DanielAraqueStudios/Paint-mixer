// ============================================================
//  MEZCLADOR DE PINTURA — ESP32
//  Modo: LOCALHOST (WiFi + MQTT sin TLS)
//  Broker MQTT corre en el PC al que se conecta el hotspot.
//
//  Para modo CLOUD (AWS IoT Core + TLS):
//    1. Cambiar MQTT_SERVER al endpoint de AWS IoT
//    2. Cambiar MQTT_PORT a 8883
//    3. Agregar WiFiClientSecure + certificados AWS
// ============================================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ── Credenciales WiFi (hotspot del PC) ──────────────────────
#define WIFI_SSID   "a"
#define WIFI_PASS   "12345678"

// ── Broker MQTT (IP del PC en el hotspot — usualmente 192.168.137.1) ──
#define MQTT_SERVER "192.168.137.1"
#define MQTT_PORT   1883
#define MQTT_CLIENT "esp32-mezclador"

// ── Tópicos ──────────────────────────────────────────────────
#define TOPIC_CMD    "mixer/command"
#define TOPIC_STATUS "mixer/status"

// ── Pines L298N #1 ──────────────────────────────────────────
#define BLANCA_IN1  13
#define BLANCA_IN2  12
#define ROJA_IN1    14
#define ROJA_IN2    27

// ── Pines L298N #2 ──────────────────────────────────────────
#define VERDE_IN1   26
#define VERDE_IN2   25
#define AZUL_IN1    33
#define AZUL_IN2    32
#define MIX_IN1     18
#define MIX_IN2     19

// ── Caudales calibrados (ml/s) ───────────────────────────────
float caudal_blanca = 3.16;
float caudal_roja   = 3.16;
float caudal_verde  = 3.16;
float caudal_azul   = 3.16;

#define TIEMPO_MEZCLA   15000  // ms
#define PAUSA_BOMBAS      300  // ms between pumps

// ── Estado global ────────────────────────────────────────────
int  currentCommandId = -1;
bool busy             = false;

WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

// ── State machine ────────────────────────────────────────────
// Each step: turn pump ON for `onMs`, then OFF, wait `pauseMs`
struct Step {
  const char* nombre;
  int         in1, in2;
  unsigned long onMs;
  unsigned long pauseMs;
};

static Step   steps[5];   // blanca, roja, verde, azul, mezcla
static int    stepCount  = 0;
static int    stepIdx    = 0;
static bool   stepActive = false;   // pump is currently ON
static unsigned long stepStart = 0;

enum MixPhase { PHASE_IDLE, PHASE_PUMP_ON, PHASE_PUMP_PAUSE, PHASE_MIX_ON, PHASE_MIX_PAUSE };
static MixPhase phase = PHASE_IDLE;

// ── Helpers ───────────────────────────────────────────────────
unsigned long tiempoMs(float ml, float caudal) {
  if (caudal <= 0 || ml <= 0) return 0;
  return (unsigned long)((ml / caudal) * 1000.0);
}

void bombaON(int in1, int in2)  { digitalWrite(in1, HIGH); digitalWrite(in2, LOW); }
void bombaOFF(int in1, int in2) { digitalWrite(in1, LOW);  digitalWrite(in2, LOW); }

void publicarEstado(const char* status) {
  if (currentCommandId < 0) return;
  char payload[64];
  snprintf(payload, sizeof(payload), "{\"id\":%d,\"status\":\"%s\"}", currentCommandId, status);
  mqtt.publish(TOPIC_STATUS, payload);
  Serial.printf("[MQTT] → mixer/status: %s\n", payload);
}

// ── Start a mix sequence (non-blocking) ──────────────────────
void iniciarMezcla(float ml_blanca, float ml_roja, float ml_verde, float ml_azul) {
  Serial.println("\n==============================");
  Serial.println(" INICIANDO MEZCLA");
  Serial.printf("  Blanca: %.1f ml | Roja: %.1f ml | Verde: %.1f ml | Azul: %.1f ml\n",
                ml_blanca, ml_roja, ml_verde, ml_azul);
  Serial.println("------------------------------");

  stepCount = 0;
  if (ml_blanca > 0) steps[stepCount++] = { "BLANCA", BLANCA_IN1, BLANCA_IN2, tiempoMs(ml_blanca, caudal_blanca), PAUSA_BOMBAS };
  if (ml_roja   > 0) steps[stepCount++] = { "ROJA",   ROJA_IN1,   ROJA_IN2,   tiempoMs(ml_roja,   caudal_roja),   PAUSA_BOMBAS };
  if (ml_verde  > 0) steps[stepCount++] = { "VERDE",  VERDE_IN1,  VERDE_IN2,  tiempoMs(ml_verde,  caudal_verde),  PAUSA_BOMBAS };
  if (ml_azul   > 0) steps[stepCount++] = { "AZUL",   AZUL_IN1,   AZUL_IN2,   tiempoMs(ml_azul,   caudal_azul),   PAUSA_BOMBAS };
  // mix motor step (reuse Step struct, pauseMs unused)
  steps[stepCount++] = { "MEZCLA", MIX_IN1, MIX_IN2, TIEMPO_MEZCLA, 0 };

  stepIdx   = 0;
  stepStart = millis();
  phase     = PHASE_PUMP_ON;

  Serial.printf("  → %s: %lu ms\n", steps[0].nombre, steps[0].onMs);
  bombaON(steps[0].in1, steps[0].in2);
  publicarEstado("mixing");
}

// ── Tick — called every loop() iteration ─────────────────────
void tickMezcla() {
  if (phase == PHASE_IDLE) return;

  unsigned long now     = millis();
  unsigned long elapsed = now - stepStart;
  Step&         s       = steps[stepIdx];

  switch (phase) {

    case PHASE_PUMP_ON:
      if (elapsed >= s.onMs) {
        bombaOFF(s.in1, s.in2);
        if (s.pauseMs > 0) {
          stepStart = now;
          phase     = PHASE_PUMP_PAUSE;
        } else {
          // last step (mezcla) has no pause — go straight to done
          phase = PHASE_MIX_PAUSE;
          stepStart = now;
        }
      }
      break;

    case PHASE_PUMP_PAUSE:
      if (elapsed >= s.pauseMs) {
        stepIdx++;
        if (stepIdx >= stepCount) {
          // shouldn't happen — mezcla step has pauseMs=0
          phase = PHASE_IDLE;
          return;
        }
        Step& next = steps[stepIdx];
        // last step is the mix motor — use PHASE_MIX_ON
        if (stepIdx == stepCount - 1) {
          Serial.printf("  → %s: %lu ms\n", next.nombre, next.onMs);
          bombaON(next.in1, next.in2);
          stepStart = now;
          phase     = PHASE_MIX_ON;
        } else {
          Serial.printf("  → %s: %lu ms\n", next.nombre, next.onMs);
          bombaON(next.in1, next.in2);
          stepStart = now;
          phase     = PHASE_PUMP_ON;
        }
      }
      break;

    case PHASE_MIX_ON:
      if (elapsed >= s.onMs) {
        bombaOFF(s.in1, s.in2);
        phase     = PHASE_IDLE;
        busy      = false;
        currentCommandId = -1;
        Serial.println("  ✓ Completado.");
        Serial.println("==============================\n");
        publicarEstado("done");
      }
      break;

    default:
      break;
  }
}

// ── Callback MQTT ─────────────────────────────────────────────
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  if (busy) {
    Serial.println("[MQTT] Ocupado, orden ignorada.");
    return;
  }

  char buf[256];
  if (length >= sizeof(buf)) return;
  memcpy(buf, payload, length);
  buf[length] = '\0';

  Serial.printf("[MQTT] ← %s: %s\n", topic, buf);

  JsonDocument doc;
  if (deserializeJson(doc, buf) != DeserializationError::Ok) {
    Serial.println("[MQTT] JSON inválido");
    return;
  }

  currentCommandId = doc["id"] | -1;
  float ml_blanca  = doc["mlBlanca"] | 0.0f;
  float ml_roja    = doc["mlRoja"]   | 0.0f;
  float ml_verde   = doc["mlVerde"]  | 0.0f;
  float ml_azul    = doc["mlAzul"]   | 0.0f;

  if (ml_blanca + ml_roja + ml_verde + ml_azul > 700.1f) {
    Serial.println("ERROR: la suma supera 700 ml.");
    publicarEstado("error");
    return;
  }

  publicarEstado("received");
  busy = true;
  iniciarMezcla(ml_blanca, ml_roja, ml_verde, ml_azul);
}

// ── WiFi ─────────────────────────────────────────────────────
void conectarWiFi() {
  Serial.printf("Conectando a %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\nWiFi OK — IP: %s\n", WiFi.localIP().toString().c_str());
}

// ── MQTT ─────────────────────────────────────────────────────
void conectarMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Conectando MQTT...");
    if (mqtt.connect(MQTT_CLIENT)) {
      Serial.println(" OK");
      mqtt.subscribe(TOPIC_CMD);
      Serial.printf("Suscrito a %s\n", TOPIC_CMD);
    } else {
      Serial.printf(" fallo (rc=%d), reintentando en 3s\n", mqtt.state());
      delay(3000);
    }
  }
}

// ── Setup ─────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  int pines[] = {
    BLANCA_IN1, BLANCA_IN2, ROJA_IN1, ROJA_IN2,
    VERDE_IN1,  VERDE_IN2,  AZUL_IN1, AZUL_IN2,
    MIX_IN1,    MIX_IN2
  };
  for (int p : pines) { pinMode(p, OUTPUT); digitalWrite(p, LOW); }

  conectarWiFi();

  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(512);

  conectarMQTT();
  Serial.println("Mezclador listo — esperando órdenes MQTT.");
}

// ── Loop ─────────────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) conectarWiFi();
  if (!mqtt.connected()) conectarMQTT();
  mqtt.loop();
  tickMezcla();
}
