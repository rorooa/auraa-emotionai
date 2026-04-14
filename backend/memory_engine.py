import os
from groq import Groq
from encryption import decrypt_text

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def update_relationship_memory(user_id: str, db):
    """
    Synthesize raw chat history into a dense, long-term relationship context.
    Called asynchronously to prevent blocking the main chat thread.
    """
    try:
        # 1. Fetch the user's current memory
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        if not user_doc.exists:
            return
            
        current_memory = user_doc.to_dict().get("relationship_memory", "No memory established yet.")

        # 2. Fetch the last 20 messages
        docs = db.collection("chat_history") \
                 .where("user_id", "==", user_id) \
                 .order_by("created_at", direction="DESCENDING") \
                 .limit(20).stream()
                 
        history_data = []
        for doc in docs:
            h = doc.to_dict()
            history_data.append({
                "role": h.get("role", "user"),
                "content": decrypt_text(h["encrypted_content"]) if "encrypted_content" in h else ""
            })
            
        if not history_data:
            return
            
        # Reverse to chronological order
        history_data.reverse()

        # Build prompt
        context_str = ""
        for item in history_data:
            context_str += f"{item['role'].capitalize()}: {item['content']}\n"

        system_prompt = (
            "You are the internal memory synthesizer for an AI companion. "
            "Your job is to update the long-term relationship memory based on the latest chat history. "
            "Focus on extracting: User's name/preferences, major life events/stressors, inside jokes, "
            "the current emotional trajectory, and how the AI should adapt its tone. "
            "Write it as a dense, 3-4 sentence summary that will be injected into future prompts.\n\n"
            f"CURRENT MEMORY:\n{current_memory}\n\n"
            f"NEW CHAT LOGS:\n{context_str}\n\n"
            "Return ONLY the updated memory paragraph. No pleasantries, no markdown."
        )

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "system", "content": system_prompt}],
            max_tokens=150,
            temperature=0.3
        )
        
        new_memory = response.choices[0].message.content.strip()
        
        # 3. Save it back to the user document
        user_ref.update({"relationship_memory": new_memory})
        print(f"[MEMORY] Successfully updated relationship graph for {user_id}")
        
    except Exception as e:
        print(f"[MEMORY] Failed to update relationship context: {e}")
