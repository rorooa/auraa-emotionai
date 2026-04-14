import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

# Initialize Firebase Admin
# Check for environment variable first (for Render/Production)
firebase_config_env = os.getenv("FIREBASE_SERVICE_ACCOUNT")

# Debugging connection
if not firebase_config_env:
    print("DEBUG: FIREBASE_SERVICE_ACCOUNT not found in environment.")
    print(f"DEBUG: Visible env keys starting with FIREBASE: {[k for k in os.environ.keys() if k.startswith('FIREBASE')]}")
else:
    print("DEBUG: FIREBASE_SERVICE_ACCOUNT found in environment!")

# Local development: use the JSON file
_base_dir = os.path.dirname(os.path.abspath(__file__))
_key_path = os.path.join(_base_dir, "firebase-key.json")

if firebase_config_env:
    try:
        # Parse the JSON string from environment variable
        cred_dict = json.loads(firebase_config_env)
        cred = credentials.Certificate(cred_dict)
    except Exception as e:
        print(f"[ERROR] Failed to parse FIREBASE_SERVICE_ACCOUNT env var: {e}")
        # Fallback to file if it exists
        cred = credentials.Certificate(_key_path)
else:
    # Local development: use the JSON file
    if os.path.exists(_key_path):
        cred = credentials.Certificate(_key_path)
    else:
        # Check current working directory as a secondary fallback
        if os.path.exists("firebase-key.json"):
            cred = credentials.Certificate("firebase-key.json")
        else:
            raise FileNotFoundError(f"firebase-key.json not found at {_key_path} or in CWD, and FIREBASE_SERVICE_ACCOUNT env var not set.")

firebase_admin.initialize_app(cred)
db_firestore = firestore.client()

# Helper classes for Firestore documents
class User:
    def __init__(self, id, username, email, hashed_password, language_preference="English", subscription_tier="free"):
        self.id = id
        self.username = username
        self.email = email
        self.hashed_password = hashed_password
        self.language_preference = language_preference
        self.subscription_tier = subscription_tier

class ChatHistory:
    def __init__(self, user_id, role, encrypted_content, detected_emotion, created_at):
        self.user_id = user_id
        self.role = role
        self.encrypted_content = encrypted_content
        self.detected_emotion = detected_emotion
        self.created_at = created_at
