from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
import json, os
from pathlib import Path

from models import engine, Base, Command, SavedColor
from auth import router as auth_router, current_user, check_device_token
from broker import MqttBroker


# ── DB init ───────────────────────────────────────────────────────────────────

def init_db():
    Base.metadata.create_all(engine)
    with engine.connect() as conn:
        for stmt in [
            'ALTER TABLE "Command" ADD COLUMN "userId" INTEGER REFERENCES "User"(id)',
            'ALTER TABLE "User" ADD COLUMN "deviceToken" VARCHAR',
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                conn.rollback()

init_db()


# ── Embedded MQTT broker ──────────────────────────────────────────────────────

_broker = MqttBroker()
_broker.auth_callback = check_device_token

MQTT_PORT = int(os.environ.get("MQTT_PORT", 1883))


async def _on_mqtt_message(topic: str, payload: bytes):
    try:
        data   = json.loads(payload)
        cmd_id = data["id"]
        status = data["status"]
        with Session(engine) as s:
            cmd = s.get(Command, cmd_id)
            if cmd:
                cmd.status = status
                s.commit()
        print(f"[MQTT] Command {cmd_id} -> {status}")
    except Exception as e:
        print(f"[MQTT] message error: {e}")

_broker.on_message = _on_mqtt_message


@asynccontextmanager
async def lifespan(app: FastAPI):
    server = await _broker.start(port=MQTT_PORT)
    yield
    server.close()


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)


@app.get("/api/health")
def health():
    result = {"db": False, "mqtt": True, "db_error": None, "mqtt_error": None,
              "mqtt_port": MQTT_PORT}
    try:
        with Session(engine) as s:
            s.execute(text("SELECT 1"))
        result["db"] = True
    except Exception as e:
        result["db_error"] = str(e)
    return result


# ── Commands ──────────────────────────────────────────────────────────────────

class CommandIn(BaseModel):
    color:    str
    mlBlanca: float
    mlRoja:   float
    mlVerde:  float
    mlAzul:   float


def _row(cmd: Command) -> dict:
    return {
        "id":        cmd.id,
        "color":     cmd.color,
        "mlBlanca":  cmd.mlBlanca,
        "mlRoja":    cmd.mlRoja,
        "mlVerde":   cmd.mlVerde,
        "mlAzul":    cmd.mlAzul,
        "status":    cmd.status,
        "createdAt": cmd.createdAt.isoformat() if cmd.createdAt else None,
    }


@app.post("/api/command", status_code=201)
async def create_command(body: CommandIn, user=Depends(current_user)):
    with Session(engine) as s:
        cmd = Command(**body.model_dump(), userId=user["id"])
        s.add(cmd)
        s.commit()
        s.refresh(cmd)
        row = _row(cmd)
    await _broker.publish("mixer/command", json.dumps(row))
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


# ── Saved colors ──────────────────────────────────────────────────────────────

class ColorIn(BaseModel):
    hex:       str
    name:      str | None = None
    imageData: str | None = None


def _color_row(sc: SavedColor) -> dict:
    return {
        "id":        sc.id,
        "hex":       sc.hex,
        "name":      sc.name,
        "imageData": sc.imageData,
        "createdAt": sc.createdAt.isoformat() if sc.createdAt else None,
    }


@app.post("/api/colors", status_code=201)
def save_color(body: ColorIn, user=Depends(current_user)):
    with Session(engine) as s:
        sc = SavedColor(userId=user["id"], hex=body.hex, name=body.name, imageData=body.imageData)
        s.add(sc)
        s.commit()
        s.refresh(sc)
        return _color_row(sc)


@app.get("/api/colors")
def get_colors(user=Depends(current_user)):
    with Session(engine) as s:
        rows = s.query(SavedColor).filter_by(userId=user["id"]).order_by(SavedColor.createdAt.desc()).all()
        return [_color_row(r) for r in rows]


@app.delete("/api/colors/{color_id}", status_code=204)
def delete_color(color_id: int, user=Depends(current_user)):
    with Session(engine) as s:
        sc = s.get(SavedColor, color_id)
        if not sc or sc.userId != user["id"]:
            raise HTTPException(status_code=404, detail="Not found")
        s.delete(sc)
        s.commit()


# ── Profile ───────────────────────────────────────────────────────────────────

@app.get("/api/profile")
def get_profile(user=Depends(current_user)):
    with Session(engine) as s:
        commands = (s.query(Command).filter_by(userId=user["id"])
                    .order_by(Command.createdAt.desc()).all())
        color_count = s.query(SavedColor).filter_by(userId=user["id"]).count()
        return {
            "email":       user["email"],
            "totalMixes":  len(commands),
            "savedColors": color_count,
            "history":     [_row(c) for c in commands],
        }


# ── SPA fallback ──────────────────────────────────────────────────────────────

_static = Path(__file__).parent / "static"
if _static.exists():
    _assets = _static / "assets"
    if _assets.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets)), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        f = _static / full_path
        return FileResponse(f if f.is_file() else _static / "index.html")
