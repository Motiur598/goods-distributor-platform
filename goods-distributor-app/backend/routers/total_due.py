from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List
from datetime import date, datetime
import models, schemas, database

router = APIRouter(
    prefix="/total-due",
    tags=["total-due"],
)

@router.get("/groups")
def get_groups_total_due(db: Session = Depends(database.get_db)):
    """
    Get all groups with their calculated total due.
    Total Due = (Total Remarks - Paid Remarks) + (Total Commissions - Paid Commissions)
    Note: Product Taken Due is excluded from this header total as per user request.
    """
    groups = db.query(models.Group).all()
    result = []
    
    for group in groups:
        # 1. Commissions
        commissions_total = db.query(func.sum(models.DailySale.commission)).filter(
            models.DailySale.group_id == group.id
        ).scalar() or 0.0
        
        commissions_paid = db.query(func.sum(models.GroupPayment.amount)).filter(
            models.GroupPayment.group_id == group.id,
            models.GroupPayment.payment_type == 'commission'
        ).scalar() or 0.0
        
        # 2. Remarks
        remarks_total = db.query(func.sum(models.SaleRemark.amount))\
            .join(models.DailySale, models.SaleRemark.daily_sale_id == models.DailySale.id)\
            .filter(models.DailySale.group_id == group.id).scalar() or 0.0
            
        remarks_paid = db.query(func.sum(models.GroupPayment.amount)).filter(
            models.GroupPayment.group_id == group.id,
            models.GroupPayment.payment_type == 'remark'
        ).scalar() or 0.0
            
        total_due = (commissions_total - commissions_paid) + (remarks_total - remarks_paid)
        
        group_dict = {
            "id": group.id,
            "name": group.name,
            "total_due": total_due
        }
        result.append(group_dict)
        
    return result

@router.get("/{group_id}/commissions")
def get_group_commissions(group_id: int, db: Session = Depends(database.get_db)):
    """
    Fetch commissions with paid status.
    """
    sales = db.query(models.DailySale).filter(
        models.DailySale.group_id == group_id,
        models.DailySale.commission != 0
    ).order_by(desc(models.DailySale.date)).all()
    
    total_commission = sum(s.commission for s in sales)
    
    paid_commission = db.query(func.sum(models.GroupPayment.amount)).filter(
        models.GroupPayment.group_id == group_id,
        models.GroupPayment.payment_type == 'commission'
    ).scalar() or 0.0
    
    return {
        "total_commission": total_commission,
        "paid_commission": paid_commission,
        "remaining_commission": total_commission - paid_commission,
        "items": [
            {
                "date": s.date,
                "amount": s.commission,
                "day_name": s.date.strftime("%A")
            }
            for s in sales
        ]
    }

@router.get("/{group_id}/remarks")
def get_group_remarks(group_id: int, db: Session = Depends(database.get_db)):
    """
    Fetch remarks with paid status.
    """
    remarks = db.query(models.SaleRemark, models.DailySale.date)\
        .join(models.DailySale, models.SaleRemark.daily_sale_id == models.DailySale.id)\
        .filter(models.DailySale.group_id == group_id)\
        .order_by(desc(models.DailySale.date)).all()
        
    total_remarks = sum(r[0].amount for r in remarks)
    
    paid_remarks = db.query(func.sum(models.GroupPayment.amount)).filter(
        models.GroupPayment.group_id == group_id,
        models.GroupPayment.payment_type == 'remark'
    ).scalar() or 0.0
    
    return {
        "total_remarks": total_remarks,
        "paid_remarks": paid_remarks,
        "remaining_remarks": total_remarks - paid_remarks,
        "items": [
            {
                "id": r[0].id,
                "date": r[1],
                "day_name": r[1].strftime("%A"),
                "comment": r[0].comment,
                "amount": r[0].amount,
                "paid_amount": r[0].paid_amount or 0.0,
                "is_fully_paid": r[0].is_fully_paid or 0
            }
            for r in remarks
        ]
    }

@router.post("/remarks/{remark_id}/pay")
def pay_remark(remark_id: int, payment: schemas.GroupPaymentCreate, db: Session = Depends(database.get_db)):
    remark = db.query(models.SaleRemark).filter(models.SaleRemark.id == remark_id).first()
    if not remark:
        raise HTTPException(status_code=404, detail="Remark not found")
        
    current_paid = remark.paid_amount or 0.0
    if current_paid + payment.amount > remark.amount + 0.01: # Small buffer for float
        raise HTTPException(status_code=400, detail="Payment exceeds remaining amount")
        
    # Update remark
    remark.paid_amount = current_paid + payment.amount
    if remark.paid_amount >= remark.amount - 0.01:
        remark.is_fully_paid = 1
        
    # Create GroupPayment for Global Tracking
    new_payment = models.GroupPayment(
        group_id=payment.group_id,
        amount=payment.amount,
        payment_type='remark',
        date=datetime.strptime(payment.date, "%Y-%m-%d").date() if payment.date else date.today()
    )
    db.add(new_payment)
    
    db.commit()
    return {"message": "Payment recorded", "paid_amount": remark.paid_amount, "is_fully_paid": remark.is_fully_paid}

