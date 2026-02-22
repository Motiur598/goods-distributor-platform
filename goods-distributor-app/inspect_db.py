from backend.database import SessionLocal
from backend import models

db = SessionLocal()
groups = db.query(models.Group).all()

for group in groups:
    print(f"Group: {group.name} (ID: {group.id})")
    for product in group.products:
        print(f"  Product: {product.name} (ID: {product.id})")
        print(f"    Qty Type: {product.quantity_type}, Value: {product.quantity_value}")
        print(f"    Pieces P/Q: {product.pieces_per_quantity}, Pieces Qty: {product.pieces_quantity}")
        print(f"    Buy Price Avg: {product.buy_price_avg}")
        
        type_avg_price = product.buy_price_avg * (product.pieces_per_quantity or 1)
        piece_avg_price = product.buy_price_avg
        
        type_val = product.quantity_value * type_avg_price
        piece_val = product.pieces_quantity * piece_avg_price
        
        print(f"    Calc Value: {type_val + piece_val}")
    print("-" * 20)
