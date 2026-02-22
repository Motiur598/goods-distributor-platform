from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database

router = APIRouter(
    prefix="/groups",
    tags=["groups"],
)

@router.post("/", response_model=schemas.GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(group: schemas.GroupCreate, db: Session = Depends(database.get_db)):
    db_group = db.query(models.Group).filter(models.Group.name == group.name).first()
    if db_group:
        raise HTTPException(status_code=400, detail="Group already registered")
    
    new_group = models.Group(name=group.name)
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    return new_group

@router.get("/", response_model=List[schemas.GroupResponse])
def read_groups(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    groups = db.query(models.Group).offset(skip).limit(limit).all()
    
    # Calculate total stock value for each group
    for group in groups:
        total_value = 0.0
        for product in group.products:
            # Calculate using: (Type Qty * Type Avg Price) + (Piece Qty * Piece Avg Price)
            # Type Avg Price = buy_price_avg * pieces_per_quantity
            type_avg_price = product.buy_price_avg * (product.pieces_per_quantity or 1)
            piece_avg_price = product.buy_price_avg
            
            type_val = product.quantity_value * type_avg_price
            piece_val = product.pieces_quantity * piece_avg_price
            
            total_value += (type_val + piece_val)
        
        group.total_stock_value = total_value
        
    return groups

@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(group_id: int, db: Session = Depends(database.get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Optional: Check if group has products or sales before deleting?
    # For now, we will allow cascade delete if configured in DB, or manual delete.
    # Models don't have cascade delete defined explicitly in Python side usually implies DB side.
    # SQLite might need PRAGMA foreign_keys=ON. 
    # Let's just delete the group. modifying products to handle null group might be needed or they get deleted.
    # Given the requirements, I'll delete the group.
    
    # Manually delete related products and sales if cascade fails at DB level
    # This is a safeguard for SQLite
    db.query(models.Product).filter(models.Product.group_id == group_id).delete()
    db.query(models.DailySale).filter(models.DailySale.group_id == group_id).delete()
    
    db.delete(group)
    db.commit()
    return None
