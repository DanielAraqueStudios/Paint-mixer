from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, text, select, func
from sqlalchemy.orm import DeclarativeBase, Session
from dotenv import load_dotenv
import paho.mqtt.client as mqtt_lib
import json, os, threading
from pathlib import Path
from urllib.parse import urlparse

# Load .env from api/ first, then fall back to repo root
_here = Path(__file__).parent
load_dotenv(_here / ".env")
load_dotenv(_here.parent / ".env")

DATABASE_URL = os.environ["DATABASE_URL"]
MQTT_URL     = os.environ.get("MQTT_URL", "mqtt://localhost:1883")

engine = create_engine(DATABASE_URL)


class Base(DeclarativeBase):
    pass


class Command(Base):
    __tablename__ = "Command"
    id        = Column(Integer,  primary_key=True, autoincrement=True)
    color     = Column(String,   nullable=False)
    mlBlanca  = Column(Float,    nullable=False)
    mlRoja    = Column(Float,    nullable=False)
    mlVerde   = Column(Float,    nullable=False)
    mlAzul    = Column(Float,    nullable=False)
    status    = Column(String,   default="pending")
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())


# ── MQTT ─────────────────────────────────────────────────────────────────────

def _parse_url(url: str):
    p = urlparse(url)
    return p.hostname or "localhost", p.port or 1883, p.username, p.password


_mqtt = mqtt_lib.Client(client_id="paintmixer-api", clean_session=True)
_host, _port, _user, _pw = _parse_url(MQTT_URL)
if _user:
    _mqtt.username_pw_set(_user, _pw)


def _on_message(client, userdata, msg):
    try:
        data   = json.loads(msg.payload)
        cmd_id = data["id"]
        status = data["status"]
        with Session(engine) as s:
            cmd = s.get(Command, cmd_id)
            if cmd:
                cmd.status = status
                s.commit()
        print(f"[MQTT] Command {cmd_id} → {status}")
    except Exception as e:
        print(f"[MQTT] message error: {e}")


_mqtt.on_message = _on_message


def _mqtt_connect():
    try:
        _mqtt.connect(_host, _port, 60)
        _mqtt.subscribe("mixer/status")
        _mqtt.loop_start()
        print(f"[MQTT] Connected {_host}:{_port}")
    except Exception as e:
        print(f"[MQTT] connect failed: {e}")


threading.Thread(target=_mqtt_connect, daemon=True).start()


# ── FastAPI ───────────────────────────────────────────────────────────────────

app = FastAPI()


@app.get("/api/health")
def health():
    result = {"db": False, "mqtt": False, "db_error": None, "mqtt_error": None}
    try:
        with Session(engine) as s:
            s.execute(text("SELECT 1"))
        result["db"] = True
    except Exception as e:
        result["db_error"] = str(e)
    result["mqtt"] = _mqtt.is_connected()
    if not result["mqtt"]:
        result["mqtt_error"] = "Cliente MQTT desconectado"
    return result


class CommandIn(BaseModel):
    color:    str
    mlBlanca: float
    mlRoja:   float
    mlVerde:  float
    mlAzul:   float


def _row(cmd: Command) -> dict:
    return {
        "id":       cmd.id,
        "color":    cmd.color,
        "mlBlanca": cmd.mlBlanca,
        "mlRoja":   cmd.mlRoja,
        "mlVerde":  cmd.mlVerde,
        "mlAzul":   cmd.mlAzul,
        "status":   cmd.status,
    }


@app.post("/api/command", status_code=201)
def create_command(body: CommandIn):
    with Session(engine) as s:
        cmd = Command(**body.model_dump())
        s.add(cmd)
        s.commit()
        s.refresh(cmd)
        row = _row(cmd)
    try:
        _mqtt.publish("mixer/command", json.dumps(row))
    except Exception as e:
        print(f"[MQTT] publish error: {e}")
    return row


@app.get("/api/command")
def latest_command():
    with Session(engine) as s:
        cmd = s.query(Command).order_by(Command.createdAt.desc()).first()
        return _row(cmd) if cmd else None


@app.patch("/api/command/{cmd_id}")
def update_status(cmd_id: int, body: dict):
    with Session(engine) as s:
        cmd = s.get(Command, cmd_id)
        if not cmd:
            raise HTTPException(status_code=404, detail="Not found")
        cmd.status = body.get("status", cmd.status)
        s.commit()
        return {"id": cmd.id, "status": cmd.status}


# Serve Angular SPA in production (after `ng build`)
_static = Path(__file__).parent / "static"
if _static.exists():
    app.mount("/assets", StaticFiles(directory=str(_static / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        f = _static / full_path
        return FileResponse(f if f.is_file() else _static / "index.html")
