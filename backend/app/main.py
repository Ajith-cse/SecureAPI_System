from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import time

from app.config import ALLOWED_ORIGINS, APP_VERSION
from app.database import logs_collection
from app.rate_limiter import increment_request_counter
from app.websocket import manager
from routes.auth import router as auth_router
from routes.protected import router as protected_router
from routes.admin import router as admin_router
import os

app = FastAPI(
    title="Secure & Scalable REST API System",
    version=APP_VERSION,
    description="JWT Auth · Dynamic Rate Limiting · Real-Time Monitoring",
    docs_url="/docs",
    redoc_url="/redoc",
)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request Logging + Rate Counter Middleware ─────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start    = time.time()
    ip       = request.client.host
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)

    log_entry = {
        "ip":          ip,
        "method":      request.method,
        "path":        str(request.url.path),
        "status":      response.status_code,
        "duration_ms": duration,
        "timestamp":   time.time(),
    }
    try:
        logs_collection.insert_one(log_entry)
        increment_request_counter()
    except Exception:
        pass

    return response


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router,      prefix="/auth",  tags=["Auth"])
app.include_router(protected_router, prefix="/api",   tags=["Protected"])
app.include_router(admin_router,     prefix="/admin", tags=["Admin"])


# ── WebSocket Real-Time Feed ──────────────────────────────────────────────────
@app.websocket("/ws/monitor")
async def websocket_monitor(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(2)
            await manager.broadcast_stats()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def home():
    return {
        "message": f"Secure API System v{APP_VERSION} — Running",
        "docs":    "/docs",
        "ws":      "/ws/monitor",
    }
