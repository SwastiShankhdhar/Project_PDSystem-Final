from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


class UserManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)
        return self.create_user(email, username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        GUEST      = 'guest',      'Guest'
        REGISTERED = 'registered', 'Registered User'
        ADMIN      = 'admin',      'Admin'

    username   = models.CharField(max_length=150, unique=True)
    email      = models.EmailField(unique=True)
    role       = models.CharField(max_length=20, choices=Role.choices, default=Role.REGISTERED)
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    groups = models.ManyToManyField(
        'auth.Group',
        blank=True,
        related_name='detection_users',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        blank=True,
        related_name='detection_users',
        verbose_name='user permissions',
    )

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} ({self.email})"


class DetectionResult(models.Model):
    class InputType(models.TextChoices):
        UPLOAD = 'upload', 'File Upload'
        URL    = 'url',    'Image URL'
        CAMERA = 'camera', 'Live Camera'

    class Severity(models.TextChoices):
        LOW      = 'low',      'Low'
        MEDIUM   = 'medium',   'Medium'
        HIGH     = 'high',     'High'
        CRITICAL = 'critical', 'Critical'

    class Status(models.TextChoices):
        DETECTED       = 'detected',       'Detected'
        VERIFIED       = 'verified',       'Verified'
        REPAIRED       = 'repaired',       'Repaired'
        FALSE_POSITIVE = 'false_positive', 'False Positive'

    input_type      = models.CharField(max_length=10, choices=InputType.choices)
    input_image     = models.ImageField(upload_to='detections/input/', blank=True, null=True)
    input_image_url = models.URLField(blank=True, null=True)
    annotated_image = models.ImageField(upload_to='detections/output/', blank=True, null=True)
    pothole_count   = models.PositiveIntegerField(default=0)
    detections_json = models.JSONField(default=list)
    processing_time = models.FloatField(null=True, blank=True)
    latitude        = models.FloatField(null=True, blank=True)
    longitude       = models.FloatField(null=True, blank=True)
    address         = models.TextField(blank=True, null=True)
    session_id      = models.CharField(max_length=100, blank=True, null=True)
    severity        = models.CharField(max_length=10, choices=Severity.choices, default=Severity.MEDIUM)
    status          = models.CharField(max_length=15, choices=Status.choices, default=Status.DETECTED)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'detection_results'
        ordering = ['-created_at']
        verbose_name = 'Detection Result'
        verbose_name_plural = 'Detection Results'

    def __str__(self):
        return f"Detection #{self.pk} — {self.pothole_count} pothole(s)"


class PotholeLocation(models.Model):
    """
    Stores unique pothole locations deduplicated by  radius.
    Instead of creating a new record per detection, we increment
    detection_count when the same pothole is hit again.
    """

    class Severity(models.TextChoices):
        LOW      = 'low',      'Low'
        MEDIUM   = 'medium',   'Medium'
        HIGH     = 'high',     'High'
        CRITICAL = 'critical', 'Critical'

    class Status(models.TextChoices):
        REPORTED    = 'reported',    'Reported'
        IN_PROGRESS = 'in_progress', 'In Progress'
        FIXED       = 'fixed',       'Fixed'
        PENDING     = 'pending',     'Pending'

    # GPS coordinates
    latitude  = models.FloatField()
    longitude = models.FloatField()
    address   = models.TextField(blank=True, null=True)

    # Classification
    severity = models.CharField(
        max_length=10,
        choices=Severity.choices,
        default=Severity.MEDIUM
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REPORTED
    )

    # How many times this pothole was detected
    detection_count = models.PositiveIntegerField(default=1)

    # Session that first found it
    session_id = models.CharField(max_length=100, blank=True, null=True)

    # Timestamps
    first_detected = models.DateTimeField(auto_now_add=True)
    last_detected  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pothole_locations'
        ordering = ['-last_detected']
        verbose_name = 'Pothole Location'
        verbose_name_plural = 'Pothole Locations'

    def __str__(self):
        return f"Pothole #{self.pk} at ({self.latitude:.4f}, {self.longitude:.4f}) — detected {self.detection_count}x"
    
