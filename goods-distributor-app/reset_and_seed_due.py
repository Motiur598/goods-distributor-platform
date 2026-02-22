
import sqlite3
from datetime import date

def reset_and_seed():
    db_path = 'goods_distributor.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("--- Resetting Data ---")
        # 1. Clear Data
        print("Clearing payments...")
        cursor.execute("DELETE FROM group_payments")
        
        print("Clearing remarks...")
        cursor.execute("DELETE FROM sale_remarks")
        
        print("Clearing products taken...")
        cursor.execute("DELETE FROM products_taken")
        
        # Reset commissions in daily_sales to 0 for clarity, or just leave them?
        # User said "delete all total due amount". 
        # Total Due = (Commissions - Paid) + (Remarks - Paid).
        # So reset commissions to 0.
        print("Resetting commissions...")
        cursor.execute("UPDATE daily_sales SET commission = 0")
        
        # 2. Get a group id
        cursor.execute("SELECT id, name FROM groups LIMIT 1")
        group = cursor.fetchone()
        if not group:
            print("No groups found! Creating one...")
            cursor.execute("INSERT INTO groups (name) VALUES ('Test Group')")
            group_id = cursor.lastrowid
            group_name = 'Test Group'
        else:
            group_id = group[0]
            group_name = group[1]
            
        print(f"Seeding data for Group: {group_name} (ID: {group_id})")
        
        today = date.today()
        
        # 3. Add Commissions (via DailySale)
        print("Adding sample commissions...")
        # Check if sale exists for today, else create
        cursor.execute("SELECT id FROM daily_sales WHERE group_id = ? AND date = ?", (group_id, today))
        sale = cursor.fetchone()
        
        if sale:
            sale_id = sale[0]
            # Set a Commission
            cursor.execute("UPDATE daily_sales SET commission = 1000 WHERE id = ?", (sale_id,))
        else:
            # Create a dummy sale for commission
            cursor.execute("INSERT INTO daily_sales (group_id, date, total_amount, commission, due, status, is_locked) VALUES (?, ?, 5000, 1000, 4000, 'completed', 0)", (group_id, today))
            sale_id = cursor.lastrowid
            
        # 4. Add Remarks
        print("Adding sample remarks...")
        remarks = [
            (sale_id, "Lunch for Staff", 250.0, 0.0, 0),
            (sale_id, "Van Fare", 150.0, 0.0, 0),
            (sale_id, "Office Supplies", 500.0, 0.0, 0)
        ]
        cursor.executemany("INSERT INTO sale_remarks (daily_sale_id, comment, amount, paid_amount, is_fully_paid) VALUES (?, ?, ?, ?, ?)", remarks)
        
        conn.commit()
        print("Data reset and seeded successfully.")
        print(f"Added Commission: 1000")
        print(f"Added Remarks: 250, 150, 500 (Total 900)")
        print(f"Expected Total Due: 1900")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    reset_and_seed()
