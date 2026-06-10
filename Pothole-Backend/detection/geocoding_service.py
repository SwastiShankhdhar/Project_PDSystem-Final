"""
geocoding_service.py
-------------------
Handles reverse geocoding using Google Maps API
"""
import os
# import googlemaps
from django.conf import settings

# Initialize Google Maps client
gmaps = None

# def get_geocoding_service():
#     """Singleton pattern for Google Maps client"""
#     global gmaps
#     if gmaps is None:
#         api_key = os.getenv('GOOGLE_MAPS_API_KEY', '')
#         if api_key:
#             gmaps = googlemaps.Client(key=api_key)
#             print("✅ Google Maps client initialized")
#         else:
#             print("⚠️ No Google Maps API key found. Geocoding disabled.")
#     return gmaps


# def reverse_geocode(latitude, longitude):
#     """
#     Convert coordinates to human-readable address
    
#     Args:
#         latitude (float): Latitude coordinate
#         longitude (float): Longitude coordinate
    
#     Returns:
#         str: Formatted address or None if failed
#     """
#     if not latitude or not longitude:
#         return None
    
#     client = get_geocoding_service()
#     if not client:
#         return None
    
#     try:
#         result = client.reverse_geocode((latitude, longitude))
#         if result:
#             return result[0].get('formatted_address', '')
#     except Exception as e:
#         print(f"Geocoding error: {e}")
    
#     return None


# def calculate_severity(confidence, bbox_area=None):
#     """
#     Calculate severity based on detection confidence and size
    
#     Args:
#         confidence (float): Detection confidence (0-1)
#         bbox_area (float): Area of bounding box (optional)
    
#     Returns:
#         str: Severity level (low, medium, high, critical)
#     """
#     if confidence > 0.85:
#         if bbox_area and bbox_area > 5000:
#             return 'critical'
#         return 'high'
#     elif confidence > 0.7:
#         return 'medium'
#     else:
#         return 'low'
def reverse_geocode(latitude: float, longitude: float) -> str:
    """
    Convert GPS coordinates to a human-readable address.
    Currently returns a placeholder — integrate a real geocoding
    API (Nominatim, Google Maps, etc.) here when ready.
    """
    try:
        import urllib.request
        import json
        url = (
            f"https://nominatim.openstreetmap.org/reverse"
            f"?lat={latitude}&lon={longitude}&format=json"
        )
        req = urllib.request.Request(url, headers={'User-Agent': 'PotholeDetectionApp/1.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read())
            return data.get('display_name', f"{latitude}, {longitude}")
    except Exception:
        return f"{latitude}, {longitude}"
 
 
def calculate_severity(count: int, detections: list) -> str:
    """
    Calculate severity based on pothole count and confidence scores.
 
    Rules:
      1 pothole, avg conf < 0.6  → low
      1 pothole, avg conf >= 0.6 → medium
      2-3 potholes               → high
      4+ potholes                → critical
    """
    if not detections:
        return 'low'
 
    avg_confidence = sum(d.get('confidence', 0) for d in detections) / len(detections)
 
    if count >= 4:
        return 'critical'
    elif count >= 2:
        return 'high'
    elif avg_confidence >= 0.6:
        return 'medium'
    else:
        return 'low'