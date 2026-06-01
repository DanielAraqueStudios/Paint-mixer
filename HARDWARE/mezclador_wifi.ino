// ============================================================
//  MEZCLADOR DE PINTURA — ESP32
//  Credenciales WiFi y MQTT se ingresan por UART (Serial Monitor)
//  y se guardan en flash (NVS) con la librería Preferences.
//
//  Primer arranque o CONFIG_MODE:
//    Abre Serial Monitor a 115200 y sigue las instrucciones.
//  Arranques siguientes usan los valores guardados.
//  Para reconfigurar: escribe "config" en el Serial Monitor.
// ============================================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

// ── Tópicos ──────────────────────────────────────────────────
#define TOPIC_CMD    "mixer/command"
#define TOPIC_STATUS "mixer/status"
#define MQTT_CLIENT  "esp32-mezclador"

// ── Pines L298N #1 ──────────────────────────────────────────
#define BLANCA_IN1  23
#define BLANCA_IN2  22
#define ROJA_IN1    17
#define ROJA_IN2    16

// ── Pines L298N #2 ──────────────────────────────────────────
#define VERDE_IN1   21
#define VERDE_IN2   19
#define AZUL_IN1    18
#define AZUL_IN2    5
#define MIX_IN1     26
#define MIX_IN2     27
#define ENM         15  // PWM mezclador

// ── Caudales calibrados (ml/s) ───────────────────────────────
float caudal_blanca = 3.16;
float caudal_roja   = 3.16;
float caudal_verde  = 3.16;
float caudal_azul   = 3.16;

#define TIEMPO_MEZCLA   15000
#define PAUSA_BOMBAS      300

// ── Estado global ────────────────────────────────────────────
int  currentCommandId = -1;
bool busy             = false;

Preferences prefs;
WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

// ── Config stored in NVS ─────────────────────────────────────
char cfg_ssid[64];
char cfg_pass[64];
char cfg_host[128];
int  cfg_port;
char cfg_user[128];   // email
char cfg_token[64];   // 32-char hex token

// ── State machine ────────────────────────────────────────────
struct Step {
  const char* nombre;
  int         in1, in2;
  unsigned long onMs;
  unsigned long pauseMs;
};

static Step   steps[5];
static int    stepCount  = 0;
static int    stepIdx    = 0;
static unsigned long stepStart = 0;

enum MixPhase { PHASE_IDLE, PHASE_PUMP_ON, PHASE_PUMP_PAUSE, PHASE_MIX_ON };
static MixPhase phase = PHASE_IDLE;

// ── UART helpers ─────────────────────────────────────────────
String readLine(const char* prompt) {
  Serial.print(prompt);
  Serial.flush();
  String line = "";
  while (true) {
    if (Serial.available()) {
      char c = Serial.read();
      if (c == '\n' || c == '\r') {
        if (line.length() > 0) { Serial.println(); return line; }
      } else {
        line += c;
        Serial.print(c);
      }
    }
  }
}

// ── Config mode ──────────────────────────────────────────────
void runConfigMode() {
  Serial.println("\n╔══════════════════════════════════╗");
  Serial.println("║     MODO CONFIGURACIÓN UART      ║");
  Serial.println("╚══════════════════════════════════╝");
  Serial.println("Ingresa los valores a continuación.\n");

  String s;

  s = readLine("WiFi SSID          : ");  s.toCharArray(cfg_ssid, sizeof(cfg_ssid));
  s = readLine("WiFi Contraseña    : ");  s.toCharArray(cfg_pass, sizeof(cfg_pass));
  s = readLine("MQTT Host (Railway): ");  s.toCharArray(cfg_host, sizeof(cfg_host));
  s = readLine("MQTT Puerto        : ");  cfg_port = s.toInt();
  s = readLine("MQTT Usuario (email): "); s.toCharArray(cfg_user, sizeof(cfg_user));
  s = readLine("MQTT Token (32 hex): ");  s.toCharArray(cfg_token, sizeof(cfg_token));

  prefs.begin("mixer", false);
  prefs.putString("ssid",  cfg_ssid);
  prefs.putString("pass",  cfg_pass);
  prefs.putString("host",  cfg_host);
  prefs.putInt   ("port",  cfg_port);
  prefs.putString("user",  cfg_user);
  prefs.putString("token", cfg_token);
  prefs.end();

  Serial.println("\n✔ Configuración guardada en flash.");
  Serial.println("Reiniciando...\n");
  delay(1000);
  ESP.restart();
}

