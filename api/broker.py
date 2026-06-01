"""
Minimal async MQTT broker (v3.1.1).

Handles: CONNECT, PUBLISH (QoS 0/1), SUBSCRIBE, PINGREQ, DISCONNECT.
No auth, no persistence, no retained messages — just enough for ESP32 ↔ API.

Run standalone:  python broker.py
Or import and start inside FastAPI (see bottom).
"""

import asyncio
import struct
from collections import defaultdict

# ── Packet type constants ──────────────────────────────────────────────────────
CONNECT    = 1
CONNACK    = 2
PUBLISH    = 3
PUBACK     = 4
SUBSCRIBE  = 8
SUBACK     = 9
PINGREQ    = 12
PINGRESP   = 13
DISCONNECT = 14


def _encode_varlen(n: int) -> bytes:
    """Encode MQTT variable-length integer."""
    out = []
    while True:
        b = n % 128
        n //= 128
        out.append(b | (0x80 if n else 0))
        if not n:
            return bytes(out)


async def _read_varlen(reader: asyncio.StreamReader) -> int:
    """Decode MQTT variable-length integer from stream."""
    value, shift = 0, 0
    while True:
        b = (await reader.readexactly(1))[0]
        value |= (b & 0x7F) << shift
        shift += 7
        if not (b & 0x80):
            return value


def _read_str(buf: bytes, pos: int):
    """Read length-prefixed UTF-8 string; returns (string, new_pos)."""
    length = struct.unpack_from("!H", buf, pos)[0]
    return buf[pos + 2: pos + 2 + length].decode(), pos + 2 + length


# ── Broker ────────────────────────────────────────────────────────────────────

class MqttBroker:
    def __init__(self):
        # topic -> set of StreamWriter
        self._subs: dict[str, set] = defaultdict(set)
        # called with (topic: str, payload: bytes) on every inbound PUBLISH
        self.on_message = None
        # called with (username: str, password: str) -> bool on CONNECT; None = allow all
        self.auth_callback = None

    # ── Internal publish (to all subscribers) ─────────────────────────────────

    async def _forward(self, topic: str, payload: bytes, exclude=None):
        topic_b = topic.encode()
        body    = struct.pack("!H", len(topic_b)) + topic_b + payload
        packet  = bytes([0x30]) + _encode_varlen(len(body)) + body
        dead    = set()
        for w in list(self._subs.get(topic, [])):
            if w is exclude or w.is_closing():
                dead.add(w)
                continue
            try:
                w.write(packet)
                await w.drain()
            except Exception:
                dead.add(w)
        for w in dead:
            self._subs[topic].discard(w)

    # ── Public publish (called by application code) ────────────────────────────

    async def publish(self, topic: str, payload):
        if isinstance(payload, str):
            payload = payload.encode()
        await self._forward(topic, payload)

    # ── Per-client handler ─────────────────────────────────────────────────────

    async def _handle(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        my_topics: set[str] = set()
        try:
            while True:
                hdr  = (await reader.readexactly(1))[0]
                ptype = (hdr >> 4) & 0x0F
                flags = hdr & 0x0F
                rem   = await _read_varlen(reader)
                body  = await reader.readexactly(rem) if rem else b""

                if ptype == CONNECT:
                    # Parse connect flags + credentials
                    # Variable header: proto_name(6)+proto_level(1)+flags(1)+keepalive(2)=10
                    connect_flags = body[9]
                    has_user = bool(connect_flags & 0x80)
                    has_pass = bool(connect_flags & 0x40)
                    has_will = bool(connect_flags & 0x04)
                    pos = 10
                    cid_len = struct.unpack_from("!H", body, pos)[0]; pos += 2 + cid_len
                    if has_will:
                        wt = struct.unpack_from("!H", body, pos)[0]; pos += 2 + wt
                        wm = struct.unpack_from("!H", body, pos)[0]; pos += 2 + wm
                    username = password = None
                    if has_user and pos < len(body):
                        l = struct.unpack_from("!H", body, pos)[0]; pos += 2
                        username = body[pos:pos+l].decode(); pos += l
                    if has_pass and pos < len(body):
                        l = struct.unpack_from("!H", body, pos)[0]; pos += 2
                        password = body[pos:pos+l].decode(errors="replace"); pos += l
                    rc = 0x00
                    if self.auth_callback and not self.auth_callback(username or "", password or ""):
                        rc = 0x04  # bad credentials
                    writer.write(bytes([0x20, 0x02, 0x00, rc]))
                    await writer.drain()
                    if rc != 0:
                        return

                elif ptype == PUBLISH:
                    topic, pos = _read_str(body, 0)
                    qos = (flags >> 1) & 0x03
                    if qos:
                        pid = struct.unpack_from("!H", body, pos)[0]
                        pos += 2
                        writer.write(bytes([0x40, 0x02]) + struct.pack("!H", pid))  # PUBACK
                        await writer.drain()
                    msg = body[pos:]
                    await self._forward(topic, msg, exclude=writer)
                    if self.on_message:
                        asyncio.create_task(self.on_message(topic, msg))

                elif ptype == SUBSCRIBE:
                    pid = struct.unpack_from("!H", body, 0)[0]
                    pos, granted = 2, []
                    while pos < len(body):
                        t, pos  = _read_str(body, pos)
                        qos_req = body[pos]; pos += 1
                        self._subs[t].add(writer)
                        my_topics.add(t)
                        granted.append(min(qos_req, 1))
                    suback = bytes([0x90]) + _encode_varlen(2 + len(granted))
                    writer.write(suback + struct.pack("!H", pid) + bytes(granted))
                    await writer.drain()

                elif ptype == PINGREQ:
                    writer.write(bytes([0xD0, 0x00]))
                    await writer.drain()

                elif ptype == DISCONNECT:
                    break

        except (asyncio.IncompleteReadError, ConnectionResetError, OSError):
            pass
        finally:
            for t in my_topics:
                self._subs[t].discard(writer)
            try:
                writer.close()
            except Exception:
                pass

    # ── Start TCP server ───────────────────────────────────────────────────────

    async def start(self, host: str = "0.0.0.0", port: int = 1883):
        server = await asyncio.start_server(self._handle, host, port)
        addr   = server.sockets[0].getsockname()
        print(f"[MQTT] broker listening on {addr[0]}:{addr[1]}")
        return server


# ── Standalone entry point ────────────────────────────────────────────────────

if __name__ == "__main__":
    import signal

    async def _main():
        broker = MqttBroker()

        def _on_msg(topic, payload):
            print(f"[MQTT] {topic}: {payload.decode(errors='replace')}")

        broker.on_message = _on_msg
        server = await broker.start()
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, server.close)
        async with server:
            await server.serve_forever()

    asyncio.run(_main())
