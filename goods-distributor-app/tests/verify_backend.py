import requests
import sys

BASE_URL = "http://localhost:8000"

def test_backend():
    print("Testing Backend API...")
    
    # 1. Create Group
    print("\n1. Creating Group 'Test Group'...")
    try:
        res = requests.post(f"{BASE_URL}/groups/", json={"name": "Test Group"})
        if res.status_code == 201:
            group = res.json()
            print(f"Success: Created Group ID {group['id']}")
            group_id = group['id']
        elif res.status_code == 400 and "already registered" in res.text:
             # Fetch existing
             res = requests.get(f"{BASE_URL}/groups/")
             groups = res.json()
             group = next((g for g in groups if g["name"] == "Test Group"), None)
             print(f"Group already exists: ID {group['id']}")
             group_id = group['id']
        else:
            print(f"Failed: {res.status_code} {res.text}")
            return
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    # 2. Add Product
    print("\n2. Adding Product 'Test Product'...")
    product_payload = {
        "group_id": group_id,
        "name": "Test Product",
        "weight_type": "g",
        "weight_value": 500,
        "quantity_type": "Dozon",
        "quantity_value": 0,
        "pieces_per_quantity": 12,
        "pieces_quantity": 0,
        "buy_price_avg": 0,
        "sell_price_per_type": 1200,
        "sell_price_per_piece": 110
    }
    res = requests.post(f"{BASE_URL}/products/", json=product_payload)
    if res.status_code == 201:
        product = res.json()
        print(f"Success: Created Product ID {product['id']}")
        product_id = product['id']
    else:
        print(f"Failed: {res.status_code} {res.text}")
        return

    # 3. Add Stock
    print("\n3. Adding Stock (5 Dozen)...")
    stock_payload = {
        "quantity_value": 5,
        "pieces_quantity": 0,
        "buy_price_total": 5000,
        "sell_price_per_type": 1200,
        "sell_price_per_piece": 110
    }
    res = requests.put(f"{BASE_URL}/products/{product_id}/add", json=stock_payload)
    if res.status_code == 200:
        p = res.json()
        print(f"Success: New Stock {p['quantity_value']} {p['quantity_type']}")
    else:
        print(f"Failed: {res.status_code} {res.text}")

    # 4. Record Sale
    print("\n4. Recording Sale (1 Dozen)...")
    sale_payload = {
        "group_id": group_id,
        "date": "2026-02-10",
        "cash_received": 1000,
        "sale_items": [
            {
                "product_id": product_id,
                "request_type_qty": 1,
                "request_piece_qty": 0,
                "return_type_qty": 0,
                "return_piece_qty": 0
            }
        ],
        "remarks": []
    }
    res = requests.post(f"{BASE_URL}/sales/today", json=sale_payload)
    if res.status_code == 200:
        sale = res.json()
        print(f"Success: Sale ID {sale['id']}, Total: {sale['total_amount']}, Due: {sale['due']}")
    else:
        print(f"Failed: {res.status_code} {res.text}")

    print("\nBackend Verification Complete.")

if __name__ == "__main__":
    test_backend()