// ── Load config ───────────────────────────────────────────────
bool loadConfig() {
  prefs.begin("mixer", true);
  String ssid  = prefs.getString("ssid",  "");
  String pass  = prefs.getString("pass",  "");
  String host  = prefs.getString("host",  "");
  int    port  = prefs.getInt   ("port",  0);
  String user  = prefs.getString("user",  "");
  String token = prefs.getString("token", "");
  prefs.end();

  if (ssid.isEmpty() || host.isEmpty() || user.isEmpty() || token.isEmpty()) return false;

  ssid.toCharArray(cfg_ssid,  sizeof(cfg_ssid));
  pass.toCharArray(cfg_pass,  sizeof(cfg_pass));
  host.toCharArray(cfg_host,  sizeof(cfg_host));
  cfg_port = port;
  user.toCharArray(cfg_user,  sizeof(cfg_user));
  token.toCharArray(cfg_token, sizeof(cfg_token));
  return true;
}

// ── Helpers ───────────────────────────────────────────────────
unsigned long tiempoMs(float ml, float caudal) {
  if (caudal <= 0 || ml <= 0) return 0;
  return (unsigned long)((ml / caudal) * 1000.0);
}

void bombaON(int in1, int in2)      { digitalWrite(in1, HIGH); digitalWrite(in2, LOW); }
void bombaOFF(int in1, int in2)     { digitalWrite(in1, LOW);  digitalWrite(in2, LOW); }
void mezcladorON(int in1, int in2)  { digitalWrite(in1, HIGH); digitalWrite(in2, LOW); ledcWrite(ENM, 100); }
void mezcladorOFF(int in1, int in2) { digitalWrite(in1, LOW);  digitalWrite(in2, LOW); ledcWrite(ENM, 0); }

void publicarEstado(const char* status) {
  if (currentCommandId < 0) return;
  char payload[64];
  snprintf(payload, sizeof(payload), "{\"id\":%d,\"status\":\"%s\"}", currentCommandId, status);
  mqtt.publish(TOPIC_STATUS, payload);
  Serial.printf("[MQTT] → mixer/status: %s\n", payload);
}

// ── Mix sequence ─────────────────────────────────────────────
void iniciarMezcla(float ml_blanca, float ml_roja, float ml_verde, float ml_azul) {
  Serial.println("\n==============================");
  Serial.println(" INICIANDO MEZCLA");
  Serial.printf("  Blanca: %.1f | Roja: %.1f | Verde: %.1f | Azul: %.1f ml\n",
                ml_blanca, ml_roja, ml_verde, ml_azul);
  Serial.println("------------------------------");

  stepCount = 0;
  if (ml_blanca > 0) steps[stepCount++] = { "BLANCA", BLANCA_IN1, BLANCA_IN2, tiempoMs(ml_blanca, caudal_blanca), PAUSA_BOMBAS };
  if (ml_roja   > 0) steps[stepCount++] = { "ROJA",   ROJA_IN1,   ROJA_IN2,   tiempoMs(ml_roja,   caudal_roja),   PAUSA_BOMBAS };
  if (ml_verde  > 0) steps[stepCount++] = { "VERDE",  VERDE_IN1,  VERDE_IN2,  tiempoMs(ml_verde,  caudal_verde),  PAUSA_BOMBAS };
  if (ml_azul   > 0) steps[stepCount++] = { "AZUL",   AZUL_IN1,   AZUL_IN2,   tiempoMs(ml_azul,   caudal_azul),   PAUSA_BOMBAS };
  steps[stepCount++] = { "MEZCLA", MIX_IN1, MIX_IN2, TIEMPO_MEZCLA, 0 };

  stepIdx   = 0;
  stepStart = millis();
  phase     = (stepCount == 1) ? PHASE_MIX_ON : PHASE_PUMP_ON;

  Serial.printf("  → %s: %lu ms\n", steps[0].nombre, steps[0].onMs);
  if (stepCount == 1) mezcladorON(steps[0].in1, steps[0].in2);
  else                bombaON(steps[0].in1, steps[0].in2);
  publicarEstado("mixing");
}

