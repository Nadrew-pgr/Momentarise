import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class SeriesBase(BaseModel):
    title: str = Field(..., max_length=255)
    project_id: uuid.UUID | None = None
    rrule_template: str | None = Field(None, max_length=255)


class SeriesCreateRequest(SeriesBase):
    pass


class SeriesUpdateRequest(BaseModel):
    title: str | None = Field(None, max_length=255)
    project_id: uuid.UUID | None = None
    rrule_template: str | None = Field(None, max_length=255)


class SeriesOut(SeriesBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
