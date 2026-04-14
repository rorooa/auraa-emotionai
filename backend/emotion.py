import base64
import cv2
import numpy as np
import os

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_USE_LEGACY_KERAS"] = "1"

# ---------------- EMOTION LABELS (FER standard) ----------------
EMOTION_LABELS = {
    0: "angry",
    1: "disgust",
    2: "fear",
    3: "happy",
    4: "sad",
    5: "surprise",
    6: "neutral",
}

# ---------------- LAZY LOAD FLAGS ----------------
TFLITE_LOADED = False
tflite_interpreter = None
tflite_input_details = None
tflite_output_details = None
face_cascade = None

def load_models():
    global TFLITE_LOADED, tflite_interpreter, tflite_input_details, tflite_output_details, face_cascade

    if TFLITE_LOADED:
        return

    print("[INFO] Loading Emotion Models (Direct TFLite + OpenCV)...")

    # Load OpenCV face detector
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    print("[INFO] OpenCV Face Cascade Loaded")

    # Find the tflite model — bundled inside the fer package
    try:
        import importlib.util
        fer_spec = importlib.util.find_spec("fer")
        if fer_spec and fer_spec.origin:
            fer_dir = os.path.dirname(fer_spec.origin)
            tflite_path = os.path.join(fer_dir, "data", "emotion_model_quantized.tflite")
            if not os.path.exists(tflite_path):
                raise FileNotFoundError(f"TFLite model not at: {tflite_path}")
        else:
            raise ImportError("fer package not found")

        import tensorflow as tf
        tflite_interpreter = tf.lite.Interpreter(model_path=tflite_path)
        tflite_interpreter.allocate_tensors()
        tflite_input_details = tflite_interpreter.get_input_details()
        tflite_output_details = tflite_interpreter.get_output_details()
        TFLITE_LOADED = True
        print(f"[INFO] TFLite Emotion Model Loaded: {tflite_path}")
    except Exception as e:
        print(f"[ERROR] Could not load TFLite model: {e}")

# ---------------- NORMALIZE EMOTIONS ----------------
def normalize_emotion(emotion: str) -> str:
    mapping = {
        "happy": "happy",
        "sad": "sad",
        "angry": "angry",
        "fear": "fear",
        "surprise": "surprise",
        "disgust": "disgust",
        "neutral": "neutral",
    }
    return mapping.get(emotion.lower(), "neutral")

# ---------------- CONFIDENCE FILTER ----------------
def confidence_filter(emotion: str, confidence: float, threshold: float = 0.10) -> str:
    if confidence < threshold:
        return "neutral"
    return emotion

# ---------------- RUN TFLITE INFERENCE ----------------
def predict_emotion_tflite(gray_face_64x64: np.ndarray) -> dict:
    """Run TFLite inference on a preprocessed 64x64 grayscale face patch."""
    # Normalize: values expected in [-1, 1]
    face = gray_face_64x64.astype(np.float32) / 255.0
    face = (face - 0.5) * 2.0
    # Shape: (1, 64, 64, 1)
    face = np.expand_dims(face, axis=0)
    face = np.expand_dims(face, axis=-1)

    tflite_interpreter.set_tensor(tflite_input_details[0]["index"], face)
    tflite_interpreter.invoke()
    output = tflite_interpreter.get_tensor(tflite_output_details[0]["index"])[0]

    return {EMOTION_LABELS[i]: float(output[i]) for i in range(len(output))}

# ---------------- MAIN FUNCTION ----------------
def detect_emotion_from_image(image_base64: str) -> str:
    load_models()

    try:
        # Decode base64
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]

        image_bytes = base64.b64decode(image_base64)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            print("[WARNING] Could not decode image frame")
            return "neutral"

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        if not TFLITE_LOADED or face_cascade is None:
            print("[WARNING] Models not loaded, returning neutral")
            return "neutral"

        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.05,
            minNeighbors=3,
            minSize=(20, 20),
            flags=cv2.CASCADE_SCALE_IMAGE
        )

        if len(faces) == 0:
            print("[DEBUG] No face detected in frame")
            return "neutral"

        # Use the largest face
        x, y, w, h = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)[0]

        # Add padding (clamped to image bounds)
        pad = 10
        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(gray.shape[1], x + w + pad)
        y2 = min(gray.shape[0], y + h + pad)

        face_roi = gray[y1:y2, x1:x2]
        face_64 = cv2.resize(face_roi, (64, 64))

        emotions = predict_emotion_tflite(face_64)
        dominant = max(emotions, key=emotions.get)
        confidence = emotions[dominant]

        print(f"[DEBUG] Emotions: {emotions}")
        print(f"[DEBUG] Dominant: {dominant} ({confidence:.2f})")

        return confidence_filter(normalize_emotion(dominant), confidence)

    except Exception as e:
        print(f"[ERROR] Emotion Detection Error: {e}")
        import traceback
        traceback.print_exc()
        return "neutral"
