import uuid

from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: uuid.UUID
    email: str


class ActiveWorkspaceOut(BaseModel):
    id: uuid.UUID
    name: str
    role: str


class MeResponse(BaseModel):
    user: UserOut
    active_workspace: ActiveWorkspaceOut | None
