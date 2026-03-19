import os
import json
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_llm_reply(name, emotion, messages, context=None, language="English"):
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

    system_prompt = (
        "You are an emotionally intelligent AI companion. "
        f"User Name: {name}. Current Emotion: {emotion}. "
        f"Preferred Language: {language}. "
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
