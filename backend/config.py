import os
from pathlib import Path
from typing import List, Union
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
EVIDENCE_DIR = BASE_DIR / "evidence"
TEST_VIDEOS_DIR = BASE_DIR / "test_videos"
MODELS_DIR = BASE_DIR / "models"

# Ensure directories exist
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
TEST_VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "IBVAP — Intelligent Border Video Analytics Platform"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ibvap-secure-super-secret-key-mha-ssb-2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALGORITHM: str = "HS256"

    # YOLO & AI Configuration
    YOLO_MODEL_NAME: str = str(MODELS_DIR / "yolov8n.pt") if (MODELS_DIR / "yolov8n.pt").exists() else "yolov8n.pt"
    CONFIDENCE_THRESHOLD: float = 0.40
    INTRUSION_COOLDOWN_SECONDS: float = 5.0
    YOLO_IMGSZ: int = 384
    YOLO_CLASSES: List[int] = [0, 1, 2, 3, 5, 7]  # person, bicycle, car, motorcycle, bus, truck

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/ibvap.db")

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = ["*"]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