@router.post("/{group_id}/pay-generic", response_model=schemas.GroupPaymentResponse)
def pay_group_generic(group_id: int, payment: schemas.GroupPaymentCreate, db: Session = Depends(database.get_db)):
    """
    Pay off details (Commissions or Remarks).
    """
    if payment.group_id != group_id:
        raise HTTPException(status_code=400, detail="Group ID mismatch")
    
    new_payment = models.GroupPayment(
        group_id=payment.group_id,
        amount=payment.amount,
        payment_type=payment.payment_type,
        date=datetime.strptime(payment.date, "%Y-%m-%d").date() if payment.date else date.today()
    )
    
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    return new_payment

@router.get("/{group_id}/product-taken", response_model=List[schemas.ProductTakenResponse])
def get_group_product_taken(group_id: int, db: Session = Depends(database.get_db)):
    """
    List products taken by this group that are NOT fully paid.
    """
    items = db.query(models.ProductTaken).filter(
        models.ProductTaken.group_id == group_id,
        models.ProductTaken.is_fully_paid == 0
    ).all()
    
    # Populate quantity_type from relationship
    result = []
    for item in items:
        item_dict = {
            "id": item.id,
            "group_id": item.group_id,
            "product_id": item.product_id,
            "product_name": item.product_name,
            "quantity": item.quantity,
            "quantity_type": item.product.quantity_type if item.product else "box",
            "pieces_per_quantity": item.product.pieces_per_quantity if item.product else 1,
            "pieces": item.pieces,
            "total_price": item.total_price,
            "paid_amount": item.paid_amount,
            "date": item.date,
            "is_fully_paid": item.is_fully_paid
        }
        result.append(item_dict)
        
    return result

@router.post("/product-taken", response_model=schemas.ProductTakenResponse)
def add_product_taken(item: schemas.ProductTakenCreate, db: Session = Depends(database.get_db)):
    # 1. Deduct from Stock
    product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Check dimensions
    pieces_per_qty = product.pieces_per_quantity or 1
    total_pieces_needed = (item.quantity * pieces_per_qty) + item.pieces
    total_pieces_stock = (product.quantity_value * pieces_per_qty) + product.pieces_quantity
    
    if total_pieces_needed > total_pieces_stock:
        raise HTTPException(status_code=400, detail="Insufficient stock")
        
    # Deduct stock
    remaining_pieces = total_pieces_stock - total_pieces_needed
    product.quantity_value = remaining_pieces // pieces_per_qty
    product.pieces_quantity = remaining_pieces % pieces_per_qty
    
    # 2. Create Record
    new_item = models.ProductTaken(
        group_id=item.group_id,
        product_id=item.product_id,
        product_name=product.name,
        quantity=item.quantity,
        pieces=item.pieces,
        total_price=item.total_price,
        paid_amount=0.0,
        date=datetime.strptime(item.date, "%Y-%m-%d").date() if item.date else date.today()
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.post("/product-taken/{id}/pay")
def pay_product_taken(id: int, payment: schemas.ProductTakenPay, db: Session = Depends(database.get_db)):
    item = db.query(models.ProductTaken).filter(models.ProductTaken.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    item.paid_amount += payment.amount
    
    if item.paid_amount >= item.total_price:
        item.is_fully_paid = 1
        
    db.commit()
    return {"message": "Payment recorded", "paid_amount": item.paid_amount, "is_fully_paid": item.is_fully_paid}

@router.post("/product-taken/{id}/return")
def return_product_taken(id: int, return_data: schemas.ProductTakenReturn, db: Session = Depends(database.get_db)):
    item = db.query(models.ProductTaken).filter(models.ProductTaken.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # 1. Restore Stock
    product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
    if product:
        pieces_per_qty = product.pieces_per_quantity or 1
        current_stock_pieces = (product.quantity_value * pieces_per_qty) + product.pieces_quantity
        return_pieces = (return_data.quantity * pieces_per_qty) + return_data.pieces
        
        new_stock_pieces = current_stock_pieces + return_pieces
        product.quantity_value = new_stock_pieces // pieces_per_qty
        product.pieces_quantity = new_stock_pieces % pieces_per_qty
    
    # 2. Update ProductTaken Record
    total_original_pieces = (item.quantity * (product.pieces_per_quantity or 1)) + item.pieces
    if total_original_pieces == 0: total_original_pieces = 1 # avoid div 0
    
    price_per_piece = item.total_price / total_original_pieces
    
    return_pieces_count = (return_data.quantity * (product.pieces_per_quantity or 1)) + return_data.pieces
    refund_amount = return_pieces_count * price_per_piece
    
    item.total_price -= refund_amount
    if item.total_price < 0: item.total_price = 0
    
    # Reduce recorded quantity
    current_item_pieces = (item.quantity * (product.pieces_per_quantity or 1)) + item.pieces
    new_item_pieces = current_item_pieces - return_pieces_count
    if new_item_pieces < 0: new_item_pieces = 0
    
    item.quantity = new_item_pieces // (product.pieces_per_quantity or 1)
    item.pieces = new_item_pieces % (product.pieces_per_quantity or 1)
    
    # Check if fully paid
    if item.paid_amount >= item.total_price:
        item.is_fully_paid = 1
        
    db.commit()
    return {"message": "Return processed", "new_total_price": item.total_price}
