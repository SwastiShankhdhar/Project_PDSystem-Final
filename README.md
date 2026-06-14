# RoadWatch — The road bell for the " DRIVERS' SAFETY"
<img width="1897" height="908" alt="Screenshot 2026-05-10 220150" src="https://github.com/user-attachments/assets/e8519dba-1114-4e71-a194-a024c5589ce7" />
<img width="1900" height="921" alt="Screenshot 2026-05-10 220227" src="https://github.com/user-attachments/assets/0b4cb59b-c0a0-40b6-a72f-48fde77580af" />
RoadWatch is a real-time pothole detection web app that uses your device camera, image url ( AS per the current code ), a custom-trained YOLO model, and GPS to detect, annotate, and map road potholes — live — as you drive. No human needed. Just point the camera and let the AI cook.
_______________________________________________________________________________________

## SIMPLE WORKFLOW

<img width="1897" height="912" alt="Screenshot 2026-05-10 221949" src="https://github.com/user-attachments/assets/63a438e2-98b4-44ec-9741-a2d015652a5d" />

<img width="1920" height="1080" alt="Screenshot 2026-04-29 091943" src="https://github.com/user-attachments/assets/a882f28d-7003-44b1-80e7-ae191005db24" />

<img width="1882" height="911" alt="Screenshot 2026-05-10 222627" src="https://github.com/user-attachments/assets/0cf72e23-68f2-4cdd-bb5c-85dab957f7c1" />

_<img width="1890" height="906" alt="Screenshot 2026-05-10 222830" src="https://github.com/user-attachments/assets/0c183e48-5c02-4cb9-adf0-e447d0cb23f1" />

<img width="1722" height="923" alt="Screenshot 2026-05-10 223425" src="https://github.com/user-attachments/assets/aa992f39-f77a-472c-a27f-a6cc0842e1c7" />
 
_<img width="553" height="482" alt="image" src="https://github.com/user-attachments/assets/61fd266d-7695-4512-ac79-0fa7fc871d49" />
______________________________________________________________________________________

## The model and Backend
This is the core of the whole system. Everything else is just pipes around this.

What is YOLO?

YOLO (You Only Look Once) is a real-time object detection algorithm. Unlike older approaches that scan an image multiple times, YOLO looks at the entire frame in a single pass and outputs all bounding boxes simultaneously — making it fast enough for live video. 🚀

Our Model


Architecture: YOLOv8 (latest generation)
Weights: pothole.pt — custom trained specifically on pothole images
Framework: Ultralytics Python library
Input: Any image as OpenCV BGR ndarray
Output: Bounding boxes, class labels, confidence scores, annotated frame

<img width="622" height="497" alt="image" src="https://github.com/user-attachments/assets/f0d02d4e-6372-40ca-b26c-02ecccbd90c7" />
MODEL SINGLETON PATTERN:

_model = None
def get_model() -> YOLO:

    global _model
    if _model is None: 
    # load only once at first request
        _model = YOLO('models/pothole.pt')
    return _model                  # reuse for every subsequent request

 This pattern ensures it loads once at startup and stays in memory — keeping inference fast at ~0.2s per frame.

Severity Classification

After detection, we classify severity based on count + confidence:

4+ potholes in frame          →  🔴 CRITICAL

2–3 potholes in frame         →  🟠 HIGH

1 pothole, confidence ≥ 60%   →  🟡 MEDIUM

1 pothole, confidence < 60%   →  🟢 LOW
________________________________________________________________________________________

# 🗺️ Spatial Data Processing

## GPS Capture

The browser's Geolocation API (navigator.geolocation.watchPosition) continuously tracks the user's position with high accuracy mode enabled. Coordinates update in real time and are stored in a React ref (not state, to avoid re-renders) so they're always fresh when a detection fires.

navigator.geolocation.watchPosition(

  (pos) => {
  
    gpsRef.current = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    }
  },
  
  (err) => {},
  
  { enableHighAccuracy: true }   // uses GPS chip, not IP  
)

## Reverse Geocoding

Raw GPS coordinates (26.9124, 75.7873) are converted to human-readable addresses using the Nominatim API (OpenStreetMap's free geocoder):

GET https://nominatim.openstreetmap.org/reverse

    ?lat=26.9124&lon=75.7873&format=json
    →  "MG Road, Jaipur, Rajasthan, India"

This runs server-side in geocoding_service.py — not client-side — so it's fast and doesn't expose API calls in the browser.

## Coordinate Storage

Pothole coordinates are stored as FloatField in PostgreSQL with full decimal precision:

latitude  = 26.912400   (6 decimal places ≈ 11cm accuracy)

longitude = 75.787300

6 decimal places gives sub-metre GPS precision — more than enough for pothole mapping.

## Map Rendering

Coordinates from GET /api/detection/locations/ are plotted on a Leaflet.js map as red markers. Each marker binds a popup with:


- Pothole ID
- Human-readable address
- Severity level
- Detection timestamp

The map uses OpenStreetMap tiles — free, no API key, works offline with local tile caching.
<img width="492" height="668" alt="image" src="https://github.com/user-attachments/assets/fba00318-0ca1-4973-bad8-186a9faf3f7c" />
