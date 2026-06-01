import paho.mqtt.client as mqtt
import time, sys

HOST  = "zephyr.proxy.rlwy.net"
PORT  = 12721
USER  = "lcdanielaraque@gmail.com"
TOKEN = "0dd6be7699cf6e92ce0a7cffa7cc6f5d"

result = {"rc": None}

def on_connect(client, userdata, flags, rc, props=None):
    result["rc"] = rc
    if rc == 0:
        print("CONNECTED OK")
        client.subscribe("mixer/status")
        client.publish("mixer/command", '{"id":0,"color":"test","mlBlanca":0,"mlRoja":0,"mlVerde":0,"mlAzul":0}')
    else:
        codes = {1:"wrong protocol", 2:"client ID rejected", 3:"server unavailable",
                 4:"bad credentials", 5:"not authorized"}
        print(f"FAILED rc={rc} ({codes.get(rc, 'unknown')})")
    client.disconnect()

def on_message(client, userdata, msg):
    print(f"MSG {msg.topic}: {msg.payload.decode()}")

c = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="win-test-01")
c.username_pw_set(USER, TOKEN)
c.on_connect  = on_connect
c.on_message  = on_message

print(f"Connecting to {HOST}:{PORT} as {USER}...")
try:
    c.connect(HOST, PORT, keepalive=10)
    c.loop_start()
    time.sleep(5)
    c.loop_stop()
except Exception as e:
    print(f"TCP ERROR: {e}")
    sys.exit(1)

print("Done." if result["rc"] == 0 else "Auth failed.")
