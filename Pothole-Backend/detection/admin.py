from django.contrib import admin
from .models import PotholeLocation, DetectionResult


@admin.register(PotholeLocation)
class PotholeLocationAdmin(admin.ModelAdmin):
    list_display  = ('id', 'latitude', 'longitude', 'severity', 'status', 'detection_count', 'last_detected', 'session_id')
    list_filter   = ('severity', 'status')
    search_fields = ('address', 'session_id')
    readonly_fields = ('first_detected', 'last_detected', 'detection_count')
    ordering      = ('-last_detected',)
# @admin.register(User)
# class UserAdmin(BaseUserAdmin):
#     list_display = ('username', 'email', 'role', 'is_active', 'created_at')
#     list_filter = ('role', 'is_active')
#     fieldsets = (
#         (None, {'fields': ('email', 'username', 'password')}),
#         ('Role', {'fields': ('role',)}),
#         ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
#     )
#     add_fieldsets = (
#         (None, {
#             'classes': ('wide',),
#             'fields': ('email', 'username', 'password1', 'password2', 'role'),
#         }),
#     )
#     ordering = ('-created_at',)
#     search_fields = ('email', 'username')


@admin.register(DetectionResult)
class DetectionResultAdmin(admin.ModelAdmin):
    list_display = ('id', 'input_type', 'pothole_count', 'processing_time', 'created_at')
    list_filter = ('input_type',)
    readonly_fields = ('detections_json', 'annotated_image', 'processing_time', 'created_at')
    ordering = ('-created_at',)


# @admin.register(PotholeReport)
# class PotholeReportAdmin(admin.ModelAdmin):
#     list_display = ('id', 'user', 'confirmed_severity', 'status', 'address', 'reported_at')
#     list_filter = ('status', 'confirmed_severity', 'yolo_severity')
#     readonly_fields = ('reported_at', 'updated_at')
#     ordering = ('-reported_at',)
