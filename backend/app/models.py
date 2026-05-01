from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterModel(BaseModel):
    name:     str
    email:    EmailStr
    password: str
    role:     Optional[str] = "user"


class LoginModel(BaseModel):
    email:    EmailStr
    password: str


class RefreshModel(BaseModel):
    refresh_token: str


class BlockUserModel(BaseModel):
    ip:     Optional[str] = None
    email:  Optional[str] = None
    reason: Optional[str] = "Manual block"
