from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    
    products = relationship("Product", back_populates="group", cascade="all, delete-orphan")
    daily_sales = relationship("DailySale", back_populates="group", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    name = Column(String, index=True)
    
    # Weight
    weight_type = Column(String)  # 'g', 'kg', 'ml', 'L'
    weight_value = Column(Float)
    
    # Quantity
    quantity_type = Column(String) # 'Cartoon', 'Dozon', 'Poly', 'pieces'
    quantity_value = Column(Integer, default=0) # Number of 'types' (e.g. 5 Cartons)
    pieces_per_quantity = Column(Integer, default=1) # How many pieces in one 'type'
    pieces_quantity = Column(Integer, default=0) # Remainder pieces
    
    # Pricing
    buy_price_avg = Column(Float, default=0.0)
    sell_price_per_type = Column(Float, default=0.0)
    sell_price_per_piece = Column(Float, default=0.0)
    
    group = relationship("Group", back_populates="products")

class ProductHistory(Base):
    __tablename__ = "product_history"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, nullable=True) # Keep ID for reference but allow null if deleted (or just store ID)
    product_name = Column(String)
    group_name = Column(String)
    action = Column(String) # 'Added', 'Deleted', 'Purchased/Returned'
    description = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)


class DailySale(Base):
    __tablename__ = "daily_sales"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    date = Column(Date, default=datetime.utcnow().date)
    
    total_amount = Column(Float, default=0.0)
    cash_received = Column(Float, default=0.0)
    due = Column(Float, default=0.0)
    commission = Column(Float, default=0.0)
    status = Column(String, default="draft") # 'draft', 'pending', 'completed'
    final_profit = Column(Float, default=0.0) # Calculated at end of day
    
    is_locked = Column(Integer, default=0) # 0: Editable, 1: Locked/Saved

    group = relationship("Group", back_populates="daily_sales")
    sale_items = relationship("SaleItem", back_populates="daily_sale")
    remarks = relationship("SaleRemark", back_populates="daily_sale")

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    daily_sale_id = Column(Integer, ForeignKey("daily_sales.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    
    request_type_qty = Column(Integer, default=0)
    request_piece_qty = Column(Integer, default=0)
    
    return_type_qty = Column(Integer, default=0)
    return_piece_qty = Column(Integer, default=0)
    
    sold_type_qty = Column(Integer, default=0)
    sold_piece_qty = Column(Integer, default=0)
    
    price = Column(Float, default=0.0)

    daily_sale = relationship("DailySale", back_populates="sale_items")
    product = relationship("Product")

class SaleRemark(Base):
    __tablename__ = "sale_remarks"
    
    id = Column(Integer, primary_key=True, index=True)
    daily_sale_id = Column(Integer, ForeignKey("daily_sales.id"))
    comment = Column(String)
    amount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    is_fully_paid = Column(Integer, default=0) # 0 or 1
    
    daily_sale = relationship("DailySale", back_populates="remarks")

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, default=datetime.utcnow().date)
    description = Column(String)
    amount = Column(Float, default=0.0)

class Target(Base):
    __tablename__ = "targets"
    
    id = Column(Integer, primary_key=True, index=True)
    month = Column(String) # "February-2026"
    target_amount = Column(Float, default=0.0)

class MonthlyTarget(Base):
    __tablename__ = "monthly_targets"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    month = Column(String) # Format: "YYYY-MM"
    target_amount = Column(Float, default=0.0)
    
    # Ensure one target per group per month
    __table_args__ = (
        # UniqueConstraint('group_id', 'month', name='unique_group_month_target'),
    ) 
    # SQLite might need manual handling or naming convention for constraints, but straightforward definition works usually.

class ProductTaken(Base):
    __tablename__ = "products_taken"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    
    # Snapshot of product name in case it's deleted
    product_name = Column(String)
    
    quantity = Column(Integer, default=0) # Number of 'types' (e.g. cartons)
    pieces = Column(Integer, default=0) # Number of pieces
    
    total_price = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    
    date = Column(Date, default=datetime.utcnow().date)
    is_fully_paid = Column(Integer, default=0) # 0 or 1
    
    group = relationship("Group")
    product = relationship("Product")

class GroupPayment(Base):
    __tablename__ = "group_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    amount = Column(Float, default=0.0)
    payment_type = Column(String) # 'commission' or 'remark'
    date = Column(Date, default=datetime.utcnow().date)
    
    group = relationship("Group")
