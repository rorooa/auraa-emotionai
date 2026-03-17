import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

# Initialize Firebase Admin
# Check for environment variable first (for Render/Production)
firebase_config_env = os.getenv("FIREBASE_SERVICE_ACCOUNT")

if firebase_config_env:
    try:
        # Parse the JSON string from environment variable
        cred_dict = json.loads(firebase_config_env)
        cred = credentials.Certificate(cred_dict)
    except Exception as e:
        print(f"[ERROR] Failed to parse FIREBASE_SERVICE_ACCOUNT env var: {e}")
        # Fallback to file if it exists
        cred = credentials.Certificate("firebase-key.json")
else:
    # Local development: use the JSON file
    if os.path.exists("firebase-key.json"):
        cred = credentials.Certificate("firebase-key.json")
    else:
        raise FileNotFoundError("firebase-key.json not found and FIREBASE_SERVICE_ACCOUNT env var not set.")

firebase_admin.initialize_app(cred)
db_firestore = firestore.client()

# Helper classes for Firestore documents
class User:
    def __init__(self, id, username, email, hashed_password, language_preference="English"):
        self.id = id
        self.username = username
        self.email = email
        self.hashed_password = hashed_password
        self.language_preference = language_preference

class ChatHistory:
    def __init__(self, user_id, role, encrypted_content, detected_emotion, created_at):
        self.user_id = user_id
        self.role = role
        self.encrypted_content = encrypted_content
        self.detected_emotion = detected_emotion
        self.created_at = created_at
