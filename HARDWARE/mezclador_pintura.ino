// ============================================================
//  MEZCLADOR DE PINTURA - ESP32
//  Hardware: 2x L298N doble
//
//  L298N #1 → Bomba BLANCA (canal A) + Bomba ROJA (canal B)
//  L298N #2 → Bomba VERDE  (canal A) + Bomba AZUL  (canal B)
//  Motor MEZCLADOR → usa ENA del L298N #2 como dirección
//  (o un tercer L298N si prefieres tenerlo separado)
//
//  DISTRIBUCIÓN DE PINES:
//  ┌─────────────────┬──────────┬───────────────────────────┐
//  │ Señal           │ Pin ESP32│ Descripción               │
//  ├─────────────────┼──────────┼───────────────────────────┤
//  │ IN1 (Blanca+)   │ GPIO 13  │ L298N #1, canal A         │
//  │ IN2 (Blanca-)   │ GPIO 12  │ L298N #1, canal A         │
//  │ IN3 (Roja+)     │ GPIO 14  │ L298N #1, canal B         │
//  │ IN4 (Roja-)     │ GPIO 27  │ L298N #1, canal B         │
//  │ IN1 (Verde+)    │ GPIO 26  │ L298N #2, canal A         │
//  │ IN2 (Verde-)    │ GPIO 25  │ L298N #2, canal A         │
//  │ IN3 (Azul+)     │ GPIO 33  │ L298N #2, canal B         │
//  │ IN4 (Azul-)     │ GPIO 32  │ L298N #2, canal B         │
//  │ IN1 (Mezclador) │ GPIO 18  │ L298N #2, canal extra     │
//  │ IN2 (Mezclador) │ GPIO 19  │ L298N #2, canal extra     │
//  └─────────────────┴──────────┴───────────────────────────┘
//
//  NOTA: Los pines ENA/ENB de los L298N conéctalos a 5V (jumper)
//  para que siempre estén habilitados. La ESP controla solo
//  dirección con IN1..IN4.
// ============================================================

// ── Pines L298N #1 ──────────────────────────────────────────
#define BLANCA_IN1  13   // Bomba blanca
#define BLANCA_IN2  12
#define ROJA_IN1    14   // Bomba roja
#define ROJA_IN2    27

// ── Pines L298N #2 ──────────────────────────────────────────
#define VERDE_IN1   26   // Bomba verde
#define VERDE_IN2   25
#define AZUL_IN1    33   // Bomba azul
#define AZUL_IN2    32
#define MIX_IN1     18   // Motor mezclador
#define MIX_IN2     19

// ============================================================
//  CAUDALES CALIBRADOS
//  Llena estos valores DESPUÉS de hacer tu prueba de 10s.
//  caudal_X = ml recolectados en 10s / 10  →  ml/s
//  Si todas las bombas son iguales, pon el mismo valor en todas.
// ============================================================
float caudal_blanca = 3.16;  // ml/s  ← reemplaza con tu medición
float caudal_roja   = 3.16;  // ml/s
float caudal_verde  = 3.16;  // ml/s
float caudal_azul   = 3.16;  // ml/s

// Tiempo que gira el mezclador después de dispensar (ms)
#define TIEMPO_MEZCLA  15000   // 15 segundos

// ── Helpers ─────────────────────────────────────────────────
// Calcula el tiempo en ms para dispensar 'ml' dado el caudal
unsigned long tiempoMs(float ml, float caudal) {
  if (caudal <= 0 || ml <= 0) return 0;
  return (unsigned long)((ml / caudal) * 1000.0);
}

// Activa una bomba (sentido horario = dispensar)
void bombaON(int in1, int in2) {
  digitalWrite(in1, HIGH);
  digitalWrite(in2, LOW);
}

// Detiene una bomba
void bombaOFF(int in1, int in2) {
  digitalWrite(in1, LOW);
  digitalWrite(in2, LOW);
}

// Dispensa exactamente 'ml' de la bomba indicada y espera
void dispensar(const char* nombre, int in1, int in2, float ml, float caudal) {
  if (ml <= 0) return;
  unsigned long t = tiempoMs(ml, caudal);
  Serial.printf("  → Dispensando %s: %.1f ml  (%lu ms)\n", nombre, ml, t);
  bombaON(in1, in2);
  delay(t);
  bombaOFF(in1, in2);
  delay(300); // pequeña pausa entre bombas para asentar la pintura
}

