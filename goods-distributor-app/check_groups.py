import sqlite3
import os

DB_FILE = "goods_distributor.db"

def check_groups():
    if not os.path.exists(DB_FILE):
        print("Database file not found.")
        return

    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute("SELECT count(*) FROM groups")
        count = cursor.fetchone()[0]
        print(f"Groups Count: {count}")
        
        if count > 0:
            cursor.execute("SELECT id, name FROM groups")
            rows = cursor.fetchall()
            print("Groups in DB:", rows)
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_groups()
