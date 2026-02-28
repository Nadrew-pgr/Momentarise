from dataclasses import dataclass


@dataclass(slots=True)
class PromptComposerInput:
    agent_name: str | None
    prompt_mode: str
    user_message: str
    retrieval_snippets: list[dict]
    allowed_tools: list[dict]


class PromptComposer:
    """Compose deterministic system prompt snapshots for auditability."""

    MAX_SNIPPETS = 5

    @classmethod
    def compose(cls, data: PromptComposerInput) -> tuple[str, list[dict], list[str]]:
        snippets = data.retrieval_snippets[: cls.MAX_SNIPPETS]
        tool_names = [tool["name"] for tool in data.allowed_tools]
        agent_line = data.agent_name or "Sync Core"
        system_prompt = (
            f"You are {agent_line}. "
            f"prompt_mode={data.prompt_mode}. "
            "Never mutate data without preview/apply confirmation."
        )
        return system_prompt, snippets, tool_names
