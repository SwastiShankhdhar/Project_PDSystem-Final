from rest_framework import serializers
from .models import DetectionResult


class DetectionRequestSerializer(serializers.Serializer):
    """Validates incoming detection requests (upload, URL, or camera)."""
    image      = serializers.ImageField(required=False)
    image_url  = serializers.URLField(required=False)
    
    # NEW: Camera and geotagging fields
    latitude   = serializers.FloatField(required=False, allow_null=True)
    longitude  = serializers.FloatField(required=False, allow_null=True)
    session_id = serializers.CharField(required=False, allow_blank=True)
    severity   = serializers.ChoiceField(choices=['low', 'medium', 'high', 'critical'], required=False)

    def validate(self, attrs):
        # Check if image source is provided
        has_image = attrs.get('image') is not None
        has_url = attrs.get('image_url') is not None
        has_camera = attrs.get('latitude') is not None and attrs.get('longitude') is not None
        
        if not (has_image or has_url or has_camera):
            raise serializers.ValidationError(
                "Provide either 'image' (file upload), 'image_url', or camera coordinates (latitude/longitude)."
            )
        
        # Validate coordinates if provided
        if attrs.get('latitude') is not None:
            if not -90 <= attrs['latitude'] <= 90:
                raise serializers.ValidationError("Latitude must be between -90 and 90")
        
        if attrs.get('longitude') is not None:
            if not -180 <= attrs['longitude'] <= 180:
                raise serializers.ValidationError("Longitude must be between -180 and 180")
        
        return attrs


class DetectionResultSerializer(serializers.ModelSerializer):
    """Serialises a stored DetectionResult for API responses."""
    annotated_image_url = serializers.SerializerMethodField()
    input_image_url_display = serializers.SerializerMethodField()

    class Meta:
        model = DetectionResult
        fields = [
            'id',
            'input_type',
            'input_image_url',
            'input_image_url_display',
            'annotated_image_url',
            'pothole_count',
            'detections_json',
            'processing_time',
            'created_at',
            # NEW fields
            'latitude',
            'longitude',
            'address',
            'severity',
            'status',
            'session_id',
        ]

    def get_annotated_image_url(self, obj):
        request = self.context.get('request')
        if obj.annotated_image and request:
            return request.build_absolute_uri(obj.annotated_image.url)
        return None
    
    def get_input_image_url_display(self, obj):
        """Show input image URL if available"""
        if obj.input_image and hasattr(obj.input_image, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.input_image.url)
        return obj.input_image_url
