
import requests
import json
import sqlite3

def check_db():
    print("--- Database Check ---")
    conn = sqlite3.connect('goods_distributor.db')
    cursor = conn.cursor()
    
    # Get Group ID
    cursor.execute("SELECT id, name FROM groups LIMIT 1")
    group = cursor.fetchone()
    if not group:
        print("No groups found.")
        return
    group_id, group_name = group
    print(f"Group: {group_name} (ID: {group_id})")
    
    # Check Remarks
    cursor.execute("""
        SELECT r.id, r.amount, r.comment, d.group_id 
        FROM sale_remarks r 
        JOIN daily_sales d ON r.daily_sale_id = d.id 
        WHERE d.group_id = ?
    """, (group_id,))
    remarks = cursor.fetchall()
    print(f"DB Remarks for Group {group_id}:")
    for r in remarks:
        print(r)
        
    conn.close()
    return group_id

def check_api(group_id):
    print("\n--- API Check ---")
    url = f"http://127.0.0.1:8000/total-due/{group_id}/remarks"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"API Request Failed: {e}")

if __name__ == "__main__":
    gid = check_db()
    if gid:
        check_api(gid)
