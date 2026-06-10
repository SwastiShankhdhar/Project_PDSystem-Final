from unittest import result

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes

import base64
import uuid
from django.core.files.base import ContentFile

from detection.models import DetectionResult, PotholeLocation
from detection.serializers import DetectionRequestSerializer, DetectionResultSerializer
from detection.yolo_service import load_image_from_file, load_image_from_url, load_image_from_bytes, run_inference
from detection.geocoding_service import reverse_geocode, calculate_severity
from detection.location_service import save_pothole_location
import detection.camera_service as camera_service


# ── Image upload / URL detection ──────────────────────────────────────────────
# 
class DetectPotholeView(APIView):
    """POST /api/detection/detect/ — upload image or URL, run YOLO."""
    permission_classes = [AllowAny]
# Accepts multipart/form-data with either 'image' (file upload) or 'image_url'.
    def post(self, request):
        serializer = DetectionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
# Load image from file upload or URL, with error handling
        try:
            if data.get('image'):
                image_bgr       = load_image_from_file(data['image'])
                input_type      = DetectionResult.InputType.UPLOAD
                input_image     = data['image']
                input_image_url = None
            elif data.get('image_url'):
                image_bgr       = load_image_from_url(data['image_url'])
                input_type      = DetectionResult.InputType.URL
                input_image     = None
                input_image_url = data['image_url']
            else:
                return Response({'error': 'No image source provided'}, status=400)
        except Exception as exc:
            return Response({'error': f'Failed to load image: {str(exc)}'}, status=422)

        try:
            result = run_inference(image_bgr)
            CONF_THRESHOLD = 0.5
# Filter detections to only include potholes above confidence threshold
            filtered_detections = [
            d for d in result['detections']
            if d.get('confidence', 0) >= CONF_THRESHOLD
            and d.get('label', '').lower() == 'pothole'
            ]

