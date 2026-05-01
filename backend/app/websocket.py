from fastapi import WebSocket
from typing import List
import time

from app.database import (
    users_collection, logs_collection,
    blocked_collection, alerts_collection,
)
from app.rate_limiter import get_requests_per_sec, get_total_requests


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_stats(self):
        if not self.active_connections:
            return
        payload = self._build_payload()
        dead = []
        for conn in self.active_connections:
            try:
                await conn.send_json(payload)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.disconnect(d)

    def _build_payload(self) -> dict:
        now    = time.time()
        window = now - 60

        recent_logs = list(
            logs_collection.find({"timestamp": {"$gte": window}}, {"_id": 0})
            .sort("timestamp", -1).limit(20)
        )

        failed = logs_collection.count_documents({
            "timestamp": {"$gte": window},
            "path":      "/auth/login",
            "status":    {"$gte": 400},
        })

        blocked_list = list(
            blocked_collection.find({}, {"_id": 0, "ip": 1, "reason": 1, "blocked_at": 1})
            .limit(20)
        )

        active = len(
            logs_collection.distinct("ip", {"timestamp": {"$gte": now - 300}})
        )

        alerts = list(
            alerts_collection.find({}, {"_id": 0})
            .sort("timestamp", -1).limit(10)
        )

        return {
            "type":             "stats",
            "timestamp":        now,
            "requests_per_sec": get_requests_per_sec(),
            "total_requests":   get_total_requests(),
            "failed_logins":    failed,
            "active_users":     active,
            "blocked_count":    blocked_collection.count_documents({}),
            "blocked_ips":      blocked_list,
            "alerts":           alerts,
            "recent_logs":      recent_logs,
            "chart":            self._build_chart(now),
        }

    def _build_chart(self, now: float) -> list:
        buckets = []
        for i in range(12, 0, -1):
            t0    = now - i * 10
            t1    = t0 + 10
            count = logs_collection.count_documents(
                {"timestamp": {"$gte": t0, "$lt": t1}}
            )
            buckets.append({"t": f"-{i*10}s", "requests": count})
        return buckets


manager = ConnectionManager()
