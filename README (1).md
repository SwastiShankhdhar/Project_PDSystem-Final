# RoadWatch — Pothole Detection System

A full-stack intelligent road monitoring system that uses real-time computer vision to detect potholes through live camera feeds, records geolocation data, and visualises detections on an interactive map. The system is designed for deployment in vehicles or on mobile devices to assist municipal authorities in identifying and prioritising road repair.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Backend — Django REST API](#backend--django-rest-api)
6. [Frontend — React Web Application](#frontend--react-web-application)
7. [Authentication — Node.js Service](#authentication--nodejs-service)
8. [Database Design](#database-design)
9. [Machine Learning Model](#machine-learning-model)
10. [API Reference](#api-reference)
11. [Setup and Installation](#setup-and-installation)
12. [Environment Variables](#environment-variables)
13. [Running the Application](#running-the-application)
14. [System Flow](#system-flow)

---

## System Overview

RoadWatch is a three-tier web application comprising a React frontend, a Django REST API backend, and a Node.js authentication service. The system captures live video from a device camera, sends individual frames to the Django backend for YOLO-based pothole detection, and records confirmed detections alongside GPS coordinates in a PostgreSQL database. Detected potholes are displayed in real time on an interactive Leaflet map.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│           (Vite · Tailwind CSS · Leaflet)               │
│                    localhost:5173                        │
└───────────────┬─────────────────────┬───────────────────┘
                │                     │
                ▼                     ▼
┌──────────────────────┐   ┌──────────────────────────────┐
│  Node.js Auth Service │   │    Django REST API Backend   │
│  (Express · MongoDB)  │   │  (DRF · YOLO · PostgreSQL)  │
│     localhost:5000    │   │       localhost:8000         │
└──────────────────────┘   └──────────────┬───────────────┘
                                          │
                                          ▼
                              ┌───────────────────────┐
                              │    PostgreSQL Database │
                              │       pothole_db       │
                              └───────────────────────┘
```

The frontend communicates with both services independently. The Node.js service handles user registration and OTP-based email authentication exclusively. The Django backend handles all computer vision, detection storage, and geolocation logic.

---

## Technology Stack

### Backend (Django)
| Component | Technology |
|---|---|
| Web Framework | Django 4.2 |
| API Layer | Django REST Framework 3.15 |
| Database ORM | Django ORM with PostgreSQL |
| ML Inference | Ultralytics YOLO v8 |
| Image Processing | OpenCV, Pillow |
| CORS | django-cors-headers |
| Environment | python-dotenv |
| Database Driver | psycopg2-binary |

### Frontend (React)
| Component | Technology |
|---|---|
| Framework | React 18 |
| Build Tool | Vite |
| Routing | React Router DOM |
| Map | Leaflet.js |
| Styling | Tailwind CSS |
| HTTP Client | Fetch API |
| Camera | WebRTC getUserMedia API |
| Audio Alerts | Web Audio API |

### Authentication (Node.js)
| Component | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB |
| OTP Delivery | Email (SMTP) |

### Database
| Component | Technology |
|---|---|
| Primary Database | PostgreSQL 17 |
| Auth Database | MongoDB (Node.js service) |

### Machine Learning
| Component | Technology |
|---|---|
| Model Architecture | YOLOv8 |
| Framework | Ultralytics |
| Weights File | pothole.pt (custom trained) |
| Inference | Real-time per-frame |

---

## Project Structure

```
PDS-System/
│
├── Pothole-Backend/                   Django REST API
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env
│   ├── pyrightconfig.json
│   ├── models/
│   │   └── pothole.pt                 YOLO weights file
│   │
│   ├── pothole_backend/               Django project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   │
│   ├── detection/                     Core detection app
│   │   ├── models.py                  Database models
│   │   ├── views.py                   API views
│   │   ├── urls.py                    URL routing
│   │   ├── serializers.py             DRF serializers
│   │   ├── admin.py                   Admin panel config
│   │   ├── yolo_service.py            YOLO inference logic
│   │   ├── camera_service.py          Server-side camera (local testing)
│   │   ├── location_service.py        Pothole location storage
│   │   ├── geocoding_service.py       Reverse geocoding + severity
│   │   └── migrations/
│   │
│   ├── geolocation/                   Geolocation module (stub)
│   └── reporting/                     Reporting module (stub)
│
├── Backend-node/                      Node.js Auth Service
│   ├── server.js
│   ├── config/db.js
│   ├── controllers/otpController.js
│   ├── middleware/authMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   └── Otp.js
│   ├── routes/otpRoutes.js
│   └── utils/
│       ├── generateOtp.js
│       └── sendEmail.js
│
└── Frontend/                          React Web Application
    └── src/
        ├── App.jsx
        ├── services/
        │   └── api.js                 Django API client functions
        ├── components/
        │   ├── Camera.jsx             Live camera + detection UI
        │   ├── Map.jsx                Leaflet map with pothole markers
        │   ├── Header.jsx
        │   └── Footer.jsx
        ├── pages/
        │   ├── Dashboard.jsx          Main detection interface
        │   ├── Home.jsx
        │   ├── Login.jsx
        │   ├── SignUp.jsx
        │   └── NotFound.jsx
        └── hooks/
            └── useCameraDetection.js  Camera detection React hook
```

---

## Backend — Django REST API

The Django backend serves as the primary processing engine of the system. It receives image frames from the frontend, performs YOLO inference, stores detection results in PostgreSQL, and returns structured JSON responses.

### Key Modules

**`yolo_service.py`**
Manages the YOLO model as a singleton to avoid repeated loading. Exposes three image loaders (`load_image_from_file`, `load_image_from_url`, `load_image_from_bytes`) and a single `run_inference` function. The inference function returns detected bounding boxes, confidence scores, an annotated JPEG encoded as base64, and the highest confidence value across all detections.

**`camera_service.py`**
Provides a server-side OpenCV camera loop for local backend testing. Runs in a background thread, draws bounding boxes on live frames, and plays a beep alert via `winsound` when potholes are detected. This module is used for development testing only and is not invoked during web-based frontend detection.

**`location_service.py`**
Handles persistence of pothole locations to the `PotholeLocation` table. Each confirmed detection creates a new database record. Latitude and longitude are optional to support testing without GPS availability.

**`geocoding_service.py`**
Provides reverse geocoding via the Nominatim API to convert GPS coordinates to human-readable addresses. Also provides severity classification based on pothole count and average confidence scores.

### CORS Configuration
The backend permits cross-origin requests from the React frontend (`localhost:5173` or `localhost:3000`) and the Node.js service (`localhost:5000`). In production, `CORS_ALLOWED_ORIGINS` must be updated to reflect the deployed domain.

---

## Frontend — React Web Application

The frontend is a single-page React application built with Vite. It provides a real-time detection dashboard featuring a live camera feed, an interactive map, and a detection history view.

### Camera Detection Flow

1. The browser requests webcam access via `navigator.mediaDevices.getUserMedia`.
2. Every 2,000 milliseconds, a frame is captured from the video element onto a hidden canvas.
3. The canvas frame is encoded as a base64 JPEG string.
4. The base64 string is sent to `POST /api/detection/camera/` alongside optional GPS coordinates.
5. Django runs YOLO inference and returns detection results including an annotated base64 image.
6. If a pothole is detected, the annotated frame (with bounding boxes) is rendered on a canvas overlay positioned above the live video.
7. A 880Hz beep is generated via the Web Audio API as an audible alert.
8. The detection count, confidence, and severity are updated in the session statistics panel.

### Map Integration
The Leaflet map displays pothole markers using GPS coordinates returned from the detection API. Reverse geocoding via Nominatim provides human-readable address labels in marker popups. The user's current location is tracked via `navigator.geolocation.watchPosition`.

### API Client (`services/api.js`)
All communication with the Django backend is centralised in `api.js`. Functions include `initDjango` (initialises CSRF cookie), `detectFromCamera`, `savePotholeLocation`, `getPotholeLocations`, `getDetectionHistory`, and `detectFromUpload`.

---

## Authentication — Node.js Service

The Node.js service handles all user authentication independently of Django. It manages user registration, OTP generation, email delivery, and session validation. The frontend communicates with this service for login and signup operations. Django does not participate in authentication.

---

## Database Design

The system uses PostgreSQL as its primary database. The following tables are application-specific:

### `users`
Stores registered user accounts with email, username, hashed password, and role.

| Column | Type | Description |
|---|---|---|
| id | bigint PK | Primary key |
| username | varchar(150) | Unique username |
| email | varchar(254) | Unique email address |
| role | varchar(20) | guest / registered / admin |
| is_active | boolean | Account active status |
| is_staff | boolean | Admin panel access |
| created_at | timestamp | Registration timestamp |

### `detection_results`
Stores one record per YOLO inference call that returned at least one pothole.

| Column | Type | Description |
|---|---|---|
| id | bigint PK | Primary key |
| input_type | varchar(10) | upload / url / camera |
| input_image | varchar | Path to original frame |
| annotated_image | varchar | Path to annotated output |
| pothole_count | integer | Number of potholes detected |
| detections_json | jsonb | Array of {label, confidence, bbox} |
| processing_time | float | YOLO inference duration (seconds) |
| latitude | float | GPS latitude (nullable) |
| longitude | float | GPS longitude (nullable) |
| address | text | Reverse geocoded address |
| severity | varchar(10) | low / medium / high / critical |
| status | varchar(15) | detected / verified / repaired |
| session_id | varchar(100) | Detection session identifier |
| created_at | timestamp | Detection timestamp |

### `pothole_locations`
Stores one record per pothole detection event for map display.

| Column | Type | Description |
|---|---|---|
| id | bigint PK | Primary key |
| latitude | float | GPS latitude |
| longitude | float | GPS longitude |
| address | text | Human-readable address |
| severity | varchar(10) | low / medium / high / critical |
| status | varchar(20) | reported / in_progress / fixed |
| detection_count | integer | Times detected at this location |
| session_id | varchar(100) | Session that recorded the detection |
| first_detected | timestamp | First detection timestamp |
| last_detected | timestamp | Most recent detection timestamp |

### Django System Tables
The following tables are created and managed automatically by Django. They are required for the framework to function and must not be modified or deleted manually: `auth_group`, `auth_group_permissions`, `auth_permission`, `auth_user`, `auth_user_groups`, `auth_user_user_permissions`, `django_admin_log`, `django_content_type`, `django_migrations`, `django_session`.

---

## Machine Learning Model

### Model
The system uses YOLOv8 (You Only Look Once, version 8) implemented via the Ultralytics library. The model is loaded once at server startup as a singleton and reused across all inference requests to avoid repeated disk reads.

### Weights
The custom-trained weights file `pothole.pt` must be placed in the `Pothole-Backend/models/` directory. The path is configured via the `MODEL_PATH` environment variable.

### Inference Pipeline
1. Incoming image (file, URL, or base64) is decoded into an OpenCV BGR ndarray.
2. The ndarray is passed to `model(image_bgr, verbose=False)`.
3. Bounding boxes, class labels, and confidence scores are extracted from `results[0].boxes`.
4. The annotated frame is generated via `results[0].plot()` and encoded as JPEG.
5. The JPEG is base64-encoded for direct embedding in the API response.

### Severity Classification
Severity is determined by `geocoding_service.calculate_severity`:

| Condition | Severity |
|---|---|
| 4 or more potholes in frame | Critical |
| 2–3 potholes in frame | High |
| 1 pothole, confidence ≥ 60% | Medium |
| 1 pothole, confidence < 60% | Low |

---

## API Reference

### Detection Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API root — lists all endpoints |
| POST | `/api/detection/detect/` | Upload image or URL for detection |
| GET | `/api/detection/history/` | Last 50 detection records |
| GET | `/api/detection/<id>/` | Single detection record |
| POST | `/api/detection/camera/` | Submit webcam frame for detection |
| POST | `/api/detection/camera/start/` | Start server-side OpenCV camera |
| POST | `/api/detection/camera/stop/` | Stop server-side camera |
| GET | `/api/detection/camera/status/` | Server camera state |
| POST | `/api/detection/save-location/` | Manually save a pothole location |
| GET | `/api/detection/locations/` | All pothole locations for map |

### Camera Detection Request
```
POST /api/detection/camera/
Content-Type: application/json

{
  "image_base64": "<base64 JPEG string>",
  "latitude": 26.9124,       // optional
  "longitude": 75.7873,      // optional
  "session_id": "session_xyz"
}
```

### Camera Detection Response
```json
{
  "detected": true,
  "pothole_id": 12,
  "pothole_count": 2,
  "detections": [
    {
      "label": "pothole",
      "confidence": 0.89,
      "bbox": [120, 340, 280, 430]
    }
  ],
  "annotated_b64": "<base64 JPEG with bounding boxes>",
  "severity": "high",
  "highest_confidence": 89.0,
  "address": "MG Road, Jaipur, Rajasthan",
  "location_saved": true,
  "processing_time": 0.23,
  "message": "Pothole detected! Severity: HIGH"
}
```

---

## Setup and Installation

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher
- PostgreSQL 17
- Git

### Backend Setup

```bash
# Clone repository
git clone <repository-url>
cd Pothole-Backend

# Create and activate virtual environment
python -m venv vpothole
vpothole\Scripts\activate          # Windows
source vpothole/bin/activate       # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create environment file
copy .env.example .env             # Windows
cp .env.example .env               # macOS/Linux
# Edit .env with your credentials

# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE pothole_db;"

# Run migrations
python manage.py makemigrations detection
python manage.py migrate

# Create admin user
python manage.py createsuperuser

# Place YOLO weights
# Copy pothole.pt to Pothole-Backend/models/pothole.pt

# Start server
python manage.py runserver
```

### Frontend Setup

```bash
cd Frontend
npm install
npm run dev
```

### Node.js Auth Service Setup

```bash
cd Backend-node
npm install
node server.js
```

---

## Environment Variables

Create a `.env` file in `Pothole-Backend/` with the following variables:

```env
DEBUG=True
SECRET_KEY=<generated-secret-key>

# PostgreSQL
DB_NAME=pothole_db
DB_USER=postgres
DB_PASSWORD=<your-postgres-password>
DB_HOST=localhost
DB_PORT=5432

# YOLO Model
MODEL_PATH=models/pothole.pt

# Media storage
MEDIA_ROOT=media/
```

Generate a secret key with:
```bash
python -c "import secrets; print(secrets.token_hex(50))"
```

---

## Running the Application

Start all three services in separate terminals:

```bash
# Terminal 1 — Django backend
cd Pothole-Backend
vpothole\Scripts\activate
python manage.py runserver

# Terminal 2 — Node.js auth service
cd Backend-node
node server.js

# Terminal 3 — React frontend
cd Frontend
npm run dev
```

Access the application at `http://localhost:5173`.
Django admin panel at `http://localhost:8000/admin/`.

---

## System Flow

```
User opens browser
        ↓
React app loads → initDjango() sets CSRF cookie
        ↓
User navigates to Dashboard
        ↓
Camera.jsx → getUserMedia() → webcam feed starts
        ↓
User clicks "Start Detection"
        ↓
Every 2 seconds:
  Canvas captures frame from video element
  Frame encoded as base64 JPEG
  POST /api/detection/camera/ sent to Django
        ↓
Django CameraDetectionView:
  Decodes base64 → OpenCV ndarray
  Runs YOLO inference (pothole.pt)
  If detected:
    Saves DetectionResult to PostgreSQL
    Saves PotholeLocation to PostgreSQL
    Prints confirmation to terminal
  Returns JSON with annotated_b64
        ↓
React Camera.jsx receives response:
  If detected:
    Renders annotated frame on canvas overlay
    Plays 880Hz beep via Web Audio API
    Updates session counter and severity display
    Sends GPS coordinates to Map component
        ↓
Map.jsx adds red marker at pothole location
Leaflet popup shows address via Nominatim
        ↓
Entries visible in pgAdmin:
  detection_results table
  pothole_locations table
```

---

## Notes

- The `pothole.pt` weights file is not included in the repository due to file size. It must be obtained separately and placed in `Pothole-Backend/models/`.
- GPS availability depends on browser permissions and device hardware. All detection and storage operations function without GPS; location fields are stored as null.
- The `geolocation` and `reporting` Django apps are scaffolded but not yet implemented. They are reserved for future development.
- In production, set `DEBUG=False`, configure `ALLOWED_HOSTS`, tighten `CORS_ALLOWED_ORIGINS`, and serve static and media files via a dedicated web server such as Nginx.
