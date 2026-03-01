#!/usr/bin/env python3
"""
Export Codex session jsonl to markdown.
Usage: python scripts/export-codex-session-to-md.py <path.jsonl> [out.md]
If out.md omitted, prints to stdout.
"""
import json
import re
import sys
from pathlib import Path

MAX_BLOCK_CHARS = 120_000  # truncate very long blocks (e.g. permissions)
TRUNCATE_PERMISSIONS_AT = 500  # first block that looks like permissions: emit only first N chars
SKIP_PATTERNS = [
    r"^<permissions instructions>",
    r"^# Context from my IDE setup:",
]


def should_truncate_permissions(text: str) -> bool:
    if not text or len(text) < 100:
        return False
    for pat in SKIP_PATTERNS:
        if re.search(pat, text.strip(), re.IGNORECASE):
            return True
    return False


def should_skip_block(text: str) -> bool:
    if not text or len(text) < 50:
        return False
    for pat in SKIP_PATTERNS:
        if re.search(pat, text.strip(), re.IGNORECASE):
            return True
    return False


def truncate(text: str, max_len: int = MAX_BLOCK_CHARS) -> str:
    if len(text) <= max_len:
        return text
    return text[:max_len] + "\n\n[... truncated ...]\n"


def extract_user_message(payload: dict) -> str:
    msg = payload.get("message") or ""
    if "## My request for Codex:" in msg:
        msg = msg.split("## My request for Codex:")[-1].strip()
    elif "My request for Codex:" in msg:
        msg = msg.split("My request for Codex:")[-1].strip()
    # If nothing after the label, keep the full message (might be the only content)
    if not msg and payload.get("message"):
        msg = (payload.get("message") or "").strip()
    return msg


def extract_assistant_content(payload: dict) -> str:
    parts = []
    for block in payload.get("content") or []:
        if not isinstance(block, dict) or block.get("type") != "input_text":
            continue
        text = (block.get("text") or "").strip()
        if not text:
            continue
        if should_truncate_permissions(text):
            text = truncate(text, TRUNCATE_PERMISSIONS_AT) + "\n\n[... permissions truncated ...]"
        else:
            text = truncate(text)
        parts.append(text)
    return "\n\n".join(parts).strip() if parts else ""


def main():
    if len(sys.argv) < 2:
        print("Usage: export-codex-session-to-md.py <path.jsonl> [out.md]", file=sys.stderr)
        sys.exit(1)
    path = Path(sys.argv[1])
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    if not path.exists():
        print(f"File not found: {path}", file=sys.stderr)
        sys.exit(1)

    lines_out = []
    session_id_short = ""
    cwd = ""
    source = ""
    model = ""

    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
            except json.JSONDecodeError:
                continue
            typ = d.get("type")
            payload = d.get("payload") or {}

            if typ == "session_meta":
                session_id = payload.get("id", "")
                session_id_short = session_id[:8] + "..." if len(session_id) >= 8 else session_id
                cwd = payload.get("cwd", "")
                source = payload.get("source", "vscode")
                model = payload.get("model_provider", "openai")
                lines_out.append(f"# Session Codex — {session_id_short}")
                lines_out.append(f"- **CWD:** {cwd}")
                lines_out.append(f"- **Source:** {source} | **Model:** {model}")
                lines_out.append("")
                continue

            # Codex jsonl: response_item with payload.type=="message", payload.role = user | developer
            if typ == "response_item":
                inner = payload.get("type")
                role = payload.get("role")
                if inner != "message" or role not in ("user", "developer"):
                    continue
                content = payload.get("content") or []
                if role == "user":
                    msg = extract_assistant_content({"content": content})
                    if not msg:
                        continue
                    lines_out.append("## 👤 User")
                    lines_out.append("")
                    lines_out.append(msg)
                    lines_out.append("")
                    lines_out.append("---")
                    lines_out.append("")
                else:
                    content_out = extract_assistant_content(payload)
                    if not content_out:
                        continue
                    lines_out.append("## 🤖 Assistant")
                    lines_out.append("")
                    lines_out.append(content_out)
                    lines_out.append("")
                    lines_out.append("---")
                    lines_out.append("")
                continue

            # Legacy: type message (role developer) or user_message
            if typ == "user_message":
                msg = extract_user_message(payload)
                if not msg:
                    continue
                lines_out.append("## 👤 User")
                lines_out.append("")
                lines_out.append(msg)
                lines_out.append("")
                lines_out.append("---")
                lines_out.append("")
                continue

            if typ == "message" and payload.get("role") == "developer":
                content = extract_assistant_content(payload)
                if not content:
                    continue
                lines_out.append("## 🤖 Assistant")
                lines_out.append("")
                lines_out.append(content)
                lines_out.append("")
                lines_out.append("---")
                lines_out.append("")
                continue

    result = "\n".join(lines_out)
    if out_path:
        out_path.write_text(result, encoding="utf-8")
        print(f"Written: {out_path}", file=sys.stderr)
    else:
        print(result)


if __name__ == "__main__":
    main()