void tickMezcla() {
  if (phase == PHASE_IDLE) return;

  unsigned long now     = millis();
  unsigned long elapsed = now - stepStart;
  Step&         s       = steps[stepIdx];

  switch (phase) {
    case PHASE_PUMP_ON:
      if (elapsed >= s.onMs) {
        bombaOFF(s.in1, s.in2);
        if (s.pauseMs > 0) { stepStart = now; phase = PHASE_PUMP_PAUSE; }
        else               { stepStart = now; phase = PHASE_IDLE; busy = false; currentCommandId = -1;
                             Serial.println("  ✓ Completado.\n==============================\n");
                             publicarEstado("done"); }
      }
      break;

    case PHASE_PUMP_PAUSE:
      if (elapsed >= s.pauseMs) {
        stepIdx++;
        if (stepIdx >= stepCount) { phase = PHASE_IDLE; return; }
        Step& next = steps[stepIdx];
        Serial.printf("  → %s: %lu ms\n", next.nombre, next.onMs);
        stepStart = now;
        if (stepIdx == stepCount - 1) {
          mezcladorON(next.in1, next.in2);
          phase = PHASE_MIX_ON;
        } else {
          bombaON(next.in1, next.in2);
          phase = PHASE_PUMP_ON;
        }
      }
      break;

    case PHASE_MIX_ON:
      if (elapsed >= s.onMs) {
        mezcladorOFF(s.in1, s.in2);
        phase = PHASE_IDLE; busy = false; currentCommandId = -1;
        Serial.println("  ✓ Completado.\n==============================\n");
        publicarEstado("done");
      }
      break;

    default: break;
  }
}

// ── MQTT callback ─────────────────────────────────────────────
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  if (busy) { Serial.println("[MQTT] Ocupado, orden ignorada."); return; }

  char buf[256];
  if (length >= sizeof(buf)) return;
  memcpy(buf, payload, length); buf[length] = '\0';
  Serial.printf("[MQTT] ← %s: %s\n", topic, buf);

  JsonDocument doc;
  if (deserializeJson(doc, buf) != DeserializationError::Ok) {
    Serial.println("[MQTT] JSON inválido"); return;
  }

  currentCommandId = doc["id"] | -1;
  float ml_blanca  = doc["mlBlanca"] | 0.0f;
  float ml_roja    = doc["mlRoja"]   | 0.0f;
  float ml_verde   = doc["mlVerde"]  | 0.0f;
  float ml_azul    = doc["mlAzul"]   | 0.0f;

  if (ml_blanca + ml_roja + ml_verde + ml_azul > 700.1f) {
    Serial.println("ERROR: suma > 700 ml"); publicarEstado("error"); return;
  }

  publicarEstado("received");
  busy = true;
  iniciarMezcla(ml_blanca, ml_roja, ml_verde, ml_azul);
}

// ── WiFi ─────────────────────────────────────────────────────
void conectarWiFi() {
  Serial.printf("Conectando a %s", cfg_ssid);
  WiFi.begin(cfg_ssid, cfg_pass);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.printf("\nWiFi OK — IP: %s\n", WiFi.localIP().toString().c_str());
}

// ── MQTT ─────────────────────────────────────────────────────
void conectarMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Conectando MQTT...");
    if (mqtt.connect(MQTT_CLIENT, cfg_user, cfg_token)) {
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
  delay(500);

  int pines[] = {
    BLANCA_IN1, BLANCA_IN2, ROJA_IN1, ROJA_IN2,
    VERDE_IN1,  VERDE_IN2,  AZUL_IN1, AZUL_IN2,
    MIX_IN1,    MIX_IN2
  };
  for (int p : pines) { pinMode(p, OUTPUT); digitalWrite(p, LOW); }
  ledcAttach(ENM, 1000, 8);
  ledcWrite(ENM, 0);

  // Check for config mode: send any char within 3 s, or no config stored
  Serial.println("\nEscribe 'config' en 3 s para reconfigurar...");
  unsigned long t0 = millis();
  String incoming = "";
  while (millis() - t0 < 3000) {
    if (Serial.available()) {
      char c = Serial.read();
      if (c != '\n' && c != '\r') incoming += c;
    }
  }
  bool forceConfig = (incoming.indexOf("config") >= 0);

  if (forceConfig || !loadConfig()) {
    runConfigMode();  // restarts after saving
  }

  Serial.println("──────────────────────────────────");
  Serial.printf("SSID : %s\n", cfg_ssid);
  Serial.printf("Host : %s:%d\n", cfg_host, cfg_port);
  Serial.printf("User : %s\n", cfg_user);
  Serial.println("──────────────────────────────────");

  conectarWiFi();

  mqtt.setServer(cfg_host, cfg_port);
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
