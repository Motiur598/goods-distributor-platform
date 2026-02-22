import requests

URL = "http://127.0.0.1:8000/auth/login"
CREDENTIALS = {
    "username": "Goodluck1769",
    "password": "AMMNNA17469%&"
}

try:
    response = requests.post(URL, data=CREDENTIALS)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Login Successful!")
        print("Token:", response.json().get("access_token")[:20] + "...")
    else:
        print("Login Failed!")
        print("Response:", response.text)
except Exception as e:
    print(f"Error: {e}")
