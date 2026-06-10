import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: null,
});

// Custom marker icons for different severities
const severityIcons = {
  low: L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    // shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    shadowSize: [41, 41],
  }),
  medium: L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    // shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    shadowSize: [41, 41],
  }),
  high: L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    // shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    shadowSize: [41, 41],
  }),
  critical: L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    // shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    shadowSize: [41, 41],
  }),
};

const userIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  // shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  shadowSize: [41, 41],
});

const MapComponent = () => {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null); // ✅ Add this ref for the container
  const userMarkerRef = useRef(null);
  const potholeMarkersRef = useRef({});
  const [potholes, setPotholes] = useState([]);
  const [loading, setLoading] = useState(true);

  const DJANGO_URL = "http://localhost:8000/api/detection";

  // Fetch potholes from backend
  const fetchPotholes = async () => {
    try {
      const response = await fetch(`${DJANGO_URL}/locations/`);
      const data = await response.json();
      if (data.success) {
        setPotholes(data.potholes);
      } else if (Array.isArray(data)) {
        setPotholes(data);
      } else {
        setPotholes([]);
      }
    } catch (error) {
      console.error("Error fetching potholes:", error);
    }
  };

  // Initialize map - ✅ FIXED: Use setTimeout to ensure DOM is ready
  useEffect(() => {
    // Make sure the container exists
    if (!mapContainerRef.current) {
      console.log("Map container not ready yet");
      return;
    }

    // Check if map is already initialized
    if (mapRef.current) {
      console.log("Map already initialized");
      return;
    }

    // Small delay to ensure DOM is fully rendered
    setTimeout(() => {
      if (!mapContainerRef.current) return;
      
      console.log("Initializing map...");
      const map = L.map(mapContainerRef.current).setView([20.5937, 78.9629], 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }).addTo(map);
      mapRef.current = map;
      console.log("Map initialized successfully");
      
      // After map is initialized, fetch potholes
      fetchPotholes();
      setLoading(false);
    }, 100);
  }, []);

  // Get user location and add marker
  useEffect(() => {
    if (!mapRef.current) return;

    // Get user location
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Center map on user location
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 16);
          }
          
          // Update user marker
          if (userMarkerRef.current && mapRef.current) {
            mapRef.current.removeLayer(userMarkerRef.current);
          }
          
          if (mapRef.current) {
            userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
              .addTo(mapRef.current)
              .bindPopup("<b>📍 You are here</b>")
              .openPopup();
          }
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [mapRef.current]); // ✅ Run when map is ready

  // Auto-refresh potholes every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (mapRef.current) {
        fetchPotholes();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update pothole markers on map
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing pothole markers
    Object.values(potholeMarkersRef.current).forEach(marker => {
      if (mapRef.current) mapRef.current.removeLayer(marker);
    });
    potholeMarkersRef.current = {};

    // Add new markers for each pothole
    potholes.forEach((pothole) => {
      const icon = severityIcons[pothole.severity] || severityIcons.medium;
      
      const popupContent = `
        <div style="min-width: 200px;">
          <b>⚠️ Pothole Detected</b><br>
          <b>Severity:</b> ${pothole.severity?.toUpperCase() || 'Unknown'}<br>
          <b>Detected:</b> ${pothole.detection_count || 1} time(s)<br>
          <b>Location:</b><br>${pothole.address || `${pothole.latitude}, ${pothole.longitude}`}<br>
          <b>First detected:</b> ${new Date(pothole.first_detected).toLocaleString()}<br>
          <b>Status:</b> ${pothole.status || 'Reported'}
        </div>
      `;

      const marker = L.marker([pothole.latitude, pothole.longitude], { icon })
        .addTo(mapRef.current)
        .bindPopup(popupContent);
      
      potholeMarkersRef.current[pothole.id] = marker;
    });
  }, [potholes]);

  // Function to add a new pothole (called from camera component)
  const addPothole = (newPothole) => {
    setPotholes(prev => [newPothole, ...prev]);
    fetchPotholes();
  };

  // Expose methods via window for camera component to access
  useEffect(() => {
    window.mapComponent = { addPothole, fetchPotholes };
    return () => { delete window.mapComponent; };
  }, []);

  // SAME IMPORTS KEEP

// 👇 ONLY RETURN PART UPDATED

return (
  <div className="relative h-full w-full rounded-xl overflow-hidden border">

    {loading && (
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <span className="text-sm text-gray-600">Loading map...</span>
        </div>
      </div>
    )}

    <div
      ref={mapContainerRef}
      className="h-full w-full"
    />

  </div>
);
};

export default MapComponent;