from fastapi import APIRouter, Depends, Request, HTTPException
from app.security import get_current_user
from app.rate_limiter import is_rate_limited, is_ip_blocked
import time

router = APIRouter()


@router.get("/protected", summary="JWT-protected endpoint")
def protected_route(request: Request, user=Depends(get_current_user)):
    ip = request.client.host

    if is_ip_blocked(ip):
        raise HTTPException(status_code=403, detail="IP address is blocked")
    if is_rate_limited(ip):
        raise HTTPException(status_code=429, detail="Too many requests — slow down")

    return {
        "message":   "✅ Authorized access granted",
        "user":      user.get("sub"),
        "role":      user.get("role"),
        "timestamp": time.time(),
    }


@router.get("/me", summary="Get current user profile")
def get_me(user=Depends(get_current_user)):
    return {
        "email": user.get("sub"),
        "role":  user.get("role"),
        "name":  user.get("name"),
    }
