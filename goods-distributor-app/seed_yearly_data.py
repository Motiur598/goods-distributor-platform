import sqlite3
import random
from datetime import date, timedelta

DB_FILE = "goods_distributor.db"

def seed_yearly_data(year=2026, group_id=2):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    print(f"Seeding data for Year: {year}, Group ID: {group_id}")
    
    # Get a product to attach items to (to avoid foreign key errors if items are needed)
    cursor.execute("SELECT id, buy_price_avg, sell_price_per_type FROM products WHERE group_id = ?", (group_id,))
    products = cursor.fetchall()
    
    if not products:
        print("No products found for this group. Cannot calculate COGS/Profit correctly without products.")
        # We will proceed with just DailySale for the Sales Chart, 
        # but Profit Calculator might look empty if it relies on items.
        # Let's hope the user just wants to see the Sales Chart bars for now.
    
    # Clear existing sales for this year/group to avoid duplicates if re-run?? 
    # Maybe not, just append. User said "create a testing value".
    
    months = range(1, 13)
    
    for month in months:
        # Create 1-3 sales per month
        num_sales = random.randint(1, 3)
        
        for _ in range(num_sales):
            day = random.randint(1, 28)
            sale_date = date(year, month, day)
            
            # Random total amount
            total_amount = random.randint(5000, 50000)
            cash_received = total_amount
            due = 0
            
            cursor.execute("""
                INSERT INTO daily_sales (group_id, date, total_amount, cash_received, due, commission, status, is_locked)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (group_id, sale_date, total_amount, cash_received, due, 0, 'completed', 1))
            
            sale_id = cursor.lastrowid
            
            # If we have products, add a dummy sale_item to make Profit Calc work too
            if products:
                product = random.choice(products)
                p_id, buy_price, sell_price = product
                
                # Reverse engineer quantity from total_amount roughly
                # This is just for show, doesn't need to be perfect math for the total_amount above 
                # (unless backend sums items to get total... reports.py get_yearly_sales sums DailySale.total_amount)
                # But Profit calc sums items.
                
                # Let's add an item that matches the total amount roughly
                # valid qty? 
                qty_type = int(total_amount / sell_price) if sell_price > 0 else 0
                
                cursor.execute("""
                    INSERT INTO sale_items (daily_sale_id, product_id, request_type_qty, request_piece_qty, 
                                          return_type_qty, return_piece_qty, sold_type_qty, sold_piece_qty, price)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (sale_id, p_id, qty_type, 0, 0, 0, qty_type, 0, total_amount))

    conn.commit()
    conn.close()
    print("Seeding completed.")

if __name__ == "__main__":
    seed_yearly_data()
