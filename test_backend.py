import requests
import json
import time

BASE_URL = "http://127.0.0.1:5000"

def test_health():
    print("--- Testing /health ---")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Failed to connect: {e}")

def test_predict_url():
    print("\n--- Testing /predict-url ---")
    try:
        response = requests.post(
            f"{BASE_URL}/predict-url",
            json={"url": "http://example-suspicious-login.com"}
        )
        print(f"Status Code: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Failed to connect: {e}")

def test_predict_email():
    print("\n--- Testing /predict-email ---")
    try:
        response = requests.post(
            f"{BASE_URL}/predict-email",
            json={"text": "URGENT: Verify your bank account immediately or it will be suspended!"}
        )
        print(f"Status Code: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    print("Testing Backend Endpoints...")
    test_health()
    test_predict_url()
    test_predict_email()
