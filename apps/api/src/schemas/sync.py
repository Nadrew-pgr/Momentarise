import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

SyncRunMode = Literal["free", "guided"]
SyncRunStatus = Literal[
    "pending",
    "streaming",
    "waiting_answer",
    "ready_to_apply",
    "applied",
    "done",
    "failed",
    "cancelled",
]
PromptMode = Literal["full", "minimal", "none"]
MessageRole = Literal["system", "user", "assistant", "tool"]
AgentOrigin = Literal["system", "user", "template"]
AutomationStatus = Literal["draft", "active", "paused"]


class SyncModelCapabilities(BaseModel):
    supports_tools: bool
    supports_vision: bool
    supports_json_schema: bool
    max_context: int | None = None
    cost_hint: str | None = None


class SyncModelOut(BaseModel):
    id: str
    provider: str
    label: str
    is_default: bool = False
    capabilities: SyncModelCapabilities


class SyncModelListResponse(BaseModel):
    models: list[SyncModelOut]


class SyncRunOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_by_user_id: uuid.UUID
    agent_id: uuid.UUID | None
    mode: SyncRunMode
    status: SyncRunStatus
    selected_model: str | None
    title: str | None
    context_json: dict[str, Any]
    prompt_version: str | None
    prompt_mode: PromptMode
    system_prompt_snapshot: str | None
    toolset_snapshot: list[str]
    retrieval_snapshot: list[dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SyncRunResponse(BaseModel):
    run: SyncRunOut


class SyncRunSummaryOut(BaseModel):
    id: uuid.UUID
    status: SyncRunStatus
    title: str | None = None
    selected_model: str | None = None
    updated_at: datetime
    last_message_preview: str | None = None
    last_message_at: datetime | None = None


class SyncRunListResponse(BaseModel):
    runs: list[SyncRunSummaryOut]
    next_cursor: str | None = None


class SyncUsageOut(BaseModel):
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_usd: Decimal | None = None


class SyncMessageOut(BaseModel):
    id: uuid.UUID
    run_id: uuid.UUID
    seq: int
    role: MessageRole
    content_json: dict[str, Any]
    provider: str | None = None
    model: str | None = None
    usage_json: SyncUsageOut | None = None
    error_code: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SyncQuestionOut(BaseModel):
    id: uuid.UUID
    run_id: uuid.UUID
    seq: int
    key: str
    prompt: str
    help_text: str | None = None
    options: list[str] = Field(default_factory=list)
    created_at: datetime


class SyncDraftOut(BaseModel):
    id: uuid.UUID
    run_id: uuid.UUID
    seq: int
    title: str | None
    body_json: dict[str, Any]
    summary: str | None = None
    created_at: datetime


class SyncPreviewOut(BaseModel):
    id: uuid.UUID
    run_id: uuid.UUID
    seq: int
    entity_type: str
    entity_id: uuid.UUID | None
    action: str
    diff_json: dict[str, Any]
    expires_at: datetime | None = None
    undoable: bool = True
    created_at: datetime


class SyncApplyOut(BaseModel):
    run_id: uuid.UUID
    preview_id: uuid.UUID
    change_id: uuid.UUID
    applied_at: datetime
    undoable: bool


class SyncUndoOut(BaseModel):
    run_id: uuid.UUID
    change_id: uuid.UUID
    undone: bool
    undone_at: datetime


class SyncChangeOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    run_id: uuid.UUID | None
    actor_user_id: uuid.UUID | None
    entity_type: str
    entity_id: uuid.UUID
    action: str
    reason: str | None = None
    before_payload: dict[str, Any] | None = None
    after_payload: dict[str, Any] | None = None
    undoable: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SyncChangesResponse(BaseModel):
    changes: list[SyncChangeOut]


class SyncCreateRunRequest(BaseModel):
    mode: SyncRunMode = "guided"
    message: str = ""
    model: str | None = None
    agent_id: uuid.UUID | None = None
    title: str | None = None
    context_json: dict[str, Any] = Field(default_factory=dict)


class SyncStreamRequest(BaseModel):
    message: str = ""
    from_seq: int | None = None


class SyncAnswerRequest(BaseModel):
    answer: str
    question_id: uuid.UUID | None = None


class SyncApplyRequest(BaseModel):
    preview_id: uuid.UUID
    idempotency_key: str


class SyncUndoRequest(BaseModel):
    change_id: uuid.UUID
    idempotency_key: str | None = None


class SyncWSTokenResponse(BaseModel):
    ws_url: str
    token: str
    expires_at: datetime


class SyncWarningPayload(BaseModel):
    code: str
    message: str


class SyncErrorPayload(BaseModel):
    code: str
    message: str
    retryable: bool = False


class SyncDonePayload(BaseModel):
    status: SyncRunStatus


class SyncToolCallPayload(BaseModel):
    tool_call_id: uuid.UUID
    tool_name: str
    args_json: dict[str, Any]
    requires_confirm: bool
    status: Literal["started", "completed", "failed"]


class SyncToolResultPayload(BaseModel):
    tool_call_id: uuid.UUID
    status: Literal["completed", "failed"]
    summary: str | None = None
    result_json: dict[str, Any] | None = None


class SyncReasoningPayload(BaseModel):
    summary: str | None = None
    content: str | None = None
    duration_ms: int | None = None


class SyncSourceItemPayload(BaseModel):
    id: str | None = None
    title: str
    url: str
    snippet: str | None = None


class SyncSourcesPayload(BaseModel):
    items: list[SyncSourceItemPayload] = Field(default_factory=list)


class SyncTaskPayload(BaseModel):
    task_id: str
    title: str
    status: Literal["started", "completed", "failed"]
    detail: str | None = None
    tool_name: str | None = None


class SyncQueuePayload(BaseModel):
    queue_id: str
    label: str
    status: Literal["pending", "running", "completed", "failed"]
    detail: str | None = None


class SyncUsagePayload(BaseModel):
    provider: str | None = None
    model: str | None = None
    usage: SyncUsageOut


class SyncTokenPayload(BaseModel):
    delta: str


class SyncEventEnvelope(BaseModel):
    seq: int
    run_id: uuid.UUID
    ts: datetime
    trace_id: uuid.UUID | None = None
    type: Literal[
        "token",
        "message",
        "question",
        "draft",
        "preview",
        "applied",
        "usage",
        "warning",
        "error",
        "done",
        "tool_call",
        "tool_result",
        "reasoning",
        "sources",
        "task",
        "queue",
    ]
    payload: dict[str, Any]


class SyncMessagesResponse(BaseModel):
    messages: list[SyncMessageOut]


class SyncEventsResponse(BaseModel):
    run_id: uuid.UUID
    from_seq: int
    last_seq: int
    events: list[SyncEventEnvelope]


class SyncAgentsResponse(BaseModel):
    agents: list["SyncAgentOut"]


class SyncAgentOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    origin: AgentOrigin
    name: str
    description: str | None = None
    prompt_mode: PromptMode
    prompt_instructions: str | None = None
    tool_policy_json: dict[str, Any]
    memory_scope_json: dict[str, Any]
    is_default: bool
    is_active: bool
    published_version: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SyncCreateAgentRequest(BaseModel):
    name: str
    description: str | None = None
    prompt_mode: PromptMode = "full"
    prompt_instructions: str | None = None
    tool_policy_json: dict[str, Any] = Field(default_factory=dict)
    memory_scope_json: dict[str, Any] = Field(default_factory=dict)
    is_default: bool = False


class SyncPatchAgentRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    prompt_mode: PromptMode | None = None
    prompt_instructions: str | None = None
    tool_policy_json: dict[str, Any] | None = None
    memory_scope_json: dict[str, Any] | None = None
    is_default: bool | None = None
    is_active: bool | None = None


class SyncPublishAgentVersionResponse(BaseModel):
    agent_id: uuid.UUID
    version: int
    published_at: datetime


class SyncAutomationOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_by_user_id: uuid.UUID
    name: str
    description: str | None = None
    spec_json: dict[str, Any]
    status: AutomationStatus
    requires_confirm: bool
    last_validated_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SyncAutomationsResponse(BaseModel):
    automations: list[SyncAutomationOut]


class SyncCreateAutomationRequest(BaseModel):
    name: str
    description: str | None = None
    spec_json: dict[str, Any] = Field(default_factory=dict)
    requires_confirm: bool = True


class SyncPatchAutomationRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    spec_json: dict[str, Any] | None = None
    requires_confirm: bool | None = None


class SyncValidateAutomationResponse(BaseModel):
    automation_id: uuid.UUID
    ok: bool
    errors: list[str]


class SyncResumeMessage(BaseModel):
    type: Literal["resume"]
    from_seq: int


SyncAgentsResponse.model_rebuild()
