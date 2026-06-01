import mqtt, { MqttClient } from 'mqtt'

const globalForMqtt = globalThis as unknown as { mqttClient: MqttClient | undefined }

function createClient(): MqttClient {
  const url = process.env.MQTT_URL
  if (!url) throw new Error('MQTT_URL is not set')
  return mqtt.connect(url, {
    clientId: `paintmixer-server-${Math.random().toString(16).slice(2, 8)}`,
    reconnectPeriod: 3000,
  })
}

export function getMqttClient(): MqttClient {
  if (!globalForMqtt.mqttClient) {
    globalForMqtt.mqttClient = createClient()
  }
  return globalForMqtt.mqttClient
}

export function publishCommand(command: {
  id: number
  color: string
  mlBlanca: number
  mlRoja: number
  mlVerde: number
  mlAzul: number
}): Promise<void> {
  return new Promise((resolve, reject) => {
    getMqttClient().publish('mixer/command', JSON.stringify(command), (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export async function startMqttSubscriber() {
  const client = getMqttClient()

  client.on('connect', () => {
    console.log('[MQTT] Connected')
    client.subscribe('mixer/status', (err) => {
      if (err) console.error('[MQTT] Subscribe error:', err)
      else console.log('[MQTT] Subscribed to mixer/status')
    })
  })

  client.on('message', async (topic, payload) => {
    if (topic !== 'mixer/status') return
    try {
      const { id, status } = JSON.parse(payload.toString()) as { id: number; status: string }
      const { prisma } = await import('./db')
      await prisma.command.update({ where: { id }, data: { status } })
      console.log(`[MQTT] Command ${id} → ${status}`)
    } catch (err) {
      console.error('[MQTT] Failed to process status message:', err)
    }
  })

  client.on('error', (err) => console.error('[MQTT] Client error:', err))
  client.on('offline', () => console.warn('[MQTT] Client offline, retrying...'))
}
