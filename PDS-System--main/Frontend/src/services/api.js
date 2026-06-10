/**
 * api.js
 * ------
 * All Django backend API calls for the React frontend.
 */

const DJANGO_BASE = "http://localhost:8000";

/**
 * Call this ONCE when the app loads.
 */
export async function initDjango() {
  try {
    const response = await fetch(`${DJANGO_BASE}/api/detection/health/`);
    const data = await response.json();
    console.log("✅ Django backend connected:", data);
    return data;
  } catch (error) {
    console.error("❌ Django backend not available:", error);
    return null;
  }
}

// ─── CAMERA DETECTION ────────────────────────────────────────────────────────

export async function detectFromCamera(base64Image, lat = null, lng = null, sessionId = "") {
  try {
    console.log("📤 Sending frame to Django...");
    
    const payload = {
      image_base64: base64Image,
      session_id: sessionId,
    };
    
    if (lat !== null && lng !== null) {
      payload.latitude = lat;
      payload.longitude = lng;
    }
    
    const response = await fetch(`${DJANGO_BASE}/api/detection/camera/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Response error:", errorText);
      throw new Error(`Detection failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("📥 Detection response:", data);
    return data;
  } catch (error) {
    console.error("❌ Detection API error:", error);
    throw error;
  }
}

// ─── LOCATION SAVING ─────────────────────────────────────────────────────────

export async function savePotholeLocation(lat, lng, severity = "medium", sessionId = "", address = null) {
  try {
    const response = await fetch(`${DJANGO_BASE}/api/detection/save-location/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        severity: severity,
        session_id: sessionId,
        address: address,
      }),
    });

    if (!response.ok) {
      throw new Error(`Save location failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("❌ Save location error:", error);
    throw error;
  }
}

export async function getPotholeLocations() {
  try {
    const response = await fetch(`${DJANGO_BASE}/api/detection/locations/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch locations: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("❌ Get locations error:", error);
    return { success: false, potholes: [] };
  }
}

export async function getDetectionHistory() {
  const response = await fetch(`${DJANGO_BASE}/api/detection/history/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.status}`);
  }
  return response.json();
}

export async function getDetectionById(id) {
  const response = await fetch(`${DJANGO_BASE}/api/detection/${id}/`);
  if (!response.ok) {
    throw new Error(`Detection ${id} not found`);
  }
  return response.json();
}

export async function detectFromUpload(imageFile) {
  const formData = new FormData();
  formData.append("image", imageFile);

  const response = await fetch(`${DJANGO_BASE}/api/detection/detect/`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Upload detection failed: ${response.status}`);
  }

  return response.json();
}