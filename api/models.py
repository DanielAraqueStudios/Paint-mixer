from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, relationship
import os
from dotenv import load_dotenv
from pathlib import Path

_here = Path(__file__).parent
load_dotenv(_here / ".env")
load_dotenv(_here.parent / ".env")

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "User"
    id           = Column(Integer, primary_key=True, autoincrement=True)
    email        = Column(String,  unique=True, nullable=False)
    passwordHash = Column(String,  nullable=False)
    deviceToken  = Column(String,  nullable=True)
    createdAt    = Column(DateTime, default=func.now())
    commands     = relationship("Command",    back_populates="user")
    savedColors  = relationship("SavedColor", back_populates="user")


class Command(Base):
    __tablename__ = "Command"
    id        = Column(Integer, primary_key=True, autoincrement=True)
    color     = Column(String,  nullable=False)
    mlBlanca  = Column(Float,   nullable=False)
    mlRoja    = Column(Float,   nullable=False)
    mlVerde   = Column(Float,   nullable=False)
    mlAzul    = Column(Float,   nullable=False)
    status    = Column(String,  default="pending")
    userId    = Column(Integer, ForeignKey("User.id"), nullable=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())
    user      = relationship("User", back_populates="commands")


class SavedColor(Base):
    __tablename__ = "SavedColor"
    id        = Column(Integer, primary_key=True, autoincrement=True)
    userId    = Column(Integer, ForeignKey("User.id"), nullable=False)
    hex       = Column(String,  nullable=False)
    name      = Column(String,  nullable=True)
    imageData = Column(Text,    nullable=True)
    createdAt = Column(DateTime, default=func.now())
    user      = relationship("User", back_populates="savedColors")
