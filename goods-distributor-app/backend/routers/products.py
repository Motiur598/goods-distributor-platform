from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database
from utils import QuantityHandler

router = APIRouter(
    prefix="/products",
    tags=["products"],
)

@router.post("/", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product: schemas.ProductCreate, db: Session = Depends(database.get_db)):
    # Normalize quantity
    qty_val, qty_pcs = QuantityHandler.normalize_quantity(
        product.quantity_value, product.pieces_quantity, product.pieces_per_quantity
    )
    
    new_product = models.Product(
        group_id=product.group_id,
        name=product.name,
        weight_type=product.weight_type,
        weight_value=product.weight_value,
        quantity_type=product.quantity_type,
        quantity_value=qty_val,
        pieces_per_quantity=product.pieces_per_quantity,
        pieces_quantity=qty_pcs,
        buy_price_avg=product.buy_price_avg,
        sell_price_per_type=product.sell_price_per_type,
        sell_price_per_piece=product.sell_price_per_piece
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    # Log history
    group = db.query(models.Group).filter(models.Group.id == new_product.group_id).first()
    log = models.ProductHistory(
        product_id=new_product.id,
        product_name=new_product.name,
        group_name=group.name if group else "Unknown",
        action="Added",
        description=f"{new_product.quantity_value}{new_product.quantity_type[0].upper() if new_product.quantity_type else ''} {new_product.pieces_quantity}pc {new_product.name} ({new_product.weight_value}{new_product.weight_type}) were added"
    )
    db.add(log)
    db.commit()
    
    return new_product

@router.get("/group/{group_id}", response_model=List[schemas.ProductResponse])
def read_products_by_group(group_id: int, db: Session = Depends(database.get_db)):
    products = db.query(models.Product).filter(models.Product.group_id == group_id).all()
    return products

@router.put("/{product_id}/add", response_model=schemas.ProductResponse)
def add_product_stock(product_id: int, transaction: schemas.StockTransaction, db: Session = Depends(database.get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # 1. Normalize new stock quantity
    new_qty_val, new_qty_pcs = QuantityHandler.normalize_quantity(
        transaction.quantity_value, transaction.pieces_quantity, product.pieces_per_quantity
    )
    
    # 2. Calculate new weighted average buy price
    current_total_pieces = QuantityHandler.total_pieces(
        product.quantity_value, product.pieces_quantity, product.pieces_per_quantity
    )
    new_total_pieces = QuantityHandler.total_pieces(
        new_qty_val, new_qty_pcs, product.pieces_per_quantity
    )
    
    # CAUTION: The user says "buy price" input for ADD is "whole bought price for the whole Quantity".
    # So transaction.buy_price_total is the TOTAL cost of the new batch.
    # Current buy_price_avg in DB is per PIECE or per WHAT?
    # Let's assume buy_price_avg in DB is PER PIECE for easier calculation.
    
    # product.buy_price_avg is per piece. 
    # Wait, the prompt says "divide the Buy price column into 2 column... per type rate... per piece rate".
    # But for calculation it says: "average of the new buy price and previous buy price".
    # "Average" usually means weighted average in inventory.
    
    # Let's standardize on keeping 'buy_price_avg' as COST PER PIECE in the DB.
    # We can compute the display values on the fly or in the frontend.
    
    # Current Total Cost = current_total_pieces * product.buy_price_avg
    # New Batch Cost = transaction.buy_price_total
    # New Avg Cost Per Piece = (Current Total Cost + New Batch Cost) / (current_total_pieces + new_total_pieces)
    
    new_avg_cost_per_piece = 0.0
    if (current_total_pieces + new_total_pieces) > 0:
        current_total_cost = current_total_pieces * product.buy_price_avg
        new_avg_cost_per_piece = (current_total_cost + transaction.buy_price_total) / (current_total_pieces + new_total_pieces)
    
    # 3. Update Product Stock
    # Add quantities
    total_new_qty_val = product.quantity_value + new_qty_val
    total_new_qty_pcs = product.pieces_quantity + new_qty_pcs
    
    final_qty_val, final_qty_pcs = QuantityHandler.normalize_quantity(
        total_new_qty_val, total_new_qty_pcs, product.pieces_per_quantity
    )
    
    product.quantity_value = final_qty_val
    product.pieces_quantity = final_qty_pcs
    product.buy_price_avg = new_avg_cost_per_piece
    product.sell_price_per_type = transaction.sell_price_per_type
    product.sell_price_per_piece = transaction.sell_price_per_piece
    
    db.commit()
    db.refresh(product)
    
    # Log history
    log = models.ProductHistory(
        product_id=product.id,
        product_name=product.name,
        group_name=product.group.name if product.group else "Unknown",
        action="Added",
        description=f"{new_qty_val}{product.quantity_type[0].upper() if product.quantity_type else ''} {new_qty_pcs}pc {product.name} ({product.weight_value}{product.weight_type}) were added"
    )
    db.add(log)
    db.commit()
    
    return product

@router.put("/{product_id}/purchase", response_model=schemas.ProductResponse)
def purchase_product_stock(product_id: int, transaction: schemas.StockTransaction, db: Session = Depends(database.get_db)):
    """
    "Purchase" in this context means REMOVING stock (e.g. return to vendor).
    It subtracts the quantity.
    """
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Normalize input quantity
    sub_qty_val, sub_qty_pcs = QuantityHandler.normalize_quantity(
        transaction.quantity_value, transaction.pieces_quantity, product.pieces_per_quantity
    )
    
    try:
        # Subtract stock
        # We need to handle borrowing logic if pieces are insufficient
        # Total pieces check
        current_total_pieces = QuantityHandler.total_pieces(
            product.quantity_value, product.pieces_quantity, product.pieces_per_quantity
        )
        sub_total_pieces = QuantityHandler.total_pieces(
            sub_qty_val, sub_qty_pcs, product.pieces_per_quantity
        )
        
        if sub_total_pieces > current_total_pieces:
             raise HTTPException(status_code=400, detail="Insufficient stock to purchase/return")
             
        # Perform subtraction
        remaining_total_pieces = current_total_pieces - sub_total_pieces
        
        final_qty_val = remaining_total_pieces // product.pieces_per_quantity
        final_qty_pcs = remaining_total_pieces % product.pieces_per_quantity
        
        product.quantity_value = final_qty_val
        product.pieces_quantity = final_qty_pcs
        
        # User defined behavior: "purchase button... subtract from the previous quantity... automatically calculate like the buy price... make an average"
        # Wait, if we are REMOVING stock, typically the Moving Average Cost (MAC) doesn't change unless we are removing it at a DIFFERENT cost than our current inventory value.
        # But the prompt says: "it will automatically calculate like the buy price work in the add new product... make an average of the new buy price and previous buy price".
        # This implies the user treats "Purchase" (Stock Out) as somehow affecting value? 
        # OR maybe "Purchase" means "Purchase Return"? 
        # Actually, reading the "Purchase" section again:
        # "it will subtract the new quantity from the previous quantity."
        # AND "Now if we click on the purchase... it will work the same as the add button but now it will subtract... make an average of the new buy price and previous buy price"
        # This is weird. If I return stock, why does my average cost change? 
        # Unless I'm returning it at a specific value that is DIFFERENT (e.g. getting a refund that is different from my cost).
        # Let's assume the user wants to update the average cost based on the 'buy price' they enter during this 'purchase' operation.
        
        # Recalculate Average Cost (Weighted Average)
        # Remaining Stock Value = (Current Stock Value) - (Value of Removed Stock at NEW Rate) ?? 
        # No, Average Cost Formula when REMOVING stock usually doesn't change cost per unit.
        # BUT if the user insists: "make an average of the new buy price and previous buy price".
        # Let's follow the instruction literally: Use the same weighted average logic but with negative quantity?
        # (Total Value Prior - Value Removed) / (Total Qty Prior - Qty Removed) = New Avg?
        # If I remove stock at $X, and my avg was $Y. 
        # New Total Value = (OldQty * OldAvg) - (RemoveQty * RemovePrice)
        # New Avg = New Total Value / New Qty.
        
        current_total_cost = current_total_pieces * product.buy_price_avg
        remove_total_cost = transaction.buy_price_total # total price for the removed batch
        
        new_total_cost = current_total_cost - remove_total_cost
        
        if remaining_total_pieces > 0:
            product.buy_price_avg = new_total_cost / remaining_total_pieces
        else:
            product.buy_price_avg = 0 # Or keep last known?
            
        product.sell_price_per_type = transaction.sell_price_per_type
        product.sell_price_per_piece = transaction.sell_price_per_piece
        
        db.commit()
        db.refresh(product)
        
        # Log history
        log = models.ProductHistory(
            product_id=product.id,
            product_name=product.name,
            group_name=product.group.name if product.group else "Unknown",
            description=f"{sub_qty_val}{product.quantity_type[0].upper() if product.quantity_type else ''} {sub_qty_pcs}pc {product.name} ({product.weight_value}{product.weight_type}) were purchased"
        )
        db.add(log)
        db.commit()
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return product

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(database.get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Log history before delete
    log = models.ProductHistory(
        product_id=product.id,
        product_name=product.name,
        group_name=product.group.name if product.group else "Unknown",
        action="Deleted",
        description=f"{product.quantity_value}{product.quantity_type[0].upper() if product.quantity_type else ''} {product.pieces_quantity}pc {product.name} ({product.weight_value}{product.weight_type}) were Deleted"
    )
    db.add(log) # Add log first
    
    db.delete(product) # Then delete product
    db.commit()
    return None

@router.get("/group/{group_id}/history", response_model=List[schemas.ProductHistoryResponse])
def read_group_history(group_id: int, db: Session = Depends(database.get_db)):
    # Join with Product to filter by group? 
    # ProductHistory has group_name but not group_id.
    # But we can filter by group_name if we knew it, or we should have stored group_id.
    # Current model doesn't store group_id in history.
    # It stores `group_name`.
    # We should find the group name first.
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
         return []
         
    logs = db.query(models.ProductHistory).filter(models.ProductHistory.group_name == group.name).order_by(models.ProductHistory.timestamp.desc()).all()
    return logs
