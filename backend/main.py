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
import payments
from auth import get_current_user, get_db
from encryption import encrypt_text, decrypt_text
from room_manager import RoomManager
from chatbot_llm import generate_room_interjection

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ---------------- PROACTIVE SYSTEM ----------------
content_fetcher = ContentFetcher()
trigger_system = TriggerSystem()
room_manager = RoomManager()

# ---------------- FASTAPI ----------------
fastapi_app = FastAPI()
os.makedirs("static/avatars", exist_ok=True)
fastapi_app.mount("/static", StaticFiles(directory="static"), name="static")

fastapi_app.include_router(auth.router)
fastapi_app.include_router(reviews.router)
fastapi_app.include_router(payments.router)

# ---------------- GAMIFICATION (STREAKS & GAMES) ----------------

class GameLog(BaseModel):
    game_mode: str
    agility_score: str | None = None
    emotions_hit: str | None = None
    verdict: str | None = None

@fastapi_app.post("/api/user/streak/check")
def check_and_update_streak(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    user = get_current_user(token, db)
    now = datetime.datetime.utcnow()
    today = now.date()
    
    # Defaults if missing
    last_date_str = getattr(user, 'last_interaction_date', None)
    current_streak = getattr(user, 'current_streak', 0)
    max_streak = getattr(user, 'max_streak', 0)
    
    if last_date_str:
        try:
            last_date = datetime.datetime.fromisoformat(last_date_str).date()
            delta_days = (today - last_date).days
            
            if delta_days == 1:
                # Logged in consecutive day
                current_streak += 1
            elif delta_days > 1:
                # Streak broken
                current_streak = 1
        except Exception:
            current_streak = 1
    else:
        # First interaction
        current_streak = 1

    if current_streak > max_streak:
        max_streak = current_streak

    # Update Firestore
    db.collection("users").document(user.id).update({
        "current_streak": current_streak,
        "max_streak": max_streak,
        "last_interaction_date": now.isoformat()
    })
    
    return {
        "current_streak": current_streak,
        "max_streak": max_streak,
        "message": "Streak checked and updated."
    }

@fastapi_app.post("/api/games/log")
def log_game_history(log: GameLog, token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    user = get_current_user(token, db)
    
    game_data = {
        "user_id": user.id,
        "username": user.username,
        "game_mode": log.game_mode,
        "agility_score": log.agility_score,
        "emotions_hit": log.emotions_hit,
        "verdict": log.verdict,
        "played_at": datetime.datetime.utcnow().isoformat()
    }
    
    db.collection("game_history").add(game_data)
    
    # Increment total games played in user doc
    total_games = getattr(user, 'total_games_played', 0) + 1
    db.collection("users").document(user.id).update({"total_games_played": total_games})
    
    return {"status": "success", "message": "Game logged successfully"}


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
        "personality_mode": user.personality_mode,
        "subscription_tier": getattr(user, "subscription_tier", "pro"),
        "custom_avatar_url": getattr(user, "custom_avatar_url", None)
    }

class CustomAvatarUpdate(BaseModel):
    glb_url: str

@fastapi_app.post("/profile/custom_avatar")
def update_custom_avatar(payload: CustomAvatarUpdate, token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    user = get_current_user(token, db)
    db.collection("users").document(user.id).update({
        "custom_avatar_url": payload.glb_url
    })
    return {"status": "success", "custom_avatar_url": payload.glb_url}

@fastapi_app.post("/profile/upload_avatar")
def upload_avatar(file: UploadFile = File(...), token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    user = get_current_user(token, db)
    if not file.filename.endswith(".glb"):
        raise HTTPException(status_code=400, detail="Only .glb files are allowed")
    
    file_path = f"static/avatars/{user.id}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    local_url = f"http://localhost:8000/{file_path}"
    
    db.collection("users").document(user.id).update({
        "custom_avatar_url": local_url
    })
    return {"status": "success", "custom_avatar_url": local_url}

@fastapi_app.post("/profile/update")
def update_profile(payload: ProfileUpdate, token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    user = get_current_user(token, db)
    db.collection("users").document(user.id).update({
        "language_preference": payload.language,
        "personality_mode": payload.personality_mode
    })
    return {"status": "success", "language": payload.language, "personality_mode": payload.personality_mode}

@fastapi_app.post("/profile/upgrade_test")
def upgrade_test_tier(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    user = get_current_user(token, db)
    new_tier = "pro" if user.subscription_tier == "free" else "free"
    db.collection("users").document(user.id).update({"subscription_tier": new_tier})
    return {"status": "success", "new_tier": new_tier}

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

@fastapi_app.get("/history/insights")
def get_history_insights(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    user = get_current_user(token, db)
    
    # Gate feature for Pro/Premium users
    if user.subscription_tier == "free":
        raise HTTPException(status_code=403, detail="Pro subscription required for Neural Insights")

    docs = db.collection("chat_history") \
             .where("user_id", "==", user.id) \
             .order_by("created_at", direction="DESCENDING") \
             .limit(20).stream()
    
    history_data = []
    for doc in docs:
        h = doc.to_dict()
        history_data.append({
            "emotion": h.get("detected_emotion", "neutral"),
            "content": decrypt_text(h["encrypted_content"]) if "encrypted_content" in h else "",
            "role": h.get("role", "user")
        })

    if not history_data:
        return {"insight": "Start chatting to generate your first psychological insight report.", "habit": "Take 5 deep breaths today."}

    context_str = ""
    for item in history_data:
        if item["role"] == "user":
            context_str += f"- User felt [{item['emotion']}] and said: {item['content']}\n"

    from groq import Groq
    import os
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    prompt = (
        "You are an analytical AI psychologist looking at a user's recent mood diary. "
        "Analyze the following recent journal entries and emotional states. "
        "Provide a short, professional, and empathetic 3-sentence summary of their emotional trends, "
        "along with 1 actionable micro-habit they can adopt today. "
        "Return EXACTLY a JSON object with 'insight' (the 3 sentence summary) and 'habit' (the micro-habit).\n"
        f"Data:\n{context_str}"
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=250,
            temperature=0.5,
            response_format={"type": "json_object"}
        )
        import json
        content = json.loads(response.choices[0].message.content)
        return content
    except Exception as e:
        print("[ERROR] Insight Generation Failed:", e)
        return {
            "insight": "Your neural emotional patterns are currently too complex to analyze. Please try again later.", 
            "habit": "Focus on grounding exercises."
        }

# ---------------- EMOTION MIRROR GAME ----------------

class EmotionSnapshot(BaseModel):
    emotion: str
    timestamp: float

class EmotionMirrorRequest(BaseModel):
    question: str
    user_answer: str  # "yes" or "no"
    emotions_detected: list[EmotionSnapshot]
    reaction_delay_ms: int
    game_mode: str  # "relationship" | "deep_mind" | "roast"

from fastapi.security import HTTPBearer
auth_scheme = HTTPBearer(auto_error=False)

@fastapi_app.post("/emotion-mirror/verdict")
def emotion_mirror_verdict(payload: EmotionMirrorRequest, token_obj: any = Depends(auth_scheme), db=Depends(get_db)):
    token = token_obj.credentials if token_obj else None
    if token:
        try:
            user = get_current_user(token, db)
        except Exception:
            from types import SimpleNamespace
            user = SimpleNamespace(username="Guest", id="guest")
    else:
        from types import SimpleNamespace
        user = SimpleNamespace(username="Guest", id="guest")
    
    # Analyze emotion distribution
    emotion_counts: dict[str, int] = {}
    for snap in payload.emotions_detected:
        emo = snap.emotion.lower()
        emotion_counts[emo] = emotion_counts.get(emo, 0) + 1
    
    total = max(len(payload.emotions_detected), 1)
    emotion_percentages = {emo: round((count / total) * 100) for emo, count in emotion_counts.items()}
    
    # Sort by percentage descending
    sorted_emotions = sorted(emotion_percentages.items(), key=lambda x: x[1], reverse=True)
    dominant_emotion = sorted_emotions[0][0] if sorted_emotions else "neutral"
    
    # Classify reaction speed
    delay = payload.reaction_delay_ms
    if delay < 1500:
        reaction_label = "instant"
    elif delay < 3000:
        reaction_label = "quick"
    elif delay < 5000:
        reaction_label = "hesitant"
    else:
        reaction_label = "very hesitant"
    
    # Build emotion summary string
    emotion_summary = ", ".join([f"{emo} {pct}%" for emo, pct in sorted_emotions[:4]])
    
    # Determine if answer matches emotion (basic heuristic)
    positive_emotions = {"happy", "surprise", "neutral"}
    negative_emotions = {"sad", "angry", "fear", "disgust"}
    answer_positive = payload.user_answer.lower() == "yes"
    emotion_positive = dominant_emotion in positive_emotions
    is_consistent = (answer_positive and emotion_positive) or (not answer_positive and not emotion_positive)
    
    # Mode-specific tone
    TONE_MAP = {
        "relationship": "witty and slightly teasing about love/relationships, like a close friend who sees through you",
        "deep_mind": "thoughtful and insightful, like a wise friend who gently reveals your truth",
        "roast": "playfully savage and hilariously brutal, like a comedian roasting their best friend (never cruel)"
    }
    tone = TONE_MAP.get(payload.game_mode, TONE_MAP["deep_mind"])
    
    prompt = (
        f"You are AURAA's Emotion Mirror — an emotionally intelligent AI that analyzes facial expressions to reveal hidden truths. "
        f"Your tone is: {tone}. Speak in a Gen-Z friendly, highly relatable way.\n\n"
        f"CONTEXT:\n"
        f"- Question asked: \"{payload.question}\"\n"
        f"- User answered: {payload.user_answer.upper()}\n"
        f"- Detected emotions while answering: {emotion_summary}\n"
        f"- Dominant emotion: {dominant_emotion}\n"
        f"- Reaction time: {delay}ms ({reaction_label})\n"
        f"- Answer-Emotion consistency: {'CONSISTENT' if is_consistent else 'INCONSISTENT — their face tells a different story'}\n\n"
        f"Generate a JSON object with EXACTLY these fields:\n"
        f"1. \"verdict\": A short, punchy 1-2 sentence verdict (max 30 words) that compares what they said vs what their face revealed. "
        f"Make it feel personal, slightly dramatic, and extremely shareable. Use 1 emoji max.\n"
        f"2. \"truth_score\": An integer 0-100 representing emotional honesty (100 = completely truthful)\n"
        f"3. \"vibe_tag\": A single hashtag-style label like #InDenial, #HonestSoul, #FakeItTillYouMakeIt, #EmotionallyExposed\n\n"
        f"Return ONLY valid JSON. No extra text."
    )
    
    from groq import Groq
    import json as json_module
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.85,
            response_format={"type": "json_object"}
        )
        verdict_data = json_module.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"[ERROR] Emotion Mirror verdict generation failed: {e}")
        verdict_data = {
            "verdict": "Your emotions are playing 4D chess and I can't keep up 🧠",
            "truth_score": 50,
            "vibe_tag": "#EmotionallyComplex"
        }
    
    result = {
        "question": payload.question,
        "user_answer": payload.user_answer,
        "emotions": dict(sorted_emotions),
        "dominant_emotion": dominant_emotion,
        "reaction_delay_ms": delay,
        "reaction_label": reaction_label,
        "is_consistent": is_consistent,
        "verdict": verdict_data.get("verdict", "Could not read your soul today."),
        "truth_score": verdict_data.get("truth_score", 50),
        "vibe_tag": verdict_data.get("vibe_tag", "#Mystery"),
        "game_mode": payload.game_mode,
        "username": user.username,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    
    return result

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
async def user_activity(sid, data):
    """Called when user sends a message or interacts."""
    session = trigger_system.get_session(sid)
    if session:
        session.record_activity()

@sio.event
async def user_typing(sid, data):
    """Called when user starts/stops typing."""
    session = trigger_system.get_session(sid)
    if session:
        session.update_typing(data.get("typing", False))

@sio.event
async def speaking_state(sid, data):
    """Called when avatar starts/stops speaking."""
    session = trigger_system.get_session(sid)
    if session:
        session.update_speaking(data.get("speaking", False))

@sio.event
async def trigger_proactive(sid, data):
    """Manually trigger a proactive content push for testing."""
    session = trigger_system.get_session(sid)
    if not session:
        return

    # Fetch content appropriate for current emotion
    loop = asyncio.get_running_loop()
    content = await loop.run_in_executor(
        None, content_fetcher.get_content_for_emotion, session.current_emotion
    )
    
    if content:
        # Generate a human-like message via Groq
        message = await loop.run_in_executor(
            None,
            generate_companion_message,
            session.current_emotion,
            content["type"],
            content["title"],
            None,
            getattr(session, "personality_mode", "friend")
        )
        
        # Push to client
        await sio.emit("proactive_content", {
            "message": message,
            "content": content,
            "reason": "manual_trigger",
        }, to=sid)
        
        session.record_push()
        print(f"[PROACTIVE] Manually triggered for {sid} → {content['type']}")

# ---------------- PROACTIVE TRIGGER LOOP ----------------
async def _proactive_loop(sid: str):
    """
    Background loop that checks trigger conditions every 30 seconds.
    Pushes proactive content to the client via Socket.IO when triggered.
    """
    await asyncio.sleep(10)  # Initial settling period
    
    while sid in trigger_system.sessions:
        try:
            should_fire, reason = trigger_system.should_trigger(sid)
            
            if should_fire:
                session = trigger_system.get_session(sid)
                if not session:
                    break
                
                # Fetch content appropriate for user's emotion
                loop = asyncio.get_running_loop()
                content = await loop.run_in_executor(
                    None, content_fetcher.get_content_for_emotion, session.current_emotion
                )
                
                if content:
                    # Generate a human-like message via Groq
                    message = await loop.run_in_executor(
                        None,
                        generate_companion_message,
                        session.current_emotion,
                        content["type"],
                        content["title"],
                        None,  # No chat history context for proactive
                        getattr(session, "personality_mode", "friend")
                    )
                    
                    # Push to client
                    await sio.emit("proactive_content", {
                        "message": message,
                        "content": content,
                        "reason": reason,
                    }, to=sid)
                    
                    session.record_push()
                    print(f"[PROACTIVE] Pushed to {sid}: {reason} → {content['type']}")
        
        except Exception as e:
            print(f"[PROACTIVE] Error in loop for {sid}: {e}")
        
        await asyncio.sleep(30)  # Check every 30 seconds

# ---------------- ROOMS: REST ENDPOINTS ----------------

class CreateRoomRequest(BaseModel):
    room_type: str  # "solo" | "sync" | "group"
    creator_name: str = "Anonymous"

@fastapi_app.post("/rooms/create")
def create_room(payload: CreateRoomRequest):
    if payload.room_type not in ("solo", "sync", "group"):
        raise HTTPException(status_code=400, detail="Invalid room type. Must be solo, sync, or group.")
    room = room_manager.create_room(payload.room_type, payload.creator_name)
    return room.to_dict()

@fastapi_app.get("/rooms")
def list_rooms():
    return {"rooms": room_manager.list_public_rooms()}

@fastapi_app.get("/rooms/{room_id}")
def get_room(room_id: str):
    room = room_manager.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room.to_dict()

# ---------------- ROOMS: SOCKET.IO EVENTS ----------------

@sio.event
async def create_room(sid, data):
    """Create a new therapy room."""
    room_type = data.get("room_type", "solo")
    creator_name = data.get("name", "Anonymous")
    if room_type not in ("solo", "sync", "group"):
        await sio.emit("room_error", {"error": "Invalid room type"}, to=sid)
        return
    room = room_manager.create_room(room_type, creator_name)
    room.add_participant(sid, creator_name)
    room_manager.sid_to_room[sid] = room.room_id
    await sio.enter_room(sid, room.room_id)
    await sio.emit("room_created", room.to_dict(), to=sid)
    # Start AI moderation loop for this room
    asyncio.ensure_future(_room_ai_loop(room.room_id))
    print(f"[ROOMS] {creator_name} created & joined {room_type} room: {room.room_id}")

@sio.event
async def join_room(sid, data):
    """Join an existing therapy room."""
    room_id = data.get("room_id", "").strip().upper()
    name = data.get("name", "Anonymous")
    room = room_manager.join_room(room_id, sid, name)
    if not room:
        await sio.emit("room_error", {"error": "Room not found or full"}, to=sid)
        return
    await sio.enter_room(sid, room_id)
    # Broadcast updated participant list to the entire room
    await sio.emit("room_update", room.to_dict(), room=room_id)
    # Send welcome to the new joiner
    await sio.emit("room_joined", room.to_dict(), to=sid)
    print(f"[ROOMS] {name} joined room {room_id}")

@sio.event
async def leave_room(sid, data):
    """Leave a therapy room."""
    room = room_manager.leave_room(sid)
    if room:
        await sio.leave_room(sid, room.room_id)
        await sio.emit("room_update", room.to_dict(), room=room.room_id)
        await sio.emit("room_left", {"room_id": room.room_id}, to=sid)

@sio.event
async def room_message(sid, data):
    """Send a message to the therapy room."""
    room = room_manager.get_user_room(sid)
    if not room:
        return
    sender = data.get("sender", "Anonymous")
    content = data.get("content", "")
    emotion = data.get("emotion", "neutral")
    if not content.strip():
        return
    room.add_message(sender, content, role="user", emotion=emotion, sender_sid=sid)
    # Broadcast to all room members
    await sio.emit("room_message", {
        "sender": sender,
        "sender_sid": sid,
        "content": content,
        "role": "user",
        "emotion": emotion,
        "timestamp": room.message_history[-1]["timestamp"],
    }, room=room.room_id)
    
    # AI Immediate Interjection Logic
    if room.room_type == "solo":
        # Always reply in solo therapy
        asyncio.ensure_future(_trigger_immediate_ai(room.room_id, reason="user_msg"))
    elif room.room_type in ("sync", "group"):
        # Interject predictably every 3 user messages for active moderation
        user_msg_count = len([m for m in room.message_history if m["role"] == "user"])
        if user_msg_count > 0 and user_msg_count % 3 == 0:
            asyncio.ensure_future(_trigger_immediate_ai(room.room_id, reason="active_moderation"))

@sio.event
async def room_emotion(sid, data):
    """Update a user's emotion in their room and broadcast it."""
    emotion = data.get("emotion", "neutral")
    room = room_manager.update_emotion(sid, emotion)
    if not room:
        return
    # Broadcast all participants' emotions to the room
    participants_data = [p.to_dict() for p in room.participants.values()]
    emit_data = {
        "participants": participants_data,
        "room_aura": room.get_room_aura(),
    }
    if room.room_type == "sync":
        emit_data["sync_meter"] = room.calculate_sync_meter()
    await sio.emit("room_emotions", emit_data, room=room.room_id)

@sio.event
async def quick_match(sid, data):
    """Queue for Quick Match (Aura Sync matchmaking)."""
    name = data.get("name", "Anonymous")
    emotion = data.get("emotion", "neutral")
    
    # Add to queue
    room_manager.queue_for_match(sid, name, emotion)
    await sio.emit("match_queued", {"status": "waiting", "message": "Looking for a compatible soul..."}, to=sid)
    
    # Try to find a match
    match_result = room_manager.find_match(sid)
    if match_result:
        matched_sid, matched_info = match_result
        room = room_manager.create_match_room(sid, matched_sid)
        if room:
            await sio.enter_room(sid, room.room_id)
            await sio.enter_room(matched_sid, room.room_id)
            await sio.emit("match_found", room.to_dict(), to=sid)
            await sio.emit("match_found", room.to_dict(), to=matched_sid)
            # Start AI moderation
            asyncio.ensure_future(_room_ai_loop(room.room_id))
            print(f"[MATCH] Matched: {name} <-> {matched_info['name']} in room {room.room_id}")

@sio.event
async def cancel_match(sid, data):
    """Cancel Quick Match queue."""
    room_manager.dequeue(sid)
    await sio.emit("match_cancelled", {"status": "cancelled"}, to=sid)

# Clean up rooms on disconnect
@sio.event
async def disconnect(sid):
    print(f"[INFO] Socket disconnected: {sid}")
    trigger_system.remove_session(sid)
    # Clean up matchmaking queue
    room_manager.dequeue(sid)
    # Clean up rooms
    room = room_manager.leave_room(sid)
    if room:
        await sio.emit("room_update", room.to_dict(), room=room.room_id)

# ---------------- ROOM AI MODERATION LOOP ----------------
async def _room_ai_loop(room_id: str):
    """Background loop that checks if the AI should interject in a therapy room."""
    await asyncio.sleep(5)  # Initial settling
    
    while room_id in room_manager.rooms:
        try:
            room = room_manager.get_room(room_id)
            if not room or room.is_empty():
                break

            should_fire, reason = room.should_ai_interject()
            
            if should_fire:
                # Generate AI interjection
                loop = asyncio.get_running_loop()
                interjection = await loop.run_in_executor(
                    None,
                    generate_room_interjection,
                    room.room_type,
                    room.get_participants_emotions(),
                    room.get_recent_messages(6),
                    reason
                )
                
                if interjection:
                    room.add_message("AURAA", interjection, role="ai", emotion="neutral")
                    room.record_ai_interjection()
                    
                    await sio.emit("room_message", {
                        "sender": "AURAA",
                        "content": interjection,
                        "role": "ai",
                        "emotion": "neutral",
                        "timestamp": room.message_history[-1]["timestamp"],
                    }, room=room_id)
                    
                    print(f"[ROOM AI] Interjection in {room_id}: {reason}")
        
        except Exception as e:
            print(f"[ROOM AI] Error in loop for {room_id}: {e}")
        
        await asyncio.sleep(15)  # Check every 15 seconds

async def _trigger_immediate_ai(room_id: str, reason: str):
    """Fast-path AI interjection triggered directly by a user message."""
    await asyncio.sleep(2)  # Simulate typing delay
    try:
        room = room_manager.get_room(room_id)
        if not room or room.is_empty():
            return
            
        loop = asyncio.get_running_loop()
        interjection = await loop.run_in_executor(
            None,
            generate_room_interjection,
            room.room_type,
            room.get_participants_emotions(),
            room.get_recent_messages(6),
            reason
        )
        
        if interjection:
            room.add_message("AURAA", interjection, role="ai", emotion="neutral", sender_sid="ai")
            room.record_ai_interjection()
            
            await sio.emit("room_message", {
                "sender": "AURAA",
                "sender_sid": "ai",
                "content": interjection,
                "role": "ai",
                "emotion": "neutral",
                "timestamp": room.message_history[-1]["timestamp"],
            }, room=room_id)
            
            print(f"[ROOM AI] Immediate Interjection in {room_id}: {reason}")
    except Exception as e:
        print(f"[ROOM AI] Immediate interjection error: {e}")

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
