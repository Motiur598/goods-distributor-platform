from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

# Group Schemas
class GroupBase(BaseModel):
    name: str

class GroupCreate(GroupBase):
    pass

class GroupResponse(GroupBase):
    id: int
    total_stock_value: float = 0.0
    class Config:
        from_attributes = True

# Product Schemas
class ProductBase(BaseModel):
    name: str
    weight_type: str
    weight_value: float
    quantity_type: str
    quantity_value: int
    pieces_per_quantity: int
    pieces_quantity: int
    buy_price_avg: float
    sell_price_per_type: float
    sell_price_per_piece: float

class ProductCreate(ProductBase):
    group_id: int

class ProductUpdate(BaseModel):
    weight_type: Optional[str] = None
    weight_value: Optional[float] = None
    quantity_type: Optional[str] = None
    quantity_value: Optional[int] = None
    pieces_per_quantity: Optional[int] = None
    pieces_quantity: Optional[int] = None
    buy_price_avg: Optional[float] = None
    sell_price_per_type: Optional[float] = None
    sell_price_per_piece: Optional[float] = None

class ProductResponse(ProductBase):
    id: int
    group_id: int
    class Config:
        from_attributes = True

# Stock Transaction Schema
class StockTransaction(BaseModel):
    quantity_value: int
    pieces_quantity: int
    buy_price_total: float # Total price for the batch being added
    sell_price_per_type: float
    sell_price_per_piece: float

# Sale Schemas
class SaleItemBase(BaseModel):
    product_id: int
    request_type_qty: int
    request_piece_qty: int
    return_type_qty: int
    return_piece_qty: int

class SaleItemCreate(SaleItemBase):
    pass

class SaleItemResponse(SaleItemBase):
    id: int
    sold_type_qty: int
    sold_piece_qty: int
    price: float
    product: Optional[ProductResponse] = None
    class Config:
        from_attributes = True

class DailySaleBase(BaseModel):
    group_id: int
    date: date
    cash_received: float

class DailySaleCreate(DailySaleBase):
    sale_items: List[SaleItemCreate]
    remarks: List[dict] # {comment: str, amount: float}
    status: Optional[str] = "draft"
    
class SaleRemarkResponse(BaseModel):
    comment: str
    amount: float
    class Config:
        from_attributes = True

class DailySaleResponse(DailySaleBase):
    id: int
    total_amount: float
    due: float
    commission: float
    status: str
    is_locked: int
    sale_items: List[SaleItemResponse]
    remarks: List[SaleRemarkResponse] = []
    class Config:
        from_attributes = True

class MonthlyReportResponse(BaseModel):
    sales: List[DailySaleResponse]
    total_sales: float
    class Config:
        from_attributes = True

# Expense & Target
class ExpenseCreate(BaseModel):
    description: str
    amount: float
    date: date

class TargetCreate(BaseModel):
    month: str
    target_amount: float

class MonthlyTargetCreate(BaseModel):
    group_id: int
    month: str
    target_amount: float

class MonthlyTargetResponse(BaseModel):
    id: int
    group_id: int
    month: str
    target_amount: float
    class Config:
        from_attributes = True

class ProductTakenCreate(BaseModel):
    group_id: int
    product_id: int
    quantity: int
    pieces: int
    total_price: float
    date: str = None # Optional, defaults to today if null

class ProductTakenPay(BaseModel):
    amount: float

class ProductTakenReturn(BaseModel):
    quantity: int
    pieces: int

class ProductTakenResponse(BaseModel):
    id: int
    group_id: int
    product_id: int
    product_name: str
    quantity: int
    quantity_type: Optional[str] = "box" # Added field
    pieces_per_quantity: Optional[int] = 1 # Added field for validation
    pieces: int
    total_price: float
    paid_amount: float
    date: date
    is_fully_paid: int
    
    class Config:
        from_attributes = True

class ProductHistoryResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    group_name: str
    action: str
    description: str
    timestamp: datetime
    class Config:
        from_attributes = True

class GroupPaymentCreate(BaseModel):
    group_id: int
    amount: float
    payment_type: str # 'commission' or 'remark'
    date: str = None # YYYY-MM-DD

class GroupPaymentResponse(BaseModel):
    id: int
    group_id: int
    amount: float
    payment_type: str
    date: date
    class Config:
        from_attributes = True
