import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ProjectBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: str | None = None
    color: str = Field(default="sky", max_length=50)


class ProjectCreateRequest(ProjectBase):
    pass


class ProjectUpdateRequest(BaseModel):
    title: str | None = Field(None, max_length=255)
    description: str | None = None
    color: str | None = Field(None, max_length=50)


class ProjectOut(ProjectBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
