from django.urls import path
from detection.views import (
    DetectPotholeView,
    DetectionHistoryView,
    DetectionDetailView,
    CameraStartView,
    CameraStopView,
    CameraStatusView,
    CameraDetectionView,
    SavePotholeLocationView,
    PotholeLocationListView,
    health_check,
)

app_name = 'detection'

urlpatterns = [
    # Health check
    path('health/', health_check, name='health'),
    
    # Image detection
    path('detect/', DetectPotholeView.as_view(), name='detect'),
    path('history/', DetectionHistoryView.as_view(), name='history'),
    path('<int:pk>/', DetectionDetailView.as_view(), name='detail'),

    # Camera APIs
    path('camera/', CameraDetectionView.as_view(), name='camera-detect'),
    path('camera/start/', CameraStartView.as_view(), name='camera-start'),
    path('camera/stop/', CameraStopView.as_view(), name='camera-stop'),
    path('camera/status/', CameraStatusView.as_view(), name='camera-status'),

    # Location APIs (for map)
    path('save-location/', SavePotholeLocationView.as_view(), name='save-location'),
    path('locations/', PotholeLocationListView.as_view(), name='locations'),
]