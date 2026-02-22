
import requests
import json
from datetime import date

BASE_URL = "http://127.0.0.1:8000"

def test_total_due_api():
    try:
        # 1. Get Groups
        print("Fetching groups...")
        res = requests.get(f"{BASE_URL}/total-due/groups")
        if res.status_code != 200:
            print(f"Failed to fetch groups: {res.text}")
            return
        groups = res.json()
        if not groups:
            print("No groups found. Skipping further tests.")
            return
        
        group_id = groups[0]['id']
        print(f"Using Group ID: {group_id}")
        
        # 2. Get Commissions
        print("Fetching commissions...")
        res = requests.get(f"{BASE_URL}/total-due/{group_id}/commissions")
        print(f"Commissions: {res.json()}")
        
        # 3. Get Remarks
        print("Fetching remarks...")
        res = requests.get(f"{BASE_URL}/total-due/{group_id}/remarks")
        print(f"Remarks: {res.json()}")
        
        # 4. Product Taken Cycle
        # a. Get Products to find an ID
        res = requests.get(f"{BASE_URL}/products/group/{group_id}")
        products = res.json()
        if not products:
            print("No products in group. Cannot test Product Taken.")
            return
            
        product_id = products[0]['id']
        
        # b. Add Product Taken
        print("Adding Product Taken...")
        payload = {
            "group_id": group_id,
            "product_id": product_id,
            "quantity": 1,
            "pieces": 0,
            "total_price": 500.0,
            "date": str(date.today())
        }
        res = requests.post(f"{BASE_URL}/total-due/product-taken", json=payload)
        if res.status_code != 200:
            print(f"Failed to add product taken: {res.text}")
        else:
            item = res.json()
            item_id = item['id']
            print(f"Added Item ID: {item_id}")
            
            # c. List Product Taken
            print("Listing Product Taken...")
            res = requests.get(f"{BASE_URL}/total-due/{group_id}/product-taken")
            items = res.json()
            print(f"Items count: {len(items)}")
            
            # d. Pay Partial
            print("Paying 200...")
            res = requests.post(f"{BASE_URL}/total-due/product-taken/{item_id}/pay", json={"amount": 200.0})
            print(f"Pay response: {res.json()}")
            
            # e. Return (Simulate returning half? No, logic is custom)
            # Just return 0 qty to test endpoint or return full
            print("Returning item...")
            res = requests.post(f"{BASE_URL}/total-due/product-taken/{item_id}/return", json={"quantity": 1, "pieces": 0})
            print(f"Return response: {res.json()}")
            
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test_total_due_api()
