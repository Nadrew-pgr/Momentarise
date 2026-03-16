import os, glob

search_str = "Si tu veux, je peux faire le patch"
files = glob.glob(os.path.expanduser('~/.codex/sessions/*/*/*.jsonl')) + glob.glob(os.path.expanduser('~/.codex/archived_sessions/*.jsonl'))

for fpath in files:
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            if search_str in f.read():
                print(f"FOUND: {fpath}")
    except Exception as e:
        pass
