import json

input_file = "project/inbox_raw/codex_sync_reasoning.jsonl"
output_file = "project/implementation_conversations/codex_sync_reasoning.md"

with open(input_file, 'r', encoding='utf-8') as i_f, open(output_file, 'w', encoding='utf-8') as o_f:
    o_f.write(f"# Session Codex\n\n")
    for line in i_f:
        try:
            data = json.loads(line)
        except:
            continue
        
        if data.get("type") == "session_meta":
            meta = data.get("payload", {})
            o_f.write(f"- **CWD:** {meta.get('cwd', '')}\n\n")
            
        elif data.get("type") == "response_item":
            payload = data.get("payload", {})
            role = payload.get("role", "system")
            
            if role == "user":
                o_f.write("---\n\n## 👤 User\n\n")
            elif role == "assistant":
                o_f.write("---\n\n## 🤖 Assistant\n\n")
            else:
                o_f.write(f"---\n\n## ⚙️ {role.capitalize()}\n\n")
                
            content_blocks = payload.get("content", [])
            if isinstance(content_blocks, str):
                o_f.write(content_blocks + "\n\n")
            elif isinstance(content_blocks, list):
                for block in content_blocks:
                    if isinstance(block, dict) and block.get("type") == "input_text":
                        o_f.write(block.get("text", "") + "\n\n")
                    elif isinstance(block, dict) and block.get("type") == "image_url":
                        o_f.write("<image>\n")
                    elif isinstance(block, dict) and block.get("text"):
                         o_f.write(block.get("text", "") + "\n\n")
