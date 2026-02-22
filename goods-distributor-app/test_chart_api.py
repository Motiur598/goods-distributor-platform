
import requests
import json

try:
    response = requests.get("http://127.0.0.1:8000/reports/dashboard/chart")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Data received (first item):", data[0] if data else "Empty List")
        print("Total items:", len(data))
        print(json.dumps(data, indent=2))
    else:
        print("Error content:", response.text)
except Exception as e:
    print(f"Request failed: {e}")
