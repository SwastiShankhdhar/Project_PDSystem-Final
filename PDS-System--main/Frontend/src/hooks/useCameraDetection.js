/**
 * useCameraDetection.js
 * ---------------------
 * React custom hook for live webcam pothole detection.
 *
 * Usage in Dashboard.jsx:
 *
 *   import useCameraDetection from './hooks/useCameraDetection'
 *
 *   function Dashboard() {
 *     const {
 *       videoRef,        // attach to <video ref={videoRef} autoPlay />
 *       canvasRef,       // attach to <canvas ref={canvasRef} />
 *       isRunning,       // boolean — is detection active?
 *       lastResult,      // latest detection result from Django
 *       startDetection,  // call to start webcam + detection loop
 *       stopDetection,   // call to stop
 *     } = useCameraDetection()
 *
 *     return (
 *       <div>
 *         <video ref={videoRef} autoPlay muted style={{ display: 'none' }} />
 *         <canvas ref={canvasRef} width={640} height={480} />
 *         <button onClick={startDetection}>Start</button>
 *         <button onClick={stopDetection}>Stop</button>
 *         {lastResult?.detected && <p>Pothole detected!</p>}
 *       </div>
 *     )
 *   }
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { detectFromCamera, savePotholeLocation } from "./api";

// How often to send a frame to Django (milliseconds)
// 1000ms = 1 frame per second (safe for backend load)
// 500ms = 2 frames per second (faster but more server load)
const DETECTION_INTERVAL_MS = 1000;

// Minimum gap between location saves (milliseconds)
const LOCATION_SAVE_COOLDOWN_MS = 10000;  // 10 seconds

export default function useCameraDetection() {
  const videoRef    = useRef(null);   // <video> element
  const canvasRef   = useRef(null);   // <canvas> element for drawing
  const streamRef   = useRef(null);   // MediaStream from getUserMedia
  const intervalRef = useRef(null);   // setInterval handle
  const lastSaveRef = useRef(0);      // timestamp of last location save
  const sessionId   = useRef(`session_${Date.now()}`);

  const [isRunning,  setIsRunning]  = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error,      setError]      = useState(null);
  const [gpsCoords,  setGpsCoords]  = useState({ lat: null, lng: null });

  // Get GPS coordinates continuously
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setGpsCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }),
      (err) => console.warn("GPS error:", err.message),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Capture one frame from video, send to Django, draw bounding boxes
  const captureAndDetect = useCallback(async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const ctx = canvas.getContext("2d");
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;

    // Draw current video frame onto canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get frame as base64 JPEG
    const base64Image = canvas.toDataURL("image/jpeg", 0.8);

    try {
      const result = await detectFromCamera(
        base64Image,
        gpsCoords.lat,
        gpsCoords.lng,
        sessionId.current
      );

      setLastResult(result);

      if (result.detected) {
        // Draw bounding boxes on canvas
        drawBoundingBoxes(ctx, result.detections, canvas.width, canvas.height);

        // Play beep alert
        playBeep();

        // Save location — max once per 10 seconds to avoid spam
        const now = Date.now();
        if (gpsCoords.lat && now - lastSaveRef.current > LOCATION_SAVE_COOLDOWN_MS) {
          lastSaveRef.current = now;
          savePotholeLocation(
            gpsCoords.lat,
            gpsCoords.lng,
            result.severity || "medium",
            sessionId.current
          ).catch(console.error);
        }
      }
    } catch (err) {
      console.error("Detection error:", err.message);
    }
  }, [gpsCoords]);

  // Draw bounding boxes and labels on canvas
  function drawBoundingBoxes(ctx, detections, width, height) {
    detections.forEach(({ label, confidence, bbox }) => {
      const [x1, y1, x2, y2] = bbox;

      // Red bounding box
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth   = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      // Label background
      const text = `${label} ${Math.round(confidence * 100)}%`;
      ctx.font = "bold 14px Arial";
      const textWidth = ctx.measureText(text).width;

      ctx.fillStyle = "#FF0000";
      ctx.fillRect(x1, y1 - 22, textWidth + 8, 22);

      // Label text
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(text, x1 + 4, y1 - 5);
    });
  }

  // Generate and play a beep using Web Audio API
  function playBeep() {
    try {
      const audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode   = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type      = "sine";
      oscillator.frequency.value = 880;  // Hz — sharp alert tone
      gainNode.gain.value  = 0.4;

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);  // 400ms beep
    } catch (e) {
      console.warn("Audio not available:", e);
    }
  }

  // Start webcam and detection loop
  const startDetection = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "environment" }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Wait for video to be ready then start interval
      await new Promise((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = resolve;
        }
      });

      setIsRunning(true);
      intervalRef.current = setInterval(captureAndDetect, DETECTION_INTERVAL_MS);

    } catch (err) {
      setError("Could not access camera: " + err.message);
    }
  }, [captureAndDetect]);

  // Stop webcam and detection loop
  const stopDetection = useCallback(() => {
    clearInterval(intervalRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsRunning(false);
    setLastResult(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopDetection();
  }, [stopDetection]);

  return {
    videoRef,
    canvasRef,
    isRunning,
    lastResult,
    error,
    gpsCoords,
    startDetection,
    stopDetection,
  };
}
