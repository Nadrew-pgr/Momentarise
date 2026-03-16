import sqlite3
import os

db_path = os.path.expanduser('~/.codex/state_5.sqlite')

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # Let's see the tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables:", [t[0] for t in tables])
    
    # We'll just dump anything containing 'partiellement' from all tables just to see where it lives
    for t in tables:
        table_name = t[0]
        try:
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [c[1] for c in cursor.fetchall()]
            
            for col in columns:
                try:
                    cursor.execute(f"SELECT * FROM {table_name} WHERE {col} LIKE '%partiellement%' LIMIT 1")
                    res = cursor.fetchone()
                    if res:
                        print(f"FOUND IN TABLE {table_name}, COLUMN {col}")
                except Exception as e:
                    pass
        except:
            pass
