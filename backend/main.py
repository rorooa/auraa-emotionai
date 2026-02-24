import sys
import io

# Force UTF-8 stdout to avoid Windows charmap errors in the console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import socketio
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from chatbot_llm import generate_llm_reply
from emotion import detect_emotion_from_image
from emotion_smoothing import smooth_emotion
from pydantic import BaseModel

# ---------------- FASTAPI ----------------
fastapi_app = FastAPI()

# REST CORS (for /chat, /emotion)
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- SOCKET.IO (CRITICAL FIX) ----------------
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"  # ✅ REQUIRED for polling handshake
)

app = socketio.ASGIApp(
    sio,
    fastapi_app,
    socketio_path="socket.io"
)

# ---------------- MODELS ----------------
class ImagePayload(BaseModel):
    image: str

# ---------------- REST ----------------
@fastapi_app.post("/emotion")
def emotion_api(payload: ImagePayload):
    emotion = detect_emotion_from_image(payload.image)
    emotion = smooth_emotion(emotion)
    return {"emotion": emotion}

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    name: str
    emotion: str
    messages: list[Message]
    context: str | None = None

@fastapi_app.post("/chat")
def chat(payload: ChatRequest):
    # Returns Dict: { "reply": "...", "recommendation": { ... } }
    response_data = generate_llm_reply(payload.name, payload.emotion, payload.messages, payload.context)
    return response_data

# ---------------- SOCKET EVENTS ----------------
import asyncio

@sio.event
async def connect(sid, environ):
    print(f"[INFO] Socket connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"[INFO] Socket disconnected: {sid}")

@sio.event
async def emotion(sid, data):
    if "image" not in data:
        print(f"[WARNING] No image data from {sid}")
        return

    # Run blocking image processing in a separate thread to keep the event loop responsive
    loop = asyncio.get_running_loop()
    try:
        # Check if we need to decode first or if it's raw string
        # The logic is inside detect_emotion, so we just pass the data
        emotion_result = await loop.run_in_executor(None, detect_emotion_from_image, data["image"])
        
        # Smoothing is fast, but better safely handled too or just here
        smoothed_emotion = smooth_emotion(emotion_result)
        
        print(f"[DEBUG] Emotion detected: {smoothed_emotion} (Raw: {emotion_result})")
        await sio.emit("emotion", {"emotion": smoothed_emotion}, to=sid)
    except Exception as e:
        print(f"[ERROR] processing emotion: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
