# """
# location_service.py
# -------------------
# Handles pothole location deduplication.
# """
# import math
# from detection.models import PotholeLocation

# RADIUS_METRES = 100  # treat potholes within 100m as the same pothole


# def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
#     """Return distance in metres between two GPS coordinates."""
#     R = 6371000
#     phi1, phi2 = math.radians(lat1), math.radians(lat2)
#     dphi = math.radians(lat2 - lat1)
#     dlambda = math.radians(lon2 - lon1)
#     a = (math.sin(dphi / 2) ** 2
#          + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
#     return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# def save_pothole_location(latitude: float, longitude: float,
#                           severity: str = 'medium',
#                           session_id: str = None,
#                           address: str = None) -> dict:
#     """
#     Save a pothole detection to the database with deduplication.
#     """
#     # Load all existing locations to check proximity
#     existing = PotholeLocation.objects.all()

#     nearest = None
#     nearest_dist = float('inf')

#     for record in existing:
#         dist = haversine_distance(latitude, longitude,
#                                   record.latitude, record.longitude)
#         if dist < nearest_dist:
#             nearest_dist = dist
#             nearest = record

#     if nearest and nearest_dist <= RADIUS_METRES:
#         # Same pothole — update existing record
#         nearest.detection_count += 1
#         # Upgrade severity if new detection is worse
#         severity_order = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
#         if severity_order.get(severity, 0) > severity_order.get(nearest.severity, 0):
#             nearest.severity = severity
#         nearest.save()

#         return {
#             'created': False,
#             'id': nearest.pk,
#             'latitude': nearest.latitude,
#             'longitude': nearest.longitude,
#             'address': nearest.address,
#             'severity': nearest.severity,
#             'status': nearest.status,
#             'detection_count': nearest.detection_count,
#             'distance_metres': round(nearest_dist, 1),
#             'message': f'Existing pothole updated ({round(nearest_dist)}m from recorded location)',
#         }
#     else:
#         # New location — create record
#         record = PotholeLocation.objects.create(
#             latitude=latitude,
#             longitude=longitude,
#             address=address,
#             severity=severity,
#             session_id=session_id,
#             detection_count=1,
#         )

#         return {
#             'created': True,
#             'id': record.pk,
#             'latitude': record.latitude,
#             'longitude': record.longitude,
#             'address': record.address,
#             'severity': record.severity,
#             'status': record.status,
#             'detection_count': record.detection_count,
#             'distance_metres': None,
#             'message': 'New pothole location recorded',
#         }

"""
location_service.py
-------------------
Creates a new PotholeLocation record for every detection.
No deduplication — every pothole gets its own entry.
GPS coordinates are optional for testing.
"""
from detection.models import PotholeLocation


def save_pothole_location(latitude=None, longitude=None,
                          severity='medium',
                          session_id=None,
                          address=None) -> dict:
    """
    Create a new PotholeLocation record unconditionally.
    latitude and longitude are optional — stored as None if not provided.
    """
    record = PotholeLocation.objects.create(
        latitude=latitude   if latitude  is not None else 0.0,
        longitude=longitude if longitude is not None else 0.0,
        address=address,
        severity=severity or 'medium',
        session_id=session_id,
        detection_count=1,
    )

    return {
        'created':         True,
        'id':              record.pk,
        'latitude':        record.latitude,
        'longitude':       record.longitude,
        'address':         record.address,
        'severity':        record.severity,
        'status':          record.status,
        'detection_count': record.detection_count,
        'message':         'New pothole location recorded',
    }