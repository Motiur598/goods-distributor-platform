from backend.database import SessionLocal
from backend import models
from datetime import date
import sys
import os

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def delete_todays_sales():
    db = SessionLocal()
    today = date.today()
    print(f"Attempting to delete sales for date: {today}")
    
    try:
        # Find sales for today
        sales = db.query(models.DailySale).filter(models.DailySale.date == today).all()
        
        if not sales:
            print("No sales found for today.")
            return

        print(f"Found {len(sales)} sales to delete.")
        
        for sale in sales:
            # Delete related items and remarks first (though cascade might handle it, explicit is safer)
            db.query(models.SaleItem).filter(models.SaleItem.daily_sale_id == sale.id).delete()
            db.query(models.SaleRemark).filter(models.SaleRemark.daily_sale_id == sale.id).delete()
            
            db.delete(sale)
            print(f"Deleted sale ID: {sale.id} for Group ID: {sale.group_id}")
            
        db.commit()
        print("Successfully deleted all sales for today.")
        
    except Exception as e:
        print(f"Error deleting sales: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    delete_todays_sales()
