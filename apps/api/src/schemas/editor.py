from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

EditorAssistAction = Literal[
    "rewrite",
    "shorter",
    "longer",
    "summarize",
    "grammar_fix",
    "translate_fr_en",
]


class EditorAssistRequest(BaseModel):
    action: EditorAssistAction
    text: str = Field(min_length=1)
    selection_text: str | None = None
    locale: str = "fr-FR"
    target_language: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class EditorAssistResponse(BaseModel):
    result_text: str
    agent_id: UUID | None = None
    agent_name: str | None = None
    model: str
    fallback_used: bool = False
    prompt_snapshot: str
    toolset_snapshot: list[str] = Field(default_factory=list)
    retrieval_snapshot: list[dict[str, Any]] = Field(default_factory=list)


class BlockNoteAssistRequest(BaseModel):
    messages: list[dict[str, Any]] = Field(default_factory=list)
    tool_definitions: dict[str, dict[str, Any]] = Field(default_factory=dict)
    locale: str = "fr-FR"
    context: dict[str, Any] = Field(default_factory=dict)


class BlockNoteAssistToolCall(BaseModel):
    id: str
    name: str
    input: dict[str, Any] = Field(default_factory=dict)


class BlockNoteAssistResponse(BaseModel):
    tool_call: BlockNoteAssistToolCall | None = None
    result_text: str | None = None
    model: str
    fallback_used: bool = False
    prompt_snapshot: str
