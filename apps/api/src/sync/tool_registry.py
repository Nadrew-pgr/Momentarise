from dataclasses import dataclass


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    is_write: bool


DEFAULT_TOOLS: tuple[ToolDefinition, ...] = (
    ToolDefinition(
        name="memory.search",
        description="Search workspace memory chunks",
        is_write=False,
    ),
    ToolDefinition(
        name="inbox.preview_changes",
        description="Build a non-mutating preview for inbox/item updates",
        is_write=False,
    ),
    ToolDefinition(
        name="items.apply_update",
        description="Apply a validated preview to an item",
        is_write=True,
    ),
    ToolDefinition(
        name="events.schedule",
        description="Schedule or update calendar events",
        is_write=True,
    ),
)


def get_default_tools() -> list[ToolDefinition]:
    return list(DEFAULT_TOOLS)
