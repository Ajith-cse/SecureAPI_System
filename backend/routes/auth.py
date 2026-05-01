from fastapi import APIRouter, HTTPException, Request
from app.models import RegisterModel, LoginModel, RefreshModel
from app.database import users_collection
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.rate_limiter import record_failed_login, reset_failed_logins, is_ip_blocked

router = APIRouter()


@router.post("/register", summary="Register a new user")
def register(user: RegisterModel):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    users_collection.insert_one({
        "name":     user.name,
        "email":    user.email,
        "password": hash_password(user.password),
        "role":     user.role if user.role in ("admin", "user") else "user",
    })
    return {"message": "Registration successful"}


@router.post("/login", summary="Login and receive JWT tokens")
def login(user: LoginModel, request: Request):
    ip = request.client.host

    if is_ip_blocked(ip):
        raise HTTPException(status_code=403, detail="Your IP address has been blocked")

    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        record_failed_login(ip)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    reset_failed_logins(ip)

    payload = {
        "sub":  db_user["email"],
        "role": db_user["role"],
        "name": db_user.get("name", ""),
    }
    return {
        "access_token":  create_access_token(payload),
        "refresh_token": create_refresh_token(payload),
        "token_type":    "bearer",
        "role":          db_user["role"],
        "name":          db_user.get("name", ""),
    }


@router.post("/refresh", summary="Refresh access token")
def refresh(body: RefreshModel):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token type")

    new_payload = {
        "sub":  payload["sub"],
        "role": payload["role"],
        "name": payload.get("name", ""),
    }
    return {
        "access_token": create_access_token(new_payload),
        "token_type":   "bearer",
    }
