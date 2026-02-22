from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from backend.models import DailySale, Base

# Adjust path if needed, assuming running from project root
DATABASE_URL = "sqlite:///./backend/goods_distributor.db"


def check_db(db_path, check_name):
    print(f"\n--- Checking {check_name} ({db_path}) ---")
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        sales = db.query(DailySale).all()
        total_due = sum(s.due for s in sales)
        print(f"Sales Count: {len(sales)}")
        print(f"Total Due: {total_due}")
        
        # Check first 3 sales for detail
        for i, sale in enumerate(sales[:3]):
            print(f"Sale {i+1}: Date={sale.date}, Total={sale.total_amount}, Paid={sale.cash_received}, Due={sale.due}")
            
    except Exception as e:
        print(f"Error reading {check_name}: {e}")

check_db("./goods_distributor.db", "Root DB")
check_db("./backend/goods_distributor.db", "Backend DB")

