from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import date
import models, schemas, database

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
)
print("DEBUG: Loading reports router...")

@router.get("/monthly/{group_id}", response_model=schemas.MonthlyReportResponse)
def get_monthly_sales(group_id: int, month: int, year: int, db: Session = Depends(database.get_db)):
    sales = db.query(models.DailySale).filter(
        models.DailySale.group_id == group_id,
        extract('month', models.DailySale.date) == month,
        extract('year', models.DailySale.date) == year
    ).all()
    
    total_sales = sum(s.total_amount for s in sales)
    return {"sales": sales, "total_sales": total_sales}

@router.get("/yearly/{group_id}")
def get_yearly_sales(group_id: int, year: int, db: Session = Depends(database.get_db)):
    try:
        # distinct months
        # SQLite specific: strftime('%m', date)
        # SQLAlchemy extract('year', ...) compiles to strftime('%Y', ...) on sqlite usually
        
        monthly_sales = db.query(
            func.strftime("%m", models.DailySale.date).label("month"),
            func.sum(models.DailySale.total_amount).label("total")
        ).filter(
            models.DailySale.group_id == group_id,
            extract('year', models.DailySale.date) == year
        ).group_by(func.strftime("%m", models.DailySale.date)).all()
        
        # Convert to list of dicts
        result = [
            {"month": row.month, "total": row.total}
            for row in monthly_sales
        ]
        
        return result
    except Exception as e:
        print(f"Error in get_yearly_sales: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/expense", response_model=schemas.ExpenseCreate)
