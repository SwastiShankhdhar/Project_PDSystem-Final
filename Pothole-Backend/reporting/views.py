from rest_framework.views import APIView
from rest_framework.response import Response

class ReportingPlaceholderView(APIView):
    def get(self, request):
        return Response({'message': 'Reporting module coming soon.'})