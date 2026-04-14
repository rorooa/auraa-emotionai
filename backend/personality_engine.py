"""
PersonalityEngine — Groq-powered natural message generator.
Creates human-like companion messages for sharing content,
using emotion context and conversational history.
"""

import os
import json
import random
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# --------------- STATIC FALLBACKS ---------------
FALLBACK_MESSAGES = {
    "funny": [
        "Okay I shouldn't be laughing this hard 😭 but you HAVE to see this",
        "Bro this is actually hilarious, check this out 😂",
        "I can't stop watching this lmaooo",
        "This just made my whole day, you need to see it 💀",
        "I'm literally crying laughing rn, watch this",
        "Okay this is too good not to share 😭😂",
    ],
    "news": [
        "This is kinda serious… everyone's talking about this right now",
        "Yo, have you seen this? It's blowing up everywhere",
        "Something big just happened, thought you should know",
        "This is wild… just read the headline",
        "Everyone's going crazy about this rn 👀",
    ],
    "educational": [
        "This is actually pretty useful, thought you might like it 👀",
        "Okay this is lowkey fascinating, check it out",
        "Found this and immediately thought of sharing it with you",
        "This might actually be helpful for you, take a look",
        "You'd probably find this interesting tbh",
    ],
    "comfort": [
        "Hey… I know you're not feeling great. This is kinda light, maybe it'll help a little 🙂",
        "I found something that might cheer you up a bit 💙",
        "Not gonna lie, this made me smile… hope it does the same for you",
        "Take a break and watch this, you deserve it 🫂",
    ],
}

# --------------- GROQ PERSONALITY ---------------
def generate_companion_message(
    emotion: str,
    content_type: str,
    content_title: str,
    recent_history: list[dict] | None = None,
    personality_mode: str = "friend"
) -> str:
    """
    Generate a short, natural, emotionally appropriate message
    to share content with the user. Uses Groq LLM with fallback.
    """
    PERSONALITIES = {
        "friend": "You are a close, friendly, and casual best friend. Your style is casual, slightly Gen-Z, emotionally aware, and never robotic.",
        "therapist": "You are a professional, highly empathetic, and grounding emotional wellness guide.",
        "sassy": "You are witty, sassy, funny, and slightly sarcastic but supportive.",
        "philosopher": "You are deep, philosophical, and reflective, providing profound insights on feelings.",
        "mentor": "You are a direct, motivating, and encouraging mentor pushing the user to grow.",
        "guardian": "You are a caring but strict parental figure. If the user is procrastinating, kindly but firmly tell them to focus. Validate their feelings but enforce boundaries. Encourage healthy habits.",
        "room_therapist": "You are a professional AI therapist in a private 1-on-1 session. Use CBT and mindfulness techniques. Ask open-ended reflective questions. Be empathetic, non-judgmental, and therapeutic.",
        "room_bridge": "You are an empathetic AI mediator bridging two strangers in an emotional healing session. Highlight emotional commonalities between them. Ask connecting questions. Help them feel less alone by showing their feelings are shared.",
        "room_moderator": "You are a warm, group therapy AI moderator. Guide the discussion, summarize emotional trends, ensure everyone feels heard, and gently redirect toxic behavior. Keep the group focused on healing.",
    }
    persona = PERSONALITIES.get(personality_mode.lower(), PERSONALITIES["friend"])

    # Build the system prompt
    system_prompt = (
        f"{persona} "
        "You are about to share a piece of content with the user.\n\n"
        f"User's current emotion: {emotion}\n"
        f"Content type: {content_type}\n"
        f"Content title: {content_title}\n\n"
        "Generate a SHORT message (1-2 sentences MAX) to naturally share this content. "
        "Make it feel human, casual, and engaging. "
        "Use emojis sparingly but naturally. "
        "NEVER say 'I found this content' or 'Here is a resource'. "
        "Talk like a real friend would text you — excited, empathetic, or curious. "
        "If the user seems sad or upset, be gentle and warm, not overly cheerful.\n\n"
        "Return ONLY the message text, nothing else."
    )

    # Build context from recent history
    context_messages = []
    if recent_history:
        # Use last 4 messages for context
        for msg in recent_history[-4:]:
            role = "assistant" if msg.get("role") in ("ai", "system", "assistant") else "user"
            context_messages.append({"role": role, "content": msg.get("content", msg.get("text", ""))})

    try:
        messages = [{"role": "system", "content": system_prompt}]
        if context_messages:
            messages.extend(context_messages)
        messages.append({
            "role": "user",
            "content": f"Share this with me naturally: \"{content_title}\" (type: {content_type})"
        })

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            max_tokens=80,
            temperature=0.9,  # High for variety
        )

        result = response.choices[0].message.content.strip()

        # Clean up: remove quotes if the model wrapped it
        if result.startswith('"') and result.endswith('"'):
            result = result[1:-1]

        return result

    except Exception as e:
        print(f"[PersonalityEngine] Groq error: {e}, using fallback.")
        return _get_fallback(emotion, content_type)


def _get_fallback(emotion: str, content_type: str) -> str:
    """Pick a random fallback message based on emotion and content type."""
    emotion = emotion.lower()

    # If user is sad/fear, use comfort messages
    if emotion in ("sad", "fear") and content_type == "funny":
        pool = FALLBACK_MESSAGES.get("comfort", []) + FALLBACK_MESSAGES.get("funny", [])
    else:
        pool = FALLBACK_MESSAGES.get(content_type, FALLBACK_MESSAGES["funny"])

    return random.choice(pool)
