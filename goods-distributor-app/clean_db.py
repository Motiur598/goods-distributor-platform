import sqlite3
import datetime
import os

# Adjust path to where the DB is likely located
# Based on backend/database.py: "sqlite:///./goods_distributor.db" inside backend folder?
# Or root? Let's check where the script is running.
# I will try to find the db file.

db_paths = [
    "goods_distributor.db",
    "backend/goods_distributor.db",
    "../goods_distributor.db"
]

db_file = None
for p in db_paths:
    if os.path.exists(p):
        db_file = p
        break

if not db_file:
    print("Could not find database file.")
    # Fallback to absolute path if we know it
    abs_path = r"D:\anti gravity project\goods-distributor-app\backend\goods_distributor.db"
    if os.path.exists(abs_path):
        db_file = abs_path

if not db_file:
    print(f"Error: Database file not found at {abs_path} or relative paths.")
    exit(1)

print(f"Using database: {db_file}")

conn = sqlite3.connect(db_file)
cursor = conn.cursor()

today = datetime.date.today().strftime("%Y-%m-%d")
print(f"Deleting sales for date: {today}")

try:
    # Get IDs to delete
    cursor.execute("SELECT id FROM daily_sales WHERE date = ?", (today,))
    sales = cursor.fetchall()
    
    if not sales:
        print("No sales found for today.")
    else:
        sale_ids = [s[0] for s in sales]
        print(f"Found {len(sale_ids)} sales to delete: {sale_ids}")
        
        for sale_id in sale_ids:
            cursor.execute("DELETE FROM sale_items WHERE daily_sale_id = ?", (sale_id,))
            cursor.execute("DELETE FROM sale_remarks WHERE daily_sale_id = ?", (sale_id,))
            cursor.execute("DELETE FROM daily_sales WHERE id = ?", (sale_id,))
            
        conn.commit()
        print("Successfully deleted sales.")

except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    conn.close()
