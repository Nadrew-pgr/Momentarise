from dataclasses import dataclass


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    is_write: bool


DEFAULT_TOOLS: tuple[ToolDefinition, ...] = (
    ToolDefinition(
        name="memory_search",
        description="Search workspace memory chunks by query.",
        is_write=False,
    ),
    ToolDefinition(
        name="calendar_events_range",
        description="Read events in a date range with titles and durations.",
        is_write=False,
    ),
    ToolDefinition(
        name="calendar_preferences_get",
        description="Read workspace calendar preferences (working hours).",
        is_write=False,
    ),
    ToolDefinition(
        name="calendar_patterns_suggest",
        description="Suggest default duration/color for similar event titles.",
        is_write=False,
    ),
    ToolDefinition(
        name="travel_estimate",
        description="Estimate travel duration between origin and destination.",
        is_write=False,
    ),
    ToolDefinition(
        name="item_preview",
        description="Build a preview mutation for item create/update.",
        is_write=False,
    ),
    ToolDefinition(
        name="event_preview",
        description="Build a preview mutation for event create/update/delete.",
        is_write=False,
    ),
    ToolDefinition(
        name="inbox_transform_preview",
        description="Build a preview to transform an inbox capture into item/event.",
        is_write=False,
    ),
    ToolDefinition(
        name="ask_question",
        description="Ask a structured question with multiple choice options to refine user intent.",
        is_write=False,
    ),
)


def get_default_tools() -> list[ToolDefinition]:
    return list(DEFAULT_TOOLS)
