from src.sync.tool_registry import ToolDefinition


class ToolPolicyEngine:
    """Backend-only enforcement for tool availability and confirmation requirements."""

    @staticmethod
    def resolve_toolset(
        *,
        available_tools: list[ToolDefinition],
        agent_policy: dict,
        runtime_allowlist: set[str] | None = None,
    ) -> list[dict]:
        requested = set(agent_policy.get("allow", [])) if agent_policy else set()
        denied = set(agent_policy.get("deny", [])) if agent_policy else set()

        resolved: list[dict] = []
        for tool in available_tools:
            if runtime_allowlist is not None and tool.name not in runtime_allowlist:
                continue
            if requested and tool.name not in requested:
                continue
            if tool.name in denied:
                continue
            resolved.append(
                {
                    "name": tool.name,
                    "description": tool.description,
                    "requires_confirm": True if tool.is_write else False,
                    "is_write": tool.is_write,
                }
            )
        return resolved
