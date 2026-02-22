import sqlite3

def add_status_column():
    try:
        conn = sqlite3.connect('goods_distributor.db')
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("PRAGMA table_info(daily_sales)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'status' not in columns:
            print("Adding status column...")
            cursor.execute("ALTER TABLE daily_sales ADD COLUMN status VARCHAR DEFAULT 'draft'")
            conn.commit()
            print("Column added successfully.")
        else:
            print("Status column already exists.")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_status_column()
