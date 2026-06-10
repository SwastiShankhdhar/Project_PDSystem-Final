from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    return Response({
        'status': 'Pothole Detection API is running',
        'version': '1.0',
        'endpoints': {
            'detection': {
                'detect':  request.build_absolute_uri('/api/detection/detect/'),
                'history': request.build_absolute_uri('/api/detection/history/'),
                'detail':  request.build_absolute_uri('/api/detection/<id>/'),
            },
            'geolocation': request.build_absolute_uri('/api/geolocation/'),
            'reporting':   request.build_absolute_uri('/api/reporting/'),
            'auth': {
                'login':  request.build_absolute_uri('/api/auth/login/'),
                'logout': request.build_absolute_uri('/api/auth/logout/'),
            },
            'admin': request.build_absolute_uri('/admin/'),
        }
    })


urlpatterns = [

    path('',          api_root,                               name='api-root'),
    path('admin/',    admin.site.urls),
    path('api/detection/',  include('detection.urls')),
    path('api/geolocation/', include('geolocation.urls')),
    path('api/reporting/',   include('reporting.urls')),
    path('api/auth/',        include('rest_framework.urls')),

]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