def add_expense(expense: schemas.ExpenseCreate, db: Session = Depends(database.get_db)):
    new_expense = models.Expense(
        description=expense.description,
        amount=expense.amount,
        date=expense.date
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return new_expense

@router.get("/profit/daily/{date}")
def get_daily_profit(date: date, db: Session = Depends(database.get_db)):
    # Calculate profit: (Total Sell Price - Total Buy Price) - Expense
    
    sales = db.query(models.DailySale).filter(models.DailySale.date == date).all()
    
    total_revenue = 0.0 # From Stock Table Sell Prices (Calculated)
    total_cost_goods_sold = 0.0 # From Stock Table Buy Prices (Calculated)
    
    for sale in sales:
        for item in sale.sale_items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if not product:
                continue
            
            # --- Sell Price Calculation (from Stock Table) ---
            # Formula: (Sold Type Qty * Sell Price Per Type) + (Sold Piece Qty * Sell Price Per Piece)
            sell_price_total = (
                (item.sold_type_qty * product.sell_price_per_type) + 
                (item.sold_piece_qty * product.sell_price_per_piece)
            )
            
            # --- Buy Price Calculation (from Stock Table) ---
            # Formula: (Sold Type Qty * Buy Price Per Type) + (Sold Piece Qty * Buy Price Per Piece)
            # Derived Buy Prices:
            # - Buy Price Per Piece = product.buy_price_avg
            # - Buy Price Per Type = product.buy_price_avg * product.pieces_per_quantity
            
            buy_price_per_piece = product.buy_price_avg
            buy_price_per_type = product.buy_price_avg * product.pieces_per_quantity
            
            buy_price_total = (
                (item.sold_type_qty * buy_price_per_type) + 
                (item.sold_piece_qty * buy_price_per_piece)
            )
            
            total_revenue += sell_price_total
            total_cost_goods_sold += buy_price_total

    # Expenses
    expenses = db.query(models.Expense).filter(models.Expense.date == date).all()
    total_expense = sum(e.amount for e in expenses)
    
    gross_profit = total_revenue - total_cost_goods_sold
    net_profit = gross_profit - total_expense
    
    return {
        "date": date,
        "revenue": total_revenue, # Returns the Calculated Sell Price Revenue
        "cogs": total_cost_goods_sold,
        "gross_profit": gross_profit,
        "expense": total_expense,
        "net_profit": net_profit,
        "expenses_list": [{"id": e.id, "description": e.description, "amount": e.amount} for e in expenses]
    }

@router.get("/dashboard")
def get_dashboard_metrics(db: Session = Depends(database.get_db)):
    today = date.today()
    current_year = today.year
    current_month = today.month
    
    # 1. Total Sell This Year
    sales_year = db.query(models.DailySale).filter(
        extract('year', models.DailySale.date) == current_year
    ).all()
    total_sell_year = sum(s.total_amount for s in sales_year)
    
    # 2. Total Sell This Month
    sales_month = [s for s in sales_year if s.date.month == current_month]
    total_sell_month = sum(s.total_amount for s in sales_month)
    
    # 3. Total Due (Commissions + Remarks - Payments)
    # Commissions
    total_commissions = db.query(func.sum(models.DailySale.commission)).scalar() or 0.0
    paid_commissions = db.query(func.sum(models.GroupPayment.amount)).filter(
        models.GroupPayment.payment_type == 'commission'
    ).scalar() or 0.0
    
    # Remarks
    total_remarks = db.query(func.sum(models.SaleRemark.amount)).scalar() or 0.0
    paid_remarks = db.query(func.sum(models.GroupPayment.amount)).filter(
        models.GroupPayment.payment_type == 'remark'
    ).scalar() or 0.0
    
    total_due = (total_commissions - paid_commissions) + (total_remarks - paid_remarks)
    
    # 4. Profit Calculations (Year & Month)
    # Helper to calculate profit for a list of sales and expenses
    def calculate_profit(sales_list, start_date=None, end_date=None):
        revenue = sum(s.total_amount for s in sales_list)
        
        # Expenses
        expense_query = db.query(models.Expense)
        if start_date and end_date:
            expense_query = expense_query.filter(models.Expense.date >= start_date, models.Expense.date <= end_date)
        elif start_date: # Year filter approximation
             expense_query = expense_query.filter(extract('year', models.Expense.date) == start_date.year)
             if end_date: # Month filter
                 expense_query = expense_query.filter(extract('month', models.Expense.date) == start_date.month)

        # Re-doing expense query properly based on passed sales scope is tricky without date ranges.
        # Let's use the dates from sales to bound expenses? No, sales might not exist every day.
        # Better: Filter expenses by Year/Month independently.
        return 0 # Placeholder, logic below is better
        
    # Yearly Expenses
    expenses_year = db.query(func.sum(models.Expense.amount)).filter(
        extract('year', models.Expense.date) == current_year
    ).scalar() or 0.0
    
    # Monthly Expenses
    expenses_month = db.query(func.sum(models.Expense.amount)).filter(
        extract('year', models.Expense.date) == current_year,
        extract('month', models.Expense.date) == current_month
    ).scalar() or 0.0
    
    # COGS Calculation (Year)
    cogs_year = 0.0
    for sale in sales_year:
        for item in sale.sale_items:
             # Optimization: This N+1 query loop is bad for performance but acceptable for MVP with low data volume.
             # Eager loading would be better.
             product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
             if product:
                 pieces = (item.sold_type_qty * product.pieces_per_quantity) + item.sold_piece_qty
                 cogs_year += pieces * product.buy_price_avg

    # COGS Calculation (Month)
    cogs_month = 0.0
    for sale in sales_month:
        for item in sale.sale_items:
             product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
             if product:
                 pieces = (item.sold_type_qty * product.pieces_per_quantity) + item.sold_piece_qty
                 cogs_month += pieces * product.buy_price_avg
                 
    total_profit_year = total_sell_year - cogs_year - expenses_year
    profit_month = total_sell_month - cogs_month - expenses_month
    
    return {
        "totalSellYear": total_sell_year,
        "totalSellMonth": total_sell_month,
        "totalProfitYear": total_profit_year,
        "profitMonth": profit_month,
        "totalDue": total_due
    }

# Helper for profit calc
def _calculate_sales_profit(sales, db):
    revenue = 0.0
    cogs = 0.0
    for sale in sales:
        for item in sale.sale_items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if not product:
                continue
            
            # Sell Price
            revenue += (item.sold_type_qty * product.sell_price_per_type) + (item.sold_piece_qty * product.sell_price_per_piece)
            
            # Buy Price
            buy_price_per_piece = product.buy_price_avg
            buy_price_per_type = product.buy_price_avg * product.pieces_per_quantity
            cogs += (item.sold_type_qty * buy_price_per_type) + (item.sold_piece_qty * buy_price_per_piece)
            
    return revenue, cogs

@router.get("/profit/monthly/{year}/{month}")
def get_monthly_profit_report(year: int, month: int, db: Session = Depends(database.get_db)):
    import calendar
    
    # Get all days in month
    num_days = calendar.monthrange(year, month)[1]
    
    daily_profits = []
    
    # Optimize: Fetch all sales and expenses for the month once
    sales_month = db.query(models.DailySale).filter(
        extract('year', models.DailySale.date) == year,
        extract('month', models.DailySale.date) == month
    ).all()
    
    expenses_month = db.query(models.Expense).filter(
        extract('year', models.Expense.date) == year,
        extract('month', models.Expense.date) == month
    ).all()
    
    for day in range(1, num_days + 1):
        current_date = date(year, month, day)
        
        # Filter for day
        day_sales = [s for s in sales_month if s.date == current_date]
        day_expenses = [e for e in expenses_month if e.date == current_date]
        
        revenue, cogs = _calculate_sales_profit(day_sales, db)
        expense_total = sum(e.amount for e in day_expenses)
        
        net_profit = revenue - cogs - expense_total
        
        daily_profits.append({
            "date": current_date,
            "revenue": revenue,
            "cogs": cogs,
            "expense": expense_total,
            "net_profit": net_profit
        })
        
    return daily_profits

@router.get("/profit/yearly/{year}")
def get_yearly_profit_report(year: int, db: Session = Depends(database.get_db)):
    monthly_profits = []
    
    sales_year = db.query(models.DailySale).filter(
        extract('year', models.DailySale.date) == year
    ).all()
    
    expenses_year = db.query(models.Expense).filter(
        extract('year', models.Expense.date) == year
    ).all()
    
    for month in range(1, 13):
        month_sales = [s for s in sales_year if s.date.month == month]
        month_expenses = [e for e in expenses_year if e.date.month == month]
        
        revenue, cogs = _calculate_sales_profit(month_sales, db)
        expense_total = sum(e.amount for e in month_expenses)
        
        net_profit = revenue - cogs - expense_total
        
        monthly_profits.append({
            "month": month,
            "revenue": revenue,
            "cogs": cogs,
            "expense": expense_total,
            "net_profit": net_profit
        })
        
    return monthly_profits

@router.get("/profit/lifetime")
def get_lifetime_profit(db: Session = Depends(database.get_db)):
    # 1. Get All Sales
    sales = db.query(models.DailySale).all()
    
    # 2. Calculate Revenue & COGS
    revenue, cogs = _calculate_sales_profit(sales, db)
    
    # 3. Get All Expenses
    total_expense = db.query(func.sum(models.Expense.amount)).scalar() or 0.0
    
    # 4. Calculate Net Profit
    net_profit = revenue - cogs - total_expense
    
    return {
        "revenue": revenue,
        "cogs": cogs,
        "expense": total_expense,
        "net_profit": net_profit
    }



@router.post("/target", response_model=schemas.MonthlyTargetResponse)
def set_monthly_target(target: schemas.MonthlyTargetCreate, db: Session = Depends(database.get_db)):
    # Check if target exists
    db_target = db.query(models.MonthlyTarget).filter(
        models.MonthlyTarget.group_id == target.group_id,
        models.MonthlyTarget.month == target.month
    ).first()
    
    if db_target:
        db_target.target_amount = target.target_amount
    else:
        db_target = models.MonthlyTarget(
            group_id=target.group_id,
            month=target.month,
            target_amount=target.target_amount
        )
        db.add(db_target)
    
    db.commit()
    db.refresh(db_target)
    return db_target

@router.get("/target/{group_id}/{month}", response_model=schemas.MonthlyTargetResponse)
def get_monthly_target(group_id: int, month: str, db: Session = Depends(database.get_db)):
    db_target = db.query(models.MonthlyTarget).filter(
        models.MonthlyTarget.group_id == group_id,
        models.MonthlyTarget.month == month
    ).first()
    
    if not db_target:
        # Return default with 0 amount. Using id=0 to indicate transient.
        return schemas.MonthlyTargetResponse(id=0, group_id=group_id, month=month, target_amount=0.0)
        
    return db_target

@router.get("/dashboard/chart")
def get_dashboard_chart_data(db: Session = Depends(database.get_db)):
    today = date.today()
    current_year = today.year
    
    # Initialize all 12 months with 0
    chart_data = []
    for month in range(1, 13):
        chart_data.append({
            "name": date(current_year, month, 1).strftime("%b"), # Jan, Feb...
            "month_num": month,
            "sales": 0.0,
            "target": 0.0
        })
        
    # 1. Get Monthly Sales for current year
    monthly_sales = db.query(
        func.strftime("%m", models.DailySale.date).label("month"),
        func.sum(models.DailySale.total_amount).label("total")
    ).filter(
        extract('year', models.DailySale.date) == current_year
    ).group_by(func.strftime("%m", models.DailySale.date)).all()
    
    for row in monthly_sales:
        month_idx = int(row.month) - 1
        if 0 <= month_idx < 12:
            chart_data[month_idx]["sales"] = row.total

    # 2. Get Monthly Targets for current year (All Groups Summed? Or Average?)
    # The chart seems to be global. So we should sum targets of all groups for that month?
    # Or is there a main target? The user "selected target and actual sell (selected from monthly sells)".
    # If the user selects a group in Reports, that's specific. But Dashboard is usually global.
    # PROPOSAL: Sum all targets for the month across all groups.
    
    monthly_targets = db.query(
        models.MonthlyTarget.month,
        func.sum(models.MonthlyTarget.target_amount).label("total_target")
    ).filter(
        models.MonthlyTarget.month.like(f"{current_year}-%")
    ).group_by(models.MonthlyTarget.month).all()
    
    for row in monthly_targets:
        # row.month is "YYYY-MM"
        try:
            parts = row.month.split('-')
            if len(parts) == 2:
                m_year = int(parts[0])
                m_month = int(parts[1])
                if m_year == current_year:
                    month_idx = m_month - 1
                    if 0 <= month_idx < 12:
                        chart_data[month_idx]["target"] = row.total_target
        except:
            pass
            
    return chart_data

@router.get("/dashboard/top-products")
def get_top_products(db: Session = Depends(database.get_db)):
    # Calculate total quantity sold for each product across all groups
    # We need to sum up (sold_type_qty * pieces_per_quantity + sold_piece_qty) for each product
    
    # SQLAlchemy query
    # Join SaleItem -> Product -> Group
    # Group by Product.id
    # Order by total_sold desc
    # Limit 5
    
    results = db.query(
        models.Product.name,
        models.Group.name.label("group_name"),
        func.sum(
            models.SaleItem.sold_type_qty * models.Product.pieces_per_quantity + 
            models.SaleItem.sold_piece_qty
        ).label("total_sold_pieces")
    ).join(models.Product, models.SaleItem.product_id == models.Product.id)\
     .join(models.Group, models.Product.group_id == models.Group.id)\
     .group_by(models.Product.id)\
     .order_by(func.sum(
        models.SaleItem.sold_type_qty * models.Product.pieces_per_quantity + 
        models.SaleItem.sold_piece_qty
     ).desc())\
     .limit(5)\
     .all()
     
    # Format response
    top_products = []
    for row in results:
        top_products.append({
            "group": row.group_name,
            "name": row.name,
            "sold": int(row.total_sold_pieces) if row.total_sold_pieces else 0
        })
        
    return top_products
