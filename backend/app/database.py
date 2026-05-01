from pymongo import MongoClient, ASCENDING
from pymongo.errors import ConnectionFailure
from app.config import MONGO_URI
import logging

logger = logging.getLogger(__name__)

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    logger.info("✅  MongoDB connected successfully")
except ConnectionFailure as e:
    logger.error(f"❌  MongoDB connection failed: {e}")
    raise

db = client["secure_api_system"]

users_collection   = db["users"]
logs_collection    = db["logs"]
stats_collection   = db["stats"]
blocked_collection = db["blocked"]
alerts_collection  = db["alerts"]

# ── Indexes ──────────────────────────────────────────────────────────────────
users_collection.create_index([("email", ASCENDING)], unique=True)
logs_collection.create_index([("timestamp", ASCENDING)])
blocked_collection.create_index([("ip", ASCENDING)], unique=True)
alerts_collection.create_index([("timestamp", ASCENDING)])
