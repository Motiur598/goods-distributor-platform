
import sqlite3

def patch_db():
    conn = sqlite3.connect('goods_distributor.db')
    cursor = conn.cursor()
    
    try:
        # Add paid_amount column
        try:
            cursor.execute("ALTER TABLE sale_remarks ADD COLUMN paid_amount FLOAT DEFAULT 0.0")
            print("Added paid_amount column")
        except sqlite3.OperationalError as e:
            print(f"paid_amount column might already exist: {e}")
            
        # Add is_fully_paid column
        try:
            cursor.execute("ALTER TABLE sale_remarks ADD COLUMN is_fully_paid INTEGER DEFAULT 0")
            print("Added is_fully_paid column")
        except sqlite3.OperationalError as e:
            print(f"is_fully_paid column might already exist: {e}")
            
        conn.commit()
        print("Database patched successfully.")
        
    except Exception as e:
        print(f"Error patching database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    patch_db()
