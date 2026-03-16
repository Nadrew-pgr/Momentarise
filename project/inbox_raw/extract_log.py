import sqlite3
import os
import json

db_path = os.path.expanduser('~/.codex/state_5.sqlite')
output_path = '/Users/andrewpougary/DevLocal/Momentarise/project/implementation_conversations/codex_sync_reasoning.md'

with sqlite3.connect(db_path) as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT message FROM logs WHERE message LIKE '%partiellement%' LIMIT 1;")
    res = cursor.fetchone()
    if res:
        with open(output_path, 'w', encoding='utf-8') as out:
            out.write("# Session Codex (Extracted from DB Logs)\n\n")
            msg = res[0]
            # It might be JSON, let's try reading it if it is JSON
            try:
                data = json.loads(msg)
                out.write("```json\n" + json.dumps(data, indent=2) + "\n```\n")
            except:
                out.write(msg + "\n")
