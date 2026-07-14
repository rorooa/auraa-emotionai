import sys
import io

# Force UTF-8 stdout to avoid Windows charmap errors in the console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import socketio
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
import shutil
import os
import asyncio
from chatbot_llm import generate_llm_reply
from emotion import detect_emotion_from_image
from emotion_smoothing import smooth_emotion
from content_fetcher import ContentFetcher
from personality_engine import generate_companion_message
from trigger_system import TriggerSystem
from pydantic import BaseModel
import datetime

from database import db_firestore
import auth
import reviews
from auth import get_current_user, get_db
from encryption import encrypt_text, decrypt_text

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ---------------- PROACTIVE SYSTEM ----------------
content_fetcher = ContentFetcher()
trigger_system = TriggerSystem()

# ---------------- FASTAPI ----------------
fastapi_app = FastAPI()
os.makedirs("static/avatars", exist_ok=True)
fastapi_app.mount("/static", StaticFiles(directory="static"), name="static")

@fastapi_app.get("/")
@fastapi_app.head("/")
@fastapi_app.get("/health")
def health_check():
    return {"status": "ok", "message": "AURAA Backend is running"}

fastapi_app.include_router(auth.router)
fastapi_app.include_router(reviews.router)

# ---------------- ROOM REST API ----------------




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
    cors_allowed_origins="*"  # Allow all origins for broad device support
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
def chat(payload: ChatRequest, background_tasks: BackgroundTasks, token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    user = get_current_user(token, db)
    
    # Extract latest user message
    user_msg_content = ""
    if payload.messages and len(payload.messages) > 0:
        user_msg_content = payload.messages[-1].content
    
    # Returns Dict: { "reply": "...", "recommendation": { ... } }
    response_data = generate_llm_reply(
        name=payload.name, 
        emotion=payload.emotion, 
        messages=payload.messages, 
        context=payload.context,
        language=user.language_preference,
        personality_mode=getattr(user, "personality_mode", "friend"),
        relationship_memory=getattr(user, "relationship_memory", "")
    )
    
    try:
        # Encrypt and save user message
        if user_msg_content:
            enc_user_msg = encrypt_text(user_msg_content)
            db.collection("chat_history").add({
                "user_id": user.id,
                "role": "user",
                "encrypted_content": enc_user_msg,
                "detected_emotion": payload.emotion,
                "created_at": datetime.datetime.utcnow()
            })
            
        # Encrypt and save assistant message
        ai_reply = response_data.get("reply", "")
        if ai_reply:
            enc_ai_msg = encrypt_text(ai_reply)
            db.collection("chat_history").add({
                "user_id": user.id,
                "role": "system",
                "encrypted_content": enc_ai_msg,
                "detected_emotion": payload.emotion,
                "created_at": datetime.datetime.utcnow()
            })
            
    except Exception as e:
        print("[ERROR] storing chat history in Firestore:", e)
        
    # Asynchronously update the relationship memory graph
    from memory_engine import update_relationship_memory
    background_tasks.add_task(update_relationship_memory, user.id, db)

    return response_data

class ProfileUpdate(BaseModel):
    language: str
    personality_mode: str | None = "friend"

@fastapi_app.get("/profile")
def get_profile(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    user = get_current_user(token, db)
    return {
        "status": "success",
        "username": user.username,
        "language_preference": user.language_preference,
        "personality_mode": user.personality_mode
    }

@fastapi_app.post("/profile/update")
def update_profile(payload: ProfileUpdate, token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    user = get_current_user(token, db)
    db.collection("users").document(user.id).update({
        "language_preference": payload.language,
        "personality_mode": payload.personality_mode
    })
    return {"status": "success", "language": payload.language, "personality_mode": payload.personality_mode}

@fastapi_app.get("/history")
def get_history(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    user = get_current_user(token, db)
    docs = db.collection("chat_history") \
             .where("user_id", "==", user.id) \
             .limit(50).stream()
    
    # Convert to list and sort in-memory to avoid index requirement
    temp_list = []
    for doc in docs:
        h = doc.to_dict()
        temp_list.append({
            "role": h["role"],
            "content": decrypt_text(h["encrypted_content"]),
            "emotion": h.get("detected_emotion", ""),
            "created_at": h["created_at"]
        })
    
    # Sort by created_at descending
    temp_list.sort(key=lambda x: x["created_at"], reverse=True)
    
    # Format for response
    decrypted_history = []
    for item in temp_list:
        decrypted_history.append({
            "role": item["role"],
            "content": item["content"],
            "emotion": item["emotion"],
            "timestamp": item["created_at"].isoformat() if hasattr(item["created_at"], "isoformat") else str(item["created_at"])
        })
    
    # Reverse the formatted list so oldest is first again
    return {"history": list(reversed(decrypted_history))}

# ---------------- SOCKET EVENTS ----------------
import asyncio

@sio.event
async def connect(sid, environ):
    print(f"[INFO] Socket connected: {sid}")
    trigger_system.create_session(sid)
    # Start the proactive trigger loop for this session
    asyncio.ensure_future(_proactive_loop(sid))


@sio.event
async def emotion(sid, data):
    if "image" not in data:
        print(f"[WARNING] No image data from {sid}")
        return

    loop = asyncio.get_running_loop()
    try:
        emotion_result = await loop.run_in_executor(None, detect_emotion_from_image, data["image"])
        smoothed_emotion = smooth_emotion(emotion_result)
        
        # Update trigger system with current emotion and personality
        session = trigger_system.get_session(sid)
        if session:
            session.update_emotion(smoothed_emotion)
            session.personality_mode = data.get("personalityMode", "friend")
        
        await sio.emit("emotion", {"emotion": smoothed_emotion}, to=sid)
    except Exception as e:
        print(f"[ERROR] processing emotion: {e}")

@sio.event
async def connect(sid, environ):
    print(f"[INFO] Socket connected: {sid}")

@sio.event
async def emotion(sid, data):
    if "image" not in data:
        print(f"[WARNING] No image data from {sid}")
        return

    loop = asyncio.get_running_loop()
    try:
        emotion_result = await loop.run_in_executor(None, detect_emotion_from_image, data["image"])
        smoothed_emotion = smooth_emotion(emotion_result)
        await sio.emit("emotion", {"emotion": smoothed_emotion}, to=sid)
    except Exception as e:
        print(f"[ERROR] processing emotion: {e}")

@sio.event
async def disconnect(sid):
    print(f"[INFO] Socket disconnected: {sid}")

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
