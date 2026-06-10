import { useState, useRef, useEffect, useCallback } from "react";
import { detectFromCamera, savePotholeLocation } from "../services/api";

const DETECTION_INTERVAL_MS = 2000;

const Camera = () => {
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const intervalRef  = useRef(null);
  const sessionIdRef = useRef(`session_${Date.now()}`);
  const gpsRef       = useRef(null);

  const [isActive,       setIsActive]       = useState(false);
  const [isDetecting,    setIsDetecting]    = useState(false);
  const [isProcessing,   setIsProcessing]   = useState(false);
  const [lastDetection,  setLastDetection]  = useState(null);
  const [detectionCount, setDetectionCount] = useState(0);
  const [location,       setLocation]       = useState(null);
  const [error,          setError]          = useState(null);

  // GPS watch — runs whenever camera is active
  useEffect(() => {
    if (!isActive) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        gpsRef.current = coords;
      },
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isActive]);

  // Beep via Web Audio API
  const playBeep = () => {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio unavailable:", e);
    }
  };

  // Draw annotations from Django response onto canvas overlay
  const drawAnnotations = useCallback((annotatedB64) => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = `data:image/jpeg;base64,${annotatedB64}`;
  }, []);

  // Core detection cycle
  const captureAndDetect = useCallback(async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || isProcessing) return;

    setIsProcessing(true);

    // Capture frame
    const capture = document.createElement("canvas");
    capture.width  = video.videoWidth;
    capture.height = video.videoHeight;
    capture.getContext("2d").drawImage(video, 0, 0);
    const base64Frame = capture.toDataURL("image/jpeg", 0.8);

    const gps = gpsRef.current;

    try {
      const data = await detectFromCamera(
        base64Frame,
        gps?.lat ?? null,
        gps?.lng ?? null,
        sessionIdRef.current
      );

      setLastDetection(data);

      if (data.detected) {
        setDetectionCount(prev => prev + 1);

        // Draw annotated frame (bounding boxes from Django/YOLO)
        if (data.annotated_b64) {
          drawAnnotations(data.annotated_b64);
        }

        // Beep alert
        playBeep();

        // Save location if GPS available
        if (gps?.lat) {
          savePotholeLocation(
            gps.lat, gps.lng,
            data.severity || "medium",
            sessionIdRef.current
          ).catch(console.error);
        }

        // Update map if available
        if (gps?.lat && window.mapComponent?.addPothole) {
          window.mapComponent.addPothole({
            id:        Date.now(),
            latitude:  gps.lat,
            longitude: gps.lng,
            severity:  data.severity,
          });
        }
      } else {
        // Clear canvas when no pothole — show clean video feed
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (e) {
      console.error("Detection error:", e.message);
    }

    setIsProcessing(false);
  }, [drawAnnotations, isProcessing]);

  // Start camera only
  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsActive(true);
      setDetectionCount(0);
      setLastDetection(null);
    } catch (err) {
      setError("Camera permission denied or not available");
    }
  };

  // Start detection loop separately
  const startDetection = () => {
    if (intervalRef.current) return;
    setIsDetecting(true);
    intervalRef.current = setInterval(captureAndDetect, DETECTION_INTERVAL_MS);
  };

  // Stop detection loop only
  const stopDetection = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsDetecting(false);
    // Clear annotations
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Stop camera entirely
  const stopCamera = () => {
    stopDetection();
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
    setLastDetection(null);
  };

  // Status badge content
  const statusLabel = () => {
    if (!isActive)    return null;
    if (isDetecting)  return isProcessing ? "Detecting..." : `Detecting • ${detectionCount}`;
    return `Live • ${detectionCount}`;
  };

  const statusColor = () => {
    if (isDetecting && lastDetection?.detected) return "bg-red-500/80";
    if (isDetecting)  return "bg-yellow-500/80";
    return "bg-green-500/80";
  };

  return (
    <div className="space-y-4">

      {/* VIDEO + CANVAS OVERLAY */}
      <div className="relative rounded-xl overflow-hidden border bg-black">

        {/* Live video feed */}
        <video
          ref={videoRef}
          className="w-full h-[300px] object-cover rounded-xl"
          style={{ transform: "none" }}
          playsInline
          muted
        />

        {/* Canvas overlay — shows YOLO annotations */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded-xl"
          style={{ pointerEvents: "none" }}
        />

        {/* Status badge */}
        {isActive && (
          <div className={`absolute top-3 right-3 text-white text-xs px-3 py-1 rounded-full font-medium ${statusColor()}`}>
            {statusLabel()}
          </div>
        )}

        {/* GPS coordinates */}
        {location && (
          <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded">
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </div>
        )}

        {/* Pothole alert overlay — flashes when detected */}
        {isDetecting && lastDetection?.detected && (
          <div className="absolute top-3 left-3 bg-red-600/90 text-white text-xs px-3 py-1 rounded-full font-bold animate-pulse">
            ⚠️ POTHOLE — {lastDetection.severity?.toUpperCase()}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {!isActive ? (
          <button
            onClick={startCamera}
            className="flex-1 py-2 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 transition"
          >
            Start Camera
          </button>
        ) : (
          <>
            {!isDetecting ? (
              <button
                onClick={startDetection}
                className="flex-1 py-2 rounded-lg text-white font-medium bg-yellow-500 hover:bg-yellow-600 transition"
              >
                🔍 Start Detection
              </button>
            ) : (
              <button
                onClick={stopDetection}
                className="flex-1 py-2 rounded-lg text-white font-medium bg-orange-500 hover:bg-orange-600 transition"
              >
                ⏹ Stop Detection
              </button>
            )}
            <button
              onClick={stopCamera}
              className="flex-1 py-2 rounded-lg text-white font-medium bg-red-500 hover:bg-red-600 transition"
            >
              Stop Camera
            </button>
          </>
        )}
      </div>

      {/* Session stats */}
      {isActive && (
        <div className="flex gap-3 text-sm">
          <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center border">
            <div className="text-2xl font-bold text-red-500">{detectionCount}</div>
            <div className="text-gray-500 text-xs mt-1">Potholes This Session</div>
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center border">
            <div className="text-2xl font-bold text-blue-500">
              {lastDetection?.highest_confidence ?? "—"}
              {lastDetection?.highest_confidence ? "%" : ""}
            </div>
            <div className="text-gray-500 text-xs mt-1">Last Confidence</div>
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center border">
            <div className="text-2xl font-bold text-green-500">
              {lastDetection?.severity ?? "—"}
            </div>
            <div className="text-gray-500 text-xs mt-1">Last Severity</div>
          </div>
        </div>
      )}

      {/* Last detection detail */}
      {lastDetection?.detected && (
        <div className="p-3 rounded-lg border bg-yellow-50 text-sm">
          ⚠️ <strong>Pothole Detected</strong><br />
          Severity: <b>{lastDetection.severity}</b> &nbsp;|&nbsp;
          Confidence: <b>{lastDetection.highest_confidence}%</b> &nbsp;|&nbsp;
          Count: <b>{lastDetection.pothole_count}</b>
        </div>
      )}
    </div>
  );
};

export default Camera;