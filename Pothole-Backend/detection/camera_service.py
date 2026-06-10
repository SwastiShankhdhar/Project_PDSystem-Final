"""
camera_service.py
-----------------
Handles:
  1. Webcam capture via OpenCV
  2. YOLO inference on each frame
  3. Bounding box annotation drawn on live frame
  4. Beep alert (.wav) on pothole detection with 3-second cooldown

Run entirely in a background thread — never blocks Django.
"""
import time
import threading
import numpy as np
import cv2
import wave
import struct
import os
import tempfile
from pathlib import Path

from detection.yolo_service import get_model


# ── State (shared between thread and views) ───────────────────────────────────
_state = {
    'running':        False,
    'thread':         None,
    'last_alert_at':  0,
    'pothole_count':  0,
    'frame_count':    0,
    'last_detection': [],   # list of {label, confidence, bbox}
    'error':          None,
}
_state_lock = threading.Lock()

COOLDOWN_SECONDS   = 3
CONFIDENCE_THRESHOLD = 0.5


# ── Beep generator ────────────────────────────────────────────────────────────

def _generate_beep_wav() -> str:
    """
    Generate a short 880Hz beep and save as a temp .wav file.
    Returns the file path.
    Uses only numpy + wave (both already installed).
    """
    sample_rate = 44100
    duration    = 0.4        # seconds
    frequency   = 880        # Hz — sharp alert tone
    volume      = 0.6        # 0.0 to 1.0

    t= np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    wave_data = (np.sin(2 * np.pi * frequency * t) * volume * 32767).astype(np.int16)

    # Fade out last 10% to avoid click at end
    fade_len = int(len(wave_data) * 0.10)
    fade     = np.linspace(1.0, 0.0, fade_len)
    wave_data[-fade_len:] = (wave_data[-fade_len:] * fade).astype(np.int16)

    tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
    with wave.open(tmp.name, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(struct.pack(f'<{len(wave_data)}h', *wave_data))

    return tmp.name


# Generate once at module load — reuse across alerts
_BEEP_FILE = _generate_beep_wav()


def _play_beep():
    """Play the beep non-blocking using winsound (Windows built-in, no install needed)."""
    try:
        import winsound
        winsound.PlaySound(_BEEP_FILE, winsound.SND_FILENAME | winsound.SND_ASYNC)
    except ImportError:
        # Non-Windows fallback — use os bell
        print('\a', end='', flush=True)
    except Exception:
        pass


# ── Core camera loop ──────────────────────────────────────────────────────────

def _camera_loop():
    """
    Main loop running in background thread:
      - Opens webcam
      - Reads frames
      - Runs YOLO
      - Draws annotations
      - Plays beep on detection with cooldown
      - Shows live annotated window
    """
    global _state

    model = None
    cap   = None

    try:
        model = get_model()
        cap   = cv2.VideoCapture(0)   # 0 = default webcam

        if not cap.isOpened():
            with _state_lock:
                _state['error']   = 'Could not open webcam. Check camera connection.'
                _state['running'] = False
            return

        # Window name
        WIN = 'Pothole Detection — Press Q to stop'
        cv2.namedWindow(WIN, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(WIN, 900, 600)
        cv2.moveWindow(WIN, 100, 100)   # force to visible position on screen
 

        with _state_lock:
            _state['error'] = None

        while True:
            # Check stop signal
            with _state_lock:
                if not _state['running']:
                    break

            ret, frame = cap.read()
            if not ret:
                with _state_lock:
                    _state['error'] = 'Failed to read frame from webcam.'
                break

            with _state_lock:
                _state['frame_count'] += 1

            # ── YOLO inference ────────────────────────────────────────────
            results     = model(frame, verbose=False)
            detections  = []
            annotated   = frame.copy()

            for box in results[0].boxes:
                conf  = float(box.conf[0])
                if conf < CONFIDENCE_THRESHOLD:
                    continue

                label       = model.names[int(box.cls[0])]
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

                detections.append({
                    'label':      label,
                    'confidence': round(conf, 4),
                    'bbox':       [x1, y1, x2, y2],
                })

                # Draw bounding box
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 255), 2)

                # Label background
                label_text = f'{label} {conf:.0%}'
                (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(annotated, (x1, y1 - th - 10), (x1 + tw + 6, y1), (0, 0, 255), -1)
                cv2.putText(annotated, label_text,
                            (x1 + 3, y1 - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

            # ── HUD overlay ───────────────────────────────────────────────
            status_text  = f'Potholes: {len(detections)}'
            status_color = (0, 0, 255) if detections else (0, 200, 0)
            cv2.putText(annotated, status_text,
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2)
            cv2.putText(annotated, f'Frame: {_state["frame_count"]}',
                        (10, 58), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
            cv2.putText(annotated, 'Press Q to stop',
                        (10, annotated.shape[0] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

            # ── Alert logic ───────────────────────────────────────────────
            now = time.time()
            if detections:
                with _state_lock:
                    _state['last_detection'] = detections
                    _state['pothole_count']  = len(detections)
                    last_alert = _state['last_alert_at']

                if now - last_alert >= COOLDOWN_SECONDS:
                    _play_beep()
                    with _state_lock:
                        _state['last_alert_at'] = now
            else:
                with _state_lock:
                    _state['last_detection'] = []
                    _state['pothole_count']  = 0

            # ── Show frame ────────────────────────────────────────────────
            cv2.imshow(WIN, annotated)

            # Q key or window close = stop
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    except Exception as exc:
        with _state_lock:
            _state['error'] = str(exc)

    finally:
        if cap:
            cap.release()
        cv2.destroyAllWindows()
        with _state_lock:
            _state['running'] = False


# ── Public API (called from views.py) ────────────────────────────────────────

def start_camera():
    """Start the camera detection loop in a background thread."""
    with _state_lock:
        if _state['running']:
            return {'started': False, 'message': 'Camera is already running.'}

        _state['running']        = True
        _state['frame_count']    = 0
        _state['pothole_count']  = 0
        _state['last_detection'] = []
        _state['last_alert_at']  = 0
        _state['error']          = None

    t = threading.Thread(target=_camera_loop, daemon=True)
    t.start()

    with _state_lock:
        _state['thread'] = t

    return {'started': True, 'message': 'Camera detection started.'}


def stop_camera():
    """Signal the camera loop to stop."""
    with _state_lock:
        if not _state['running']:
            return {'stopped': False, 'message': 'Camera is not running.'}
        _state['running'] = False

    return {'stopped': True, 'message': 'Camera detection stopping...'}


def get_status():
    """Return current detection state (safe snapshot)."""
    with _state_lock:
        return {
            'running':        _state['running'],
            'frame_count':    _state['frame_count'],
            'pothole_count':  _state['pothole_count'],
            'last_detection': list(_state['last_detection']),
            'error':          _state['error'],
        }
