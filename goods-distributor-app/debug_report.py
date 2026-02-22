import requests

# Test data
GROUP_ID = 2 # AKIJ GROUP
YEAR = 2026

URL = f"http://127.0.0.1:8000/reports/yearly/{GROUP_ID}?year={YEAR}"

try:
    print(f"Fetching from: {URL}")
    response = requests.get(URL)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Response Data:", response.json())
    else:
        print("Error:", response.text)
except Exception as e:
    print(f"Error: {e}")
