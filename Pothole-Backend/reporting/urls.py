from django.urls import path
from reporting.views import ReportingPlaceholderView

app_name = 'reporting'

urlpatterns = [
    path('', ReportingPlaceholderView.as_view(), name='placeholder'),
]