# Update result with filtered data
            result['detections'] = filtered_detections
            result['pothole_count'] = len(filtered_detections)
            result['highest_confidence'] = max(
            [d.get('confidence', 0) for d in filtered_detections],
                default=0
            )
        except Exception as exc:
            return Response({'error': f'Inference failed: {str(exc)}'}, status=500)

        latitude  = request.data.get('latitude')
        longitude = request.data.get('longitude')
        try:
            latitude = float(latitude) if latitude else None
            longitude = float(longitude) if longitude else None
        except:
            latitude = None
            longitude = None
        address   = None
        if latitude and longitude:
            address = reverse_geocode(float(latitude), float(longitude))

        severity = calculate_severity(
            count=result['pothole_count'],
            detections=result['detections']
        )

        record = DetectionResult(
            input_type=input_type,
            input_image_url=input_image_url,
            pothole_count=result['pothole_count'],
            detections_json=result['detections'],
            processing_time=result['processing_time'],
            latitude=float(latitude) if latitude else None,
            longitude=float(longitude) if longitude else None,
            address=address,
            severity=severity,
            session_id=request.data.get('session_id', ''),
            status=DetectionResult.Status.DETECTED,
        )
        if input_image:
            record.input_image.save(input_image.name, input_image, save=False)
        record.annotated_image.save(
            result['annotated_image_file'].name,
            result['annotated_image_file'],
            save=False,
        )
        record.save()

        out = DetectionResultSerializer(record, context={'request': request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class DetectionHistoryView(APIView):
    """GET /api/detection/history/ — last 50 detection records."""
    permission_classes = [AllowAny]

    def get(self, request):
        records    = DetectionResult.objects.all()[:50]
        serializer = DetectionResultSerializer(records, many=True, context={'request': request})
        return Response(serializer.data)


class DetectionDetailView(APIView):
    """GET /api/detection/<pk>/ — single detection record."""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            record = DetectionResult.objects.get(pk=pk)
        except DetectionResult.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = DetectionResultSerializer(record, context={'request': request})
        return Response(serializer.data)


# ── Camera detection API (web frontend) ──────────────────────────────────────
# POST /api/detection/camera/ — accepts one webcam frame (base64 or file upload), runs YOLO, returns detection results + annotated image as base64 for frontend display.
class CameraDetectionView(APIView):
    """
    POST /api/detection/camera/

    Accepts one webcam frame (base64 or file upload).
    Runs YOLO inference.
    Returns:
      - detected         : bool
      - detections       : list of {label, confidence, bbox}
      - annotated_b64    : base64 JPEG with bounding boxes drawn — frontend renders this directly
      - pothole_count    : int
      - severity         : str
      - highest_confidence: float
      - address          : str or null
      - pothole_id       : int (DB record id) or null

    GPS is optional — stores null if not provided.
    Always creates a new DB entry on detection (no deduplication).
    """
    permission_classes = [AllowAny]
# Handles camera detection requests from web frontend, including optional GPS data. Returns detailed detection results and annotated image for display.
    def post(self, request):
        try:
            print("\n" + "="*55)
            print("  CAMERA DETECTION REQUEST")
            print("="*55)

            # GPS — optional
            latitude   = request.data.get('latitude')
            longitude  = request.data.get('longitude')
            session_id = request.data.get('session_id', '')

            lat_float = float(latitude)  if latitude  not in (None, '', 'null') else None
            lng_float = float(longitude) if longitude not in (None, '', 'null') else None

            print(f"  GPS        : {f'({lat_float}, {lng_float})' if lat_float else 'not provided'}")
            print(f"  Session    : {session_id or 'none'}")

            # Load image
            if request.FILES.get('image'):
                print("  Image      : file upload")
                image_bgr  = load_image_from_file(request.FILES['image'])
                image_file = request.FILES['image']
# Support base64 image upload for camera frames (mobile/web frontend can send as base64 string)
            elif request.data.get('image_base64'):
                base64_str = request.data['image_base64']
                if ',' in base64_str:
                    base64_str = base64_str.split(',')[1]
                if not base64_str.strip():
# Empty base64 string — return error instead of crashing
                    return Response(
                        {'error': 'image_base64 is empty', 'detected': False},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Decode base64 to bytes, then load as image
                image_bytes = base64.b64decode(base64_str)
                image_bgr   = load_image_from_bytes(image_bytes)
                image_file  = ContentFile(image_bytes, name=f"cam_{uuid.uuid4().hex}.jpg")
                print(f"  Image      : base64 ({len(image_bytes)} bytes)")
            else:
                return Response(
                    {'error': 'No image provided', 'detected': False},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Run YOLO
            print("  Running YOLO inference...")
            result   = run_inference(image_bgr)
            CONF_THRESHOLD = 0.5

            filtered_detections = [
            d for d in result['detections']
            if d.get('confidence', 0) >= CONF_THRESHOLD
            and d.get('label', '').lower() == 'pothole'
            ]
            # Debug logging of detections before and after filtering
            # Update result with filtered data
            result['detections'] = filtered_detections
            result['pothole_count'] = len(filtered_detections)
            result['highest_confidence'] = max(
            [d.get('confidence', 0) for d in filtered_detections],
            default=0
            )
            detected = len(filtered_detections) > 0
            # detected = result['pothole_count'] > 0

            print(f"  Detected   : {detected}")
            print(f"  Count      : {result['pothole_count']}")
            print(f"  Confidence : {result['highest_confidence']}")

            # Severity from geocoding_service
            severity = calculate_severity(
                count=result['pothole_count'],
                detections=result['detections']
            ) if detected else None

            # Reverse geocode if GPS available
            address = None
            if lat_float is not None and lng_float is not None:
                try:
                    address = reverse_geocode(lat_float, lng_float)
                except Exception:
                    address = None

            pothole_id     = None
            location_saved = False

            # Save to DB on detection
            if not detected:
                return Response({
                'detected': False,
                'pothole_count': 0,
                'detections': [],
                'message': 'No pothole detected above confidence threshold'
                })
            if detected:
                record = DetectionResult(
                    input_type=DetectionResult.InputType.CAMERA,
                    pothole_count=result['pothole_count'],
                    detections_json=result['detections'],
                    processing_time=result['processing_time'],
                    latitude=lat_float,
                    longitude=lng_float,
                    address=address,
                    severity=severity,
                    session_id=session_id,
                    status=DetectionResult.Status.DETECTED,
                )
                record.input_image.save(image_file.name, image_file, save=False)
                record.annotated_image.save(
                    result['annotated_image_file'].name,
                    result['annotated_image_file'],
                    save=False,
                )
                record.save()
                pothole_id = record.id

                print(f"\n{'='*55}")
                print(f"  [DB] DetectionResult #{record.id} created")
                print(f"  [DB] Potholes        : {record.pothole_count}")
                print(f"  [DB] Severity        : {severity}")
                print(f"  [DB] GPS             : {f'({lat_float}, {lng_float})' if lat_float else 'not available'}")
                print(f"{'='*55}")

                loc_result     = save_pothole_location(
                    latitude=lat_float,
                    longitude=lng_float,
                    severity=severity,
                    session_id=session_id,
                    address=address,
                )
                location_saved = loc_result.get('created', False)
                print(f"  [DB] PotholeLocation #{loc_result['id']} created")
                print(f"  [DB] Address         : {address or 'not available'}")
                print(f"{'-'*55}\n")

            # Return full response including annotated image as base64
            # Frontend uses annotated_b64 to display frame with bounding boxes
            return Response({
                'detected':            detected,
                'pothole_id':          pothole_id,
                'pothole_count':       result['pothole_count'],
                'detections':          result['detections'],
                'annotated_b64':       result['annotated_image_b64'],  # base64 JPEG with boxes
                'severity':            severity,
                'highest_confidence':  round(result['highest_confidence'] * 100, 2),
                'address':             address,
                'location_saved':      location_saved,
                'processing_time':     result['processing_time'],
                'message':             f'Pothole detected! Severity: {severity.upper()}' if detected else 'No pothole detected',
            })

        except Exception as exc:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(exc), 'detected': False},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ── Server-side camera window (local testing) ─────────────────────────────────
# POST /api/detection/camera/start/ — opens OpenCV webcam window.
class CameraStartView(APIView):
    """POST /api/detection/camera/start/ — opens OpenCV webcam window."""
    permission_classes = [AllowAny]

    def post(self, request):
        result      = camera_service.start_camera()
        http_status = status.HTTP_200_OK if result.get('started') else status.HTTP_409_CONFLICT
        return Response(result, status=http_status)

# POST /api/detection/camera/stop/ — closes webcam window if open.
class CameraStopView(APIView):
    """POST /api/detection/camera/stop/"""
    permission_classes = [AllowAny]

    def post(self, request):
        return Response(camera_service.stop_camera(), status=status.HTTP_200_OK)

# GET /api/detection/camera/status/ — returns current status of camera service (running/not running, last frame time, etc.)
class CameraStatusView(APIView):
    """GET /api/detection/camera/status/"""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(camera_service.get_status(), status=status.HTTP_200_OK)


# ── Pothole location APIs ─────────────────────────────────────────────────────

class SavePotholeLocationView(APIView):
    """POST /api/detection/save-location/"""
    permission_classes = [AllowAny]

    def post(self, request):
        latitude   = request.data.get('latitude')
        longitude  = request.data.get('longitude')
        result = save_pothole_location(
            latitude=float(latitude)   if latitude  else None,
            longitude=float(longitude) if longitude else None,
            severity=request.data.get('severity', 'medium'),
            session_id=request.data.get('session_id'),
            address=request.data.get('address'),
        )
        return Response(result, status=status.HTTP_201_CREATED if result['created'] else status.HTTP_200_OK)


class PotholeLocationListView(APIView):
    """GET /api/detection/locations/ — all pothole locations for map."""
    permission_classes = [AllowAny]

    def get(self, request):
        locations = PotholeLocation.objects.all()
        data = [{
            'id':              loc.pk,
            'latitude':        loc.latitude,
            'longitude':       loc.longitude,
            'address':         loc.address,
            'severity':        loc.severity,
            'status':          loc.status,
            'detection_count': loc.detection_count,
            'first_detected':  loc.first_detected,
            'last_detected':   loc.last_detected,
        } for loc in locations]
        return Response({'success': True, 'count': len(data), 'potholes': data})


# ── Health check ──────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'ok', 'message': 'Pothole Detection API is running'})