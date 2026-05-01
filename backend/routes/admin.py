from fastapi import APIRouter, Depends, HTTPException
from app.security import require_admin
from app.database import (
    users_collection, logs_collection,
    blocked_collection, alerts_collection,
)
from app.rate_limiter import (
    get_requests_per_sec, get_total_requests,
    block_ip, unblock_ip,
)
from app.models import BlockUserModel
import time

router = APIRouter()


# ── Stats ─────────────────────────────────────────────────────────────────────
@router.get("/stats", summary="Admin statistics overview")
def admin_stats(admin=Depends(require_admin)):
    now  = time.time()
    win  = now - 60

    return {
        "total_users":      users_collection.count_documents({}),
        "admins":           users_collection.count_documents({"role": "admin"}),
        "users":            users_collection.count_documents({"role": "user"}),
        "requests_per_sec": get_requests_per_sec(),
        "total_requests":   get_total_requests(),
        "failed_logins_1m": logs_collection.count_documents({
            "timestamp": {"$gte": win},
            "path":      "/auth/login",
            "status":    {"$gte": 400},
        }),
        "blocked_ips": blocked_collection.count_documents({}),
        "uptime_since":     now,
    }


# ── Blocked IPs ───────────────────────────────────────────────────────────────
@router.get("/blocked-ips", summary="List all blocked IPs")
def list_blocked(admin=Depends(require_admin)):
    docs = list(blocked_collection.find({}, {"_id": 0}))
    return {"blocked": docs, "count": len(docs)}


@router.post("/block-user", summary="Block an IP or user by email")
def block_user(body: BlockUserModel, admin=Depends(require_admin)):
    if not body.ip and not body.email:
        raise HTTPException(status_code=400, detail="Provide ip or email")
    identifier = body.ip or body.email
    block_ip(identifier, body.reason or "Manual block")
    return {"message": f"Blocked {identifier}", "reason": body.reason}


@router.delete("/unblock/{ip}", summary="Unblock an IP")
def unblock_user(ip: str, admin=Depends(require_admin)):
    unblock_ip(ip)
    return {"message": f"Unblocked {ip}"}


# ── Logs ──────────────────────────────────────────────────────────────────────
@router.get("/logs", summary="Fetch recent request logs")
def get_logs(limit: int = 50, admin=Depends(require_admin)):
    docs = list(
        logs_collection.find({}, {"_id": 0})
        .sort("timestamp", -1).limit(limit)
    )
    return {"logs": docs, "count": len(docs)}


# ── Alerts ────────────────────────────────────────────────────────────────────
@router.get("/alerts", summary="Fetch security alerts")
def get_alerts(admin=Depends(require_admin)):
    docs = list(
        alerts_collection.find({}, {"_id": 0})
        .sort("timestamp", -1).limit(30)
    )
    return {"alerts": docs}


@router.patch("/alerts/read-all", summary="Mark all alerts as read")
def mark_alerts_read(admin=Depends(require_admin)):
    alerts_collection.update_many({"read": False}, {"$set": {"read": True}})
    return {"message": "All alerts marked read"}


# ── Users ─────────────────────────────────────────────────────────────────────
@router.get("/users", summary="List all users (no passwords)")
def list_users(admin=Depends(require_admin)):
    docs = list(users_collection.find({}, {"_id": 0, "password": 0}))
    return {"users": docs, "count": len(docs)}
