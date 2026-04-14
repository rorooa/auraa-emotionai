import os
import json
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_llm_reply(name, emotion, messages, context=None, language="English", personality_mode="friend", relationship_memory=""):
    PLAYLISTS = {
        "sad": "https://open.spotify.com/playlist/37i9dQZF1DX3rxVfibe1L0?si=xaY-KLI3TjKwi1Tu4lp2VQ",
        "angry": "https://open.spotify.com/playlist/37i9dQZF1DWU0ScTcjJBdj?si=bnBXTa-WTpWTwN1SDgowBA",
        "happy": "https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC?si=PVuKGCQISdmSOTK4wYemFA",
        "default": "https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC?si=PVuKGCQISdmSOTK4wYemFA"
    }
    
    # Generic search queries for streaming platforms
    MOVIES = {
        "sad": "uplifting comedy or feel-good movie",
        "angry": "calm documentaries or action thrillers to vent",
        "happy": "upbeat adventure or fantasy",
        "default": "popular trending movie"
    }

    music = PLAYLISTS.get(emotion.lower(), PLAYLISTS['default'])
    movie = MOVIES.get(emotion.lower(), MOVIES['default'])

    # Personality constraints
    PERSONALITIES = {
        "friend": "You are a close, friendly, and casual best friend. Use a conversational, slightly Gen-Z tone.",
        "therapist": "You are a professional, highly empathetic, and grounding emotional wellness guide.",
        "sassy": "You are witty, sassy, funny, and slightly sarcastic but supportive.",
        "philosopher": "You are deep, philosophical, and reflective, providing profound insights on feelings.",
        "mentor": "You are a direct, motivating, and encouraging mentor pushing the user to grow.",
        "guardian": "You are a caring but strict parental figure. Validate feelings but enforce healthy boundaries and habits."
    }
    persona = PERSONALITIES.get(personality_mode.lower(), PERSONALITIES["friend"])

    system_prompt = (
        f"{persona} "
        f"User Name: {name}. Current Emotion: {emotion}. "
        f"Preferred Language: {language}. "
        f"Relationship Context: {relationship_memory} "
        "CRITICAL: ALL SPOKEN REPLIES MUST BE IN THE PREFERRED LANGUAGE. "
        f"{context if context else ''}"
        "Respond naturally and empathetically to the conversation history. "
        f"CRITICAL: If the user greets you, respond with 'Hi {name}!' or 'Hello {name}!' instead of generic phrases like 'Hi back'. "
        "Logic for recommendations:\n"
        "1. If the user is SAD, ANGRY, or HAPPY (triggered), recommend BOTH a song and a movie.\n"
        "2. To do this, return the exact JSON structure below, filling 'reply' with your message.\n"
        f"   - For music URL, use: {music}\n"
        f"   - For movie_query, use: {movie}\n"
        "Return ONLY valid JSON with this exact structure: \n"
        "{ \"reply\": \"spoken response in preferred language\", \"recommendation\": { \"type\": \"bundle\", \"music_url\": \"...\", \"movie_query\": \"...\" } }\n"
        "keep the reply short (under 2 sentences) and conversational."
    )

    # Convert Pydantic models to dicts if necessary, or ensure they are dicts
    # Assuming 'messages' is a list of objects with 'role' and 'content'
    history = [{"role": m.role, "content": m.content} for m in messages]

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                *history
            ],
            max_tokens=200,
            temperature=0.7,
            response_format={"type": "json_object"} 
        )
        
        content = response.choices[0].message.content
        return json.loads(content)
        
    except Exception as e:
        print("LLM Error:", e)
        return {
            "reply": "I'm having a bit of trouble thinking right now, but I'm here for you.",
            "recommendation": {"type": "none", "query": ""}
        }


def generate_room_interjection(room_type: str, participants_emotions: dict, recent_messages: list, reason: str = "") -> str:
    """
    Generate an AI interjection for therapy rooms.
    - solo: CBT-style therapeutic response
    - sync: Bridge message connecting two strangers
    - group: Moderation and emotional trend summary
    """
    ROOM_PERSONAS = {
        "solo": (
            "You are a master clinical psychologist and AI therapist guiding a private 1-on-1 session. "
            "You possess profound empathy and the directness of a top-tier CBT therapist. "
            "Your goal is not just to comfort, but to gently challenge, validate, and facilitate deep emotional breakthroughs. "
            "Ask incredibly insightful, open-ended questions that uncover core feelings. "
            "Be deeply human, highly conversational, and deeply attuned to subtext."
        ),
        "sync": (
            "You are an empathetic AI mediator bridging two strangers in an emotional healing session. "
            "Your job is to highlight emotional commonalities between them, ask connecting questions, "
            "and help them feel less alone. Reference their shared or contrasting emotions directly. "
            "Example: 'I can see you're both feeling anxious right now. That's actually a powerful thing to share.'"
        ),
        "group": (
            "You are a warm group therapy AI moderator. Summarize the emotional energy in the room, "
            "ensure everyone feels heard, and gently guide the discussion toward healing. "
            "Example: 'I notice some tension in the room. Let's take a moment to breathe together.'"
        ),
    }

    persona = ROOM_PERSONAS.get(room_type, ROOM_PERSONAS["solo"])

    # Build emotion context
    emotion_context = ", ".join([f"{name} is feeling {emo}" for name, emo in participants_emotions.items()])

    # Build recent chat context
    chat_context = ""
    for msg in recent_messages[-6:]:
        role_label = msg.get("sender", "User")
        chat_context += f"{role_label}: {msg.get('content', '')}\n"

    length_constraint = (
        "Generate a thoughtful, engaging therapeutic response (2-4 sentences). "
        "Validate their specific feelings first, then ask a brilliant guiding question." 
        if room_type == "solo" else 
        "Generate a SHORT, natural interjection (1-2 sentences MAX). "
    )

    system_prompt = (
        f"{persona}\n\n"
        f"Current emotional states: {emotion_context}\n"
        f"Trigger reason: {reason}\n\n"
        f"Recent conversation:\n{chat_context}\n\n"
        f"{length_constraint}\n"
        "Be emotionally attuned. Use emojis sparingly. "
        "Do NOT say 'As an AI' or 'I notice from my data' or 'It sounds like'. "
        "Speak smoothly and confidently like a caring human therapist would. "
        "Return ONLY the message text."
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "system", "content": system_prompt}],
            max_tokens=250 if room_type == "solo" else 100,
            temperature=0.8,
        )
        result = response.choices[0].message.content.strip()
        if result.startswith('"') and result.endswith('"'):
            result = result[1:-1]
        return result
    except Exception as e:
        print(f"[ROOM AI] Interjection error: {e}")
        fallbacks = {
            "solo": "How are you feeling about what you just shared? Take your time.",
            "sync": "You're both here for a reason. That takes courage. 💙",
            "group": "Let's take a collective breath. You're all in a safe space here.",
        }
        return fallbacks.get(room_type, "I'm here with you. Take your time.")
