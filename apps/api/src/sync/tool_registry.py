from dataclasses import dataclass


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    is_write: bool


DEFAULT_TOOLS: tuple[ToolDefinition, ...] = (
    ToolDefinition(
        name="memory.search",
        description="Search workspace memory chunks by query.",
        is_write=False,
    ),
    ToolDefinition(
        name="calendar.events.range",
        description="Read events in a date range with titles and durations.",
        is_write=False,
    ),
    ToolDefinition(
        name="calendar.preferences.get",
        description="Read workspace calendar preferences (working hours).",
        is_write=False,
    ),
    ToolDefinition(
        name="calendar.patterns.suggest",
        description="Suggest default duration/color for similar event titles.",
        is_write=False,
    ),
    ToolDefinition(
        name="travel.estimate",
        description="Estimate travel duration between origin and destination.",
        is_write=False,
    ),
    ToolDefinition(
        name="item.preview",
        description="Build a preview mutation for item create/update.",
        is_write=False,
    ),
    ToolDefinition(
        name="event.preview",
        description="Build a preview mutation for event create/update/delete.",
        is_write=False,
    ),
    ToolDefinition(
        name="inbox.transform.preview",
        description="Build a preview to transform an inbox capture into item/event.",
        is_write=False,
    ),
)


def get_default_tools() -> list[ToolDefinition]:
    return list(DEFAULT_TOOLS)
