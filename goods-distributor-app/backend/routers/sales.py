from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
import models, schemas, database
from utils import QuantityHandler

router = APIRouter(
    prefix="/sales",
    tags=["sales"],
)

@router.get("/today/{group_id}", response_model=schemas.DailySaleResponse)
def get_today_sale(group_id: int, db: Session = Depends(database.get_db)):
    today = date.today()
    sale = db.query(models.DailySale).filter(
        models.DailySale.group_id == group_id,
        models.DailySale.date == today
    ).first()
    
    if not sale:
        raise HTTPException(status_code=404, detail="No sale record for today")
        
    return sale

@router.post("/today", response_model=schemas.DailySaleResponse)
def create_or_update_daily_sale(sale_data: schemas.DailySaleCreate, db: Session = Depends(database.get_db)):
    # Check if a sale record exists for this group and date
    # Users can edit "Today's Sale" until it is saved/locked.
    # If it exists and is not locked, we update it.
    
    existing_sale = db.query(models.DailySale).filter(
        models.DailySale.group_id == sale_data.group_id,
        models.DailySale.date == sale_data.date
    ).first()
    
    if existing_sale and existing_sale.is_locked:
        raise HTTPException(status_code=400, detail="Sale record for this date is locked and cannot be edited.")

    if existing_sale:
        # Update logic: remove old items/remarks and add new ones (simplest approach for full form submission)
        # Detailed update logic might be better but for MVP replacing items is easier
        db.query(models.SaleItem).filter(models.SaleItem.daily_sale_id == existing_sale.id).delete()
        db.query(models.SaleRemark).filter(models.SaleRemark.daily_sale_id == existing_sale.id).delete()
        
        daily_sale = existing_sale
        daily_sale.cash_received = sale_data.cash_received
        if sale_data.status:
            daily_sale.status = sale_data.status
    else:
        # Create new
        daily_sale = models.DailySale(
            group_id=sale_data.group_id,
            date=sale_data.date,
            cash_received=sale_data.cash_received,
            status=sale_data.status or "draft"
        )
        db.add(daily_sale)
        db.commit()
        db.refresh(daily_sale)
        
    total_amount = 0.0
    
    # Process Sale Items
    for item in sale_data.sale_items:
        # Calculate Sold Quantity: Request - Return
        # We need product details to know piece logic
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            continue

        pieces_per_qty = product.pieces_per_quantity
        
        # Request Total Pieces
        req_total = QuantityHandler.total_pieces(item.request_type_qty, item.request_piece_qty, pieces_per_qty)
        # Return Total Pieces
        ret_total = QuantityHandler.total_pieces(item.return_type_qty, item.return_piece_qty, pieces_per_qty)
        
        sold_total = req_total - ret_total
        if sold_total < 0:
            raise HTTPException(status_code=400, detail=f"Return quantity cannot be greater than request for {product.name}")
            
        sold_type_qty = sold_total // pieces_per_qty
        sold_piece_qty = sold_total % pieces_per_qty
        
        # Calculate Price
        # Sold Type * Sell Price Type + Sold Piece * Sell Price Piece
        item_price = (sold_type_qty * product.sell_price_per_type) + (sold_piece_qty * product.sell_price_per_piece)
        total_amount += item_price
        
        new_item = models.SaleItem(
            daily_sale_id=daily_sale.id,
            product_id=product.id,
            request_type_qty=item.request_type_qty,
            request_piece_qty=item.request_piece_qty,
            return_type_qty=item.return_type_qty,
            return_piece_qty=item.return_piece_qty,
            sold_type_qty=sold_type_qty,
            sold_piece_qty=sold_piece_qty,
            price=item_price
        )
        db.add(new_item)
        
    daily_sale.total_amount = total_amount
    
    # Process Remarks
    remarks_total = 0.0
    for remark in sale_data.remarks:
        new_remark = models.SaleRemark(
            daily_sale_id=daily_sale.id,
            comment=remark['comment'],
            amount=remark['amount']
        )
        db.add(new_remark)
        remarks_total += remark['amount']

    # Recalculate Financials
    # Due = Total Amount - Cash Received (User says: subtract Total Amount from Cash Received... wait)
    # User said: "Due = subtract the total amount... from the Cash received amount" -> Cash - Total ??
    # Usually Due = Total - Cash.
    # Let's check: "Due = subtract the total amount (we just calculate for the price column) from the Cash received amount we just entered."
    # If total = 4000, cash = 3900.
    # "Due = 100 (4000 - 3900)" -> This example contradicts the text "subtract total from cash".
    # 4000 - 3900 = 100. So it is Total - Cash.
    
    daily_sale.due = total_amount - daily_sale.cash_received
    
    # Remarks logic: "Due = subtract the previous Due amount from the Remarks amount"
    # Example: prev Due 4000, remarks 3900 => Due = 100.
    # So Final Due = Initial Due - Remarks Amount.
    
    daily_sale.due = daily_sale.due - remarks_total
    
    # Commission = Remaining Due?
    # "SR commission... will be the remaining after adding or subtracting all works... the remaining Due amount"
    daily_sale.commission = daily_sale.due
    
    db.commit()
    db.refresh(daily_sale)
    return daily_sale

@router.post("/{sale_id}/lock", response_model=schemas.DailySaleResponse)
def lock_daily_sale(sale_id: int, db: Session = Depends(database.get_db)):
    sale = db.query(models.DailySale).filter(models.DailySale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    if sale.is_locked:
        raise HTTPException(status_code=400, detail="Sale already locked")
        
    # Subtract Stock Logic
    for item in sale.sale_items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            continue
            
        # Subtract sold quantity from product stock
        # Convert everything to pieces to handle safely
        current_stock_pieces = QuantityHandler.total_pieces(product.quantity_value, product.pieces_quantity, product.pieces_per_quantity)
        sold_pieces = QuantityHandler.total_pieces(item.sold_type_qty, item.sold_piece_qty, product.pieces_per_quantity)
        
        if sold_pieces > current_stock_pieces:
             raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name} to finalize sale.")
        
        new_stock_pieces = current_stock_pieces - sold_pieces
        
        product.quantity_value = new_stock_pieces // product.pieces_per_quantity
        product.pieces_quantity = new_stock_pieces % product.pieces_per_quantity
        
        # Log History? "record on our history" is mentioned for Add/Delete logic but implied for sales too?
        # "Total sell this month will have the record of each day"
        # Since sales are recorded in DailySale, we might not need ProductHistory unless we want to track stock movement there too.
        # User didn't explicitly ask for Sales to appear in the "Product History" table (the one with 'Added/Deleted').
        # But it affects stock.
        # I'll adding a log for consistency if desired, but for now strict requirements don't force it.
    
    sale.is_locked = 1
    sale.status = 'completed'
    db.commit()
    db.refresh(sale)
    return sale
