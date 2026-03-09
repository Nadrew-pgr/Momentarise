from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field, TypeAdapter

BUSINESS_BLOCK_SCHEMA_VERSION = "business_blocks_v1"

BusinessBlockType = Literal[
    "text_block",
    "checklist_block",
    "table_block",
    "fields_block",
    "timer_block",
    "scale_block",
    "key_value_block",
    "link_block",
    "attachment_block",
    "inbox_block",
    "task_block",
    "status_block",
    "metric_block",
    "goal_block",
    "milestone_block",
    "decision_block",
    "hypothesis_block",
    "risk_block",
    "constraint_block",
    "question_block",
    "set_block",
]

BUSINESS_BLOCK_TYPES: set[str] = {
    "text_block",
    "checklist_block",
    "table_block",
    "fields_block",
    "timer_block",
    "scale_block",
    "key_value_block",
    "link_block",
    "attachment_block",
    "inbox_block",
    "task_block",
    "status_block",
    "metric_block",
    "goal_block",
    "milestone_block",
    "decision_block",
    "hypothesis_block",
    "risk_block",
    "constraint_block",
    "question_block",
    "set_block",
}


class BlockBase(BaseModel):
    id: str
    label: str | None = None


class ChecklistItem(BaseModel):
    id: str
    text: str = ""
    done: bool = False


class TablePayload(BaseModel):
    columns: list[str] = Field(default_factory=list)
    rows: list[list[str]] = Field(default_factory=list)


class KeyValuePair(BaseModel):
    key: str = ""
    value: str = ""


class ExternalLink(BaseModel):
    url: str
    title: str | None = None


class AttachmentItem(BaseModel):
    name: str
    url: str | None = None
    mime: str | None = None
    size_bytes: int | None = None


class InboxRef(BaseModel):
    capture_id: str
    title: str | None = None
    capture_type: str | None = None


class SetEntry(BaseModel):
    reps: int | None = None
    load: float | None = None
    rest_sec: int | None = None
    rpe: float | None = None
    done: bool = False


class TextBlockPayload(BaseModel):
    text: str = ""
    editor_doc: list[dict[str, Any]] = Field(default_factory=list)


class TextBlock(BlockBase):
    type: Literal["text_block"]
    payload: TextBlockPayload


class ChecklistBlockPayload(BaseModel):
    items: list[ChecklistItem] = Field(default_factory=list)


class ChecklistBlock(BlockBase):
    type: Literal["checklist_block"]
    payload: ChecklistBlockPayload


class TableBlock(BlockBase):
    type: Literal["table_block"]
    payload: TablePayload


class FieldsBlockPayload(BaseModel):
    fields: dict[str, Any] = Field(default_factory=dict)


class FieldsBlock(BlockBase):
    type: Literal["fields_block"]
    payload: FieldsBlockPayload


class TimerBlockPayload(BaseModel):
    duration_sec: int | None = None
    elapsed_sec: int = 0
    running: bool = False


class TimerBlock(BlockBase):
    type: Literal["timer_block"]
    payload: TimerBlockPayload


class ScaleBlockPayload(BaseModel):
    min: float = 1
    max: float = 10
    value: float = 5
    anchors: dict[str, Any] = Field(default_factory=dict)


class ScaleBlock(BlockBase):
    type: Literal["scale_block"]
    payload: ScaleBlockPayload


class KeyValueBlockPayload(BaseModel):
    pairs: list[KeyValuePair] = Field(default_factory=list)


class KeyValueBlock(BlockBase):
    type: Literal["key_value_block"]
    payload: KeyValueBlockPayload


class LinkBlockPayload(BaseModel):
    links: list[ExternalLink] = Field(default_factory=list)


class LinkBlock(BlockBase):
    type: Literal["link_block"]
    payload: LinkBlockPayload


class AttachmentBlockPayload(BaseModel):
    attachments: list[AttachmentItem] = Field(default_factory=list)


class AttachmentBlock(BlockBase):
    type: Literal["attachment_block"]
    payload: AttachmentBlockPayload


class InboxBlockPayload(BaseModel):
    capture_refs: list[InboxRef] = Field(default_factory=list)


class InboxBlock(BlockBase):
    type: Literal["inbox_block"]
    payload: InboxBlockPayload


class TaskBlockPayload(BaseModel):
    title: str = ""
    status: str = "todo"
    due_at: str | None = None


class TaskBlock(BlockBase):
    type: Literal["task_block"]
    payload: TaskBlockPayload


class StatusBlockPayload(BaseModel):
    state: str = "on_track"
    confidence: float | None = None
    note: str | None = None


class StatusBlock(BlockBase):
    type: Literal["status_block"]
    payload: StatusBlockPayload


class MetricBlockPayload(BaseModel):
    name: str = ""
    current: float | None = None
    target: float | None = None
    unit: str | None = None


class MetricBlock(BlockBase):
    type: Literal["metric_block"]
    payload: MetricBlockPayload


class GoalBlockPayload(BaseModel):
    outcome: str = ""
    deadline: str | None = None
    success_criteria: list[str] = Field(default_factory=list)


class GoalBlock(BlockBase):
    type: Literal["goal_block"]
    payload: GoalBlockPayload


class MilestoneBlockPayload(BaseModel):
    title: str = ""
    target_date: str | None = None
    done: bool = False


class MilestoneBlock(BlockBase):
    type: Literal["milestone_block"]
    payload: MilestoneBlockPayload


class DecisionBlockPayload(BaseModel):
    decision: str = ""
    why: str = ""
    alternatives: list[str] = Field(default_factory=list)


class DecisionBlock(BlockBase):
    type: Literal["decision_block"]
    payload: DecisionBlockPayload


class HypothesisBlockPayload(BaseModel):
    statement: str = ""
    test: str = ""
    signal: str = ""


class HypothesisBlock(BlockBase):
    type: Literal["hypothesis_block"]
    payload: HypothesisBlockPayload


class RiskBlockPayload(BaseModel):
    risk: str = ""
    impact: str = ""
    mitigation: str = ""
    owner: str | None = None


class RiskBlock(BlockBase):
    type: Literal["risk_block"]
    payload: RiskBlockPayload


class ConstraintBlockPayload(BaseModel):
    constraint: str = ""
    strictness: str = "hard"


class ConstraintBlock(BlockBase):
    type: Literal["constraint_block"]
    payload: ConstraintBlockPayload


class QuestionBlockPayload(BaseModel):
    question: str = ""
    priority: str = "medium"
    assignee: str | None = None


class QuestionBlock(BlockBase):
    type: Literal["question_block"]
    payload: QuestionBlockPayload


class SetBlockPayload(BaseModel):
    exercise_name: str = ""
    sets: list[SetEntry] = Field(default_factory=list)
    notes: str | None = None


class SetBlock(BlockBase):
    type: Literal["set_block"]
    payload: SetBlockPayload


BusinessBlock = Annotated[
    TextBlock
    | ChecklistBlock
    | TableBlock
    | FieldsBlock
    | TimerBlock
    | ScaleBlock
    | KeyValueBlock
    | LinkBlock
    | AttachmentBlock
    | InboxBlock
    | TaskBlock
    | StatusBlock
    | MetricBlock
    | GoalBlock
    | MilestoneBlock
    | DecisionBlock
    | HypothesisBlock
    | RiskBlock
    | ConstraintBlock
    | QuestionBlock
    | SetBlock,
    Field(discriminator="type"),
]

BusinessBlocksAdapter = TypeAdapter(list[BusinessBlock])

