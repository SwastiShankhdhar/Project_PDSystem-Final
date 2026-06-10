from django.urls import path
from geolocation.views import GeolocationPlaceholderView

app_name = 'geolocation'

urlpatterns = [
    path('', GeolocationPlaceholderView.as_view(), name='placeholder'),
]