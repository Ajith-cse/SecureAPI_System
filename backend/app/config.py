import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI        = os.getenv("MONGO_URI", "mongodb://localhost:27017")
JWT_SECRET       = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM    = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_EXPIRE    = int(os.getenv("ACCESS_EXPIRE", 30))    # minutes
REFRESH_EXPIRE   = int(os.getenv("REFRESH_EXPIRE", 7))    # days
REDIS_URL        = os.getenv("REDIS_URL", "redis://localhost:6379")
RATE_LIMIT_MAX   = int(os.getenv("RATE_LIMIT_MAX", 60))   # req/min
BLOCK_THRESHOLD  = int(os.getenv("BLOCK_THRESHOLD", 5))   # failed logins before block
ALLOWED_ORIGINS  = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")
APP_ENV          = os.getenv("APP_ENV", "development")
APP_VERSION      = os.getenv("APP_VERSION", "2.0.0")
