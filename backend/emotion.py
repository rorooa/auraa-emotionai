import base64
import cv2
import numpy as np
import random
import os

# ---------------- FIX FOR TENSORFLOW 2.16+ / PYTHON 3.12 ----------------
# DeepFace requires legacy Keras behavior to avoid "__version__" errors
os.environ["TF_USE_LEGACY_KERAS"] = "1"

# ---------------- LAZY LOAD FLAGS ----------------
DEEPFACE_AVAILABLE = False
FER_AVAILABLE = False
MODELS_LOADED = False
fer_detector = None
DeepFace = None

def load_models():
    global fer_detector, DEEPFACE_AVAILABLE, FER_AVAILABLE, MODELS_LOADED, DeepFace
    if MODELS_LOADED:
        return

    print("[INFO] Loading Emotion Models...")

    # 1. Try FER (Facial Expression Recognition)
    try:
        from fer import FER
        # mtcnn=False is faster (OpenCV Haarcascade)
        fer_detector = FER(mtcnn=False) 
        FER_AVAILABLE = True
        print("[INFO] FER Library Loaded Successfully")
    except Exception as e:
        print(f"[WARNING] FER Library Import Error: {e}")

    # 2. Try DeepFace
    try:
        from deepface import DeepFace as DF
        DeepFace = DF
        DEEPFACE_AVAILABLE = True
        print("[INFO] DeepFace Library Loaded Successfully")
    except Exception as e:
        print(f"[WARNING] DeepFace Library Import Error: {e}")
    
    MODELS_LOADED = True

# ---------------- NORMALIZE EMOTIONS ----------------
def normalize_emotion(emotion: str) -> str:
    mapping = {
        "happy": "happy",
        "sad": "sad",
        "angry": "angry",
        "fear": "fear",
        "surprise": "surprise",
        "disgust": "disgust",
        "neutral": "neutral"
    }
    return mapping.get(emotion.lower(), "neutral")

# ---------------- CONFIDENCE FILTER ----------------
def confidence_filter(emotion: str, confidence: float, threshold: float = 0.30) -> str:
    if confidence < threshold:
        return "neutral"
    return emotion

# ---------------- MAIN FUNCTION ----------------
def detect_emotion_from_image(image_base64: str) -> str:
    # LAZY LOAD MODELS ON FIRST REQUEST ONLY
    load_models()
    
    try:
        # Decode base64
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
            
        image_bytes = base64.b64decode(image_base64)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            return "neutral"

        # ---------------- OPTION A: FER Library (Recommended Stability) ----------------
        if FER_AVAILABLE:
            # Returns list of dicts: [{'box': (x, y, w, h), 'emotions': {'angry': 0.0, ...}}]
            result = fer_detector.detect_emotions(frame)
            
            if result and len(result) > 0:
                # Get first face
                emotions = result[0]["emotions"]
                # Find max value
                dominant_emotion = max(emotions, key=emotions.get)
                confidence = emotions[dominant_emotion]
                
                return confidence_filter(normalize_emotion(dominant_emotion), confidence)

        # ---------------- OPTION B: DeepFace (If FER unavailable) ----------------
        if DEEPFACE_AVAILABLE:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = DeepFace.analyze(
                img_path=frame_rgb,
                actions=["emotion"],
                enforce_detection=False,
                align=False,
                detector_backend="opencv"
            )
            
            if isinstance(result, list):
                result = result[0]

            emotions = result["emotion"]
            dominant = result["dominant_emotion"]
            confidence = emotions.get(dominant, 0) / 100.0

            return confidence_filter(normalize_emotion(dominant), confidence)
            
        # ---------------- OPTION C: Pure OpenCV Fallback (No TF required) ----------------
        # If both ML libraries failed, we can at least detect smiles!
        if not FER_AVAILABLE and not DEEPFACE_AVAILABLE:
            try:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                # Load Haar classifiers
                face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
                smile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')
                
                faces = face_cascade.detectMultiScale(gray, 1.3, 5)
                
                for (x, y, w, h) in faces:
                    roi_gray = gray[y:y+h, x:x+w]
                    smiles = smile_cascade.detectMultiScale(roi_gray, 1.8, 20)
                    
                    if len(smiles) > 0:
                        return "happy"
                        
                return "neutral"
            except Exception:
                return "neutral"
            
        # ---------------- FALLBACK ----------------
        return "neutral"

    except Exception as e:
        print(f"[ERROR] Emotion Detection Error: {e}")
        return "neutral"
