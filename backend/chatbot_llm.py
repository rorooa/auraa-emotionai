import os
import json
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_llm_reply(name, emotion, messages, context=None):
    PLAYLISTS = {
        "sad": "https://open.spotify.com/playlist/37i9dQZF1DX3rxVfibe1L0?si=xaY-KLI3TjKwi1Tu4lp2VQ",
        "angry": "https://open.spotify.com/playlist/37i9dQZF1DWU0ScTcjJBdj?si=bnBXTa-WTpWTwN1SDgowBA",
        "happy": "https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC?si=PVuKGCQISdmSOTK4wYemFA",
        "default": "https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC?si=PVuKGCQISdmSOTK4wYemFA",
        "calm": "https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC?si=PVuKGCQISdmSOTK4wYemFA"
    }

    system_prompt = (
        "You are an emotionally intelligent AI companion. "
        f"User Name: {name}. Current Emotion: {emotion}. "
        f"{context if context else ''}"
        "Respond naturally and empathetically to the conversation history. "
        "Logic for recommendations:"
        "1. If the user is SAD, ANGRY, or HAPPY, ask gently: 'Would you like some music?'"
        "2. If they say YES (or imply agreement), return the specific playlist link in 'recommendation.query' and set 'recommendation.type' to 'song'."
        "   - SAD -> " + PLAYLISTS['sad'] + ""
        "   - ANGRY -> " + PLAYLISTS['angry'] + ""
        "   - HAPPY -> " + PLAYLISTS['happy'] + ""
        "   - ALL OTHERS -> " + PLAYLISTS['default'] + ""
        "Return ONLY valid JSON with this structure: "
        "{ \"reply\": \"spoken response\", \"recommendation\": { \"type\": \"song\"|\"video\"|\"game\"|\"none\", \"query\": \"URL_OR_SEARCH_TERM\" } }"
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