// Activa el motor mezclador
void mezclarON() {
  digitalWrite(MIX_IN1, HIGH);
  digitalWrite(MIX_IN2, LOW);
}

// Detiene el motor mezclador
void mezclarOFF() {
  digitalWrite(MIX_IN1, LOW);
  digitalWrite(MIX_IN2, LOW);
}

// ============================================================
//  FUNCIÓN PRINCIPAL DE MEZCLA
//
//  Parámetros: ml de cada pigmento que quieres dispensar.
//  La base blanca = 700 - (roja + verde + azul) → se calcula sola.
//
//  Ejemplo para "Azul cielo" (color #22 de tu tabla):
//    mezclar(0, 0, 66, 198);
//    → blanca = 700-264 = 436 ml, verde = 66ml, azul = 198ml
// ============================================================
void mezclar(float ml_roja, float ml_verde, float ml_azul) {

  float ml_blanca = 700.0 - ml_roja - ml_verde - ml_azul;

  if (ml_blanca < 0) {
    Serial.println("ERROR: la suma de pigmentos supera 700 ml. Ajusta las cantidades.");
    return;
  }

  Serial.println("\n==============================");
  Serial.println(" INICIANDO CICLO DE MEZCLA");
  Serial.println("==============================");
  Serial.printf("  Blanca : %.1f ml\n", ml_blanca);
  Serial.printf("  Roja   : %.1f ml\n", ml_roja);
  Serial.printf("  Verde  : %.1f ml\n", ml_verde);
  Serial.printf("  Azul   : %.1f ml\n", ml_azul);
  Serial.println("------------------------------");

  // 1. Base blanca primero (siempre)
  dispensar("BLANCA", BLANCA_IN1, BLANCA_IN2, ml_blanca, caudal_blanca);

  // 2. Pigmento rojo
  dispensar("ROJA",   ROJA_IN1,   ROJA_IN2,   ml_roja,   caudal_roja);

  // 3. Pigmento verde
  dispensar("VERDE",  VERDE_IN1,  VERDE_IN2,  ml_verde,  caudal_verde);

  // 4. Pigmento azul
  dispensar("AZUL",   AZUL_IN1,   AZUL_IN2,   ml_azul,   caudal_azul);

  // 5. Mezclar
  Serial.printf("\n  → Mezclando por %d segundos...\n", TIEMPO_MEZCLA / 1000);
  mezclarON();
  delay(TIEMPO_MEZCLA);
  mezclarOFF();

  Serial.println("  ✓ Mezcla completada.");
  Serial.println("==============================\n");
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);

  // Inicializar todos los pines como salida
  int pines[] = {
    BLANCA_IN1, BLANCA_IN2,
    ROJA_IN1,   ROJA_IN2,
    VERDE_IN1,  VERDE_IN2,
    AZUL_IN1,   AZUL_IN2,
    MIX_IN1,    MIX_IN2
  };
  for (int p : pines) {
    pinMode(p, OUTPUT);
    digitalWrite(p, LOW);  // Todo apagado al inicio
  }

  Serial.println("Mezclador listo.");

  // ── EJEMPLO: hacer "Azul cielo" (color #22 de tu tabla) ──
  //   r=0, g=66ml (3 unidades × 22ml), b=198ml (9 unidades × 22ml)
  //   blanca = 700 - 0 - 66 - 198 = 436 ml  ← automático
  mezclar(0, 66, 198);

  // Para hacer otro color, llama mezclar() con los ml de tu tabla:
  //   mezclar(ml_roja, ml_verde, ml_azul);
  //
  // Ejemplos rápidos de tu tabla de 40 colores:
  //   mezclar(308,   0,   0);   // Rojo puro
  //   mezclar(  0, 308,   0);   // Verde puro
  //   mezclar(  0,   0, 308);   // Azul puro
  //   mezclar(176, 176,   0);   // Amarillo
  //   mezclar(  0, 176, 176);   // Cyan
  //   mezclar(176,   0, 176);   // Magenta
  //   mezclar(220,  88,   0);   // Naranja
  //   mezclar(154,  66,  44);   // Café/Marrón
}

// ============================================================
//  LOOP  (vacío por ahora — la lógica va en setup o por IoT)
// ============================================================
void loop() {
  // Aquí irá la recepción de órdenes por WiFi/App
  // cuando conectemos el sistema IoT
}
