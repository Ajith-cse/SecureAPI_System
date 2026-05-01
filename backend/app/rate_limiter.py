import time
import redis
from app.config import REDIS_URL, RATE_LIMIT_MAX, BLOCK_THRESHOLD
from app.database import blocked_collection, alerts_collection

try:
    r = redis.Redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=3)
    r.ping()
    _redis_available = True
except Exception:
    r = None
    _redis_available = False


def _redis_ok() -> bool:
    return r is not None and _redis_available


# ── Rate Limiting ─────────────────────────────────────────────────────────────
def is_rate_limited(ip: str) -> bool:
    if not _redis_ok():
        return False
    key = f"rate:{ip}"
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, 60)
    count, _ = pipe.execute()
    if int(count) > RATE_LIMIT_MAX:
        _flag_suspicious(ip, "Rate limit exceeded")
        return True
    return False


# ── IP Blocking ───────────────────────────────────────────────────────────────
def is_ip_blocked(ip: str) -> bool:
    if _redis_ok():
        if r.get(f"blocked:{ip}"):
            return True
    doc = blocked_collection.find_one({"ip": ip})
    return doc is not None


def block_ip(ip: str, reason: str = "Automated block"):
    try:
        blocked_collection.update_one(
            {"ip": ip},
            {"$set": {"ip": ip, "reason": reason, "blocked_at": time.time()}},
            upsert=True,
        )
        if _redis_ok():
            r.set(f"blocked:{ip}", "1", ex=86400)
        _create_alert("IP Blocked", f"IP {ip} blocked — {reason}", "critical")
    except Exception:
        pass


def unblock_ip(ip: str):
    blocked_collection.delete_one({"ip": ip})
    if _redis_ok():
        r.delete(f"blocked:{ip}")


# ── Failed Login Tracking ─────────────────────────────────────────────────────
def record_failed_login(ip: str):
    if not _redis_ok():
        return
    key = f"fail:{ip}"
    count = r.incr(key)
    r.expire(key, 300)
    if int(count) >= BLOCK_THRESHOLD:
        block_ip(ip, f"Too many failed logins ({count})")


def reset_failed_logins(ip: str):
    if _redis_ok():
        r.delete(f"fail:{ip}")


def get_failed_count(ip: str) -> int:
    if not _redis_ok():
        return 0
    return int(r.get(f"fail:{ip}") or 0)


# ── Request Counter ───────────────────────────────────────────────────────────
def increment_request_counter():
    if _redis_ok():
        r.incr("stats:req_total")
        r.incr("stats:req_current_sec")
        r.expire("stats:req_current_sec", 1)


def get_requests_per_sec() -> int:
    if not _redis_ok():
        return 0
    return int(r.get("stats:req_current_sec") or 0)


def get_total_requests() -> int:
    if not _redis_ok():
        return 0
    return int(r.get("stats:req_total") or 0)


# ── Internal Helpers ──────────────────────────────────────────────────────────
def _flag_suspicious(ip: str, reason: str):
    _create_alert("Suspicious Activity", f"IP {ip}: {reason}", "warning")


def _create_alert(title: str, message: str, severity: str = "info"):
    try:
        alerts_collection.insert_one({
            "title":     title,
            "message":   message,
            "severity":  severity,
            "timestamp": time.time(),
            "read":      False,
        })
    except Exception:
        pass
