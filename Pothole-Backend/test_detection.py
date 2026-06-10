import requests
import base64
import cv2
import numpy as np

url = "http://localhost:8000/api/detection/camera/"

# Create a test image with a dark circle (simulated pothole)
img = np.ones((480, 640, 3), dtype=np.uint8) * 200
cv2.circle(img, (320, 240), 80, (30, 30, 30), -1)  # Dark circle

# Encode to base64
_, buffer = cv2.imencode('.jpg', img)
img_base64 = base64.b64encode(buffer).decode('utf-8')

payload = {
    "image_base64": img_base64,
    "latitude": 12.9716,
    "longitude": 77.5946,
    "session_id": "test"
}

response = requests.post(url, json=payload)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")