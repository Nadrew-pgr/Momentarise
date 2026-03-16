import os, glob

search_str = "partiellement"
base_dir = os.path.expanduser('~/.codex')

# Find all .jsonl files in ~/.codex
jsonl_files = []
for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f.endswith('.jsonl'):
            jsonl_files.append(os.path.join(root, f))

found = False
for fpath in jsonl_files:
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            if search_str in f.read():
                print(f"FOUND: {fpath}")
                found = True
    except Exception as e:
        pass
if not found:
    print("Not found anywhere in .jsonl")
