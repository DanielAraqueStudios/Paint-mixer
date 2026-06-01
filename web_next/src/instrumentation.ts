export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startMqttSubscriber } = await import('./lib/mqtt')
    await startMqttSubscriber()
  }
}
