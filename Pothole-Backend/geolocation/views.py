from rest_framework.views import APIView
from rest_framework.response import Response

class GeolocationPlaceholderView(APIView):
    def get(self, request):
        return Response({'message': 'Geolocation module coming soon.'})