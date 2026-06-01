from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import JWTError, jwt
import bcrypt as _bcrypt
import secrets
from datetime import datetime, timedelta
import os
from models import engine, User

SECRET    = os.environ.get("JWT_SECRET", "paint-mixer-dev-secret")
ALGORITHM = "HS256"
EXP_HOURS = 24 * 7

def _hash(pw: str) -> str:
    return _bcrypt.hashpw(pw.encode(), _bcrypt.gensalt()).decode()

def _verify(pw: str, hashed: str) -> bool:
    return _bcrypt.checkpw(pw.encode(), hashed.encode())

bearer = HTTPBearer()


def make_token(user_id: int, email: str) -> str:
    exp = datetime.utcnow() + timedelta(hours=EXP_HOURS)
    return jwt.encode({"sub": str(user_id), "email": email, "exp": exp}, SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")


def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    payload = decode_token(creds.credentials)
    return {"id": int(payload["sub"]), "email": payload["email"]}


router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthIn(BaseModel):
    email:    str
    password: str


@router.post("/register", status_code=201)
def register(body: AuthIn):
    with Session(engine) as s:
        if s.query(User).filter_by(email=body.email).first():
            raise HTTPException(status_code=409, detail="Email ya registrado")
        user = User(email=body.email, passwordHash=_hash(body.password),
                    deviceToken=secrets.token_hex(16))
        s.add(user)
        s.commit()
        s.refresh(user)
        return {"token": make_token(user.id, user.email), "email": user.email}


@router.post("/login")
def login(body: AuthIn):
    with Session(engine) as s:
        user = s.query(User).filter_by(email=body.email).first()
        if not user or not _verify(body.password, user.passwordHash):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
        return {"token": make_token(user.id, user.email), "email": user.email}


@router.get("/me")
def me(user=Depends(current_user)):
    return user


@router.get("/device-token")
def get_device_token(user=Depends(current_user)):
    with Session(engine) as s:
        u = s.get(User, user["id"])
        if not u.deviceToken:
            u.deviceToken = secrets.token_hex(16)
            s.commit()
        return {"token": u.deviceToken, "email": u.email}


@router.post("/device-token/regenerate")
def regenerate_device_token(user=Depends(current_user)):
    with Session(engine) as s:
        u = s.get(User, user["id"])
        u.deviceToken = secrets.token_hex(16)
        s.commit()
        return {"token": u.deviceToken, "email": u.email}


def check_device_token(email: str, token: str) -> bool:
    """Used by MQTT broker to validate ESP32 credentials."""
    with Session(engine) as s:
        u = s.query(User).filter_by(email=email).first()
        return u is not None and u.deviceToken == token
