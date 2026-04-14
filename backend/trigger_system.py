"""
TriggerSystem — Smart, anti-spam proactive content scheduler.
Manages per-session state and decides WHEN to push content.
"""

import time
import random
from typing import Optional


class SessionState:
    """Tracks per-user session data for proactive triggers."""

    def __init__(self):
        self.last_user_activity: float = time.time()
        self.last_push_time: float = 0.0
        self.push_count: int = 0
        self.is_speaking: bool = False
        self.is_typing: bool = False
        self.current_emotion: str = "neutral"
        self.next_random_interval: float = self._random_interval()
        self.session_start: float = time.time()

    def _random_interval(self) -> float:
        """Generate a random interval between 5-15 minutes (in seconds)."""
        return random.uniform(300, 900)  # 5 to 15 mins

    def record_activity(self):
        """Called when user sends a message or interacts."""
        self.last_user_activity = time.time()
        self.is_typing = False

    def record_push(self):
        """Called after a proactive push is sent."""
        self.last_push_time = time.time()
        self.push_count += 1
        self.next_random_interval = self._random_interval()

    def update_emotion(self, emotion: str):
        self.current_emotion = emotion.lower()

    def update_speaking(self, speaking: bool):
        self.is_speaking = speaking

    def update_typing(self, typing: bool):
        self.is_typing = typing


class TriggerSystem:
    """
    Determines when to fire a proactive content push.
    
    Rules:
    - Min 5 minute cooldown between pushes
    - Max 3 pushes per session
    - Never interrupt speaking or typing
    - Triggers on: inactivity, emotion-based, random interval
    """

    # Configuration
    MIN_COOLDOWN = 300          # 5 minutes between pushes
    MAX_PUSHES_PER_SESSION = 3
    INACTIVITY_THRESHOLD = 300  # 5 minutes of no user activity
    INITIAL_DELAY = 120         # Wait at least 2 minutes after session start

    def __init__(self):
        self.sessions: dict[str, SessionState] = {}

    def create_session(self, sid: str) -> SessionState:
        """Create a new session for a connected user."""
        session = SessionState()
        self.sessions[sid] = session
        return session

    def remove_session(self, sid: str):
        """Clean up when user disconnects."""
        self.sessions.pop(sid, None)

    def get_session(self, sid: str) -> Optional[SessionState]:
        return self.sessions.get(sid)

    def should_trigger(self, sid: str) -> tuple[bool, str]:
        """
        Check if a proactive push should be triggered for this session.
        
        Returns: (should_trigger: bool, reason: str)
        """
        session = self.sessions.get(sid)
        if not session:
            return False, "no_session"

        now = time.time()

        # Hard limits
        if session.push_count >= self.MAX_PUSHES_PER_SESSION:
            return False, "max_pushes_reached"

        if session.is_speaking:
            return False, "avatar_speaking"

        if session.is_typing:
            return False, "user_typing"

        # Cooldown check
        if session.last_push_time > 0 and (now - session.last_push_time) < self.MIN_COOLDOWN:
            return False, "cooldown"

        # Initial delay (don't push immediately after login)
        if (now - session.session_start) < self.INITIAL_DELAY:
            return False, "initial_delay"

        # --- Trigger conditions (priority order) ---

        # 1. Emotion-based trigger (strong emotion detected)
        if session.current_emotion in ("sad", "angry", "fear"):
            time_since_activity = now - session.last_user_activity
            if time_since_activity > 60:  # At least 1 min since last activity
                return True, f"emotion:{session.current_emotion}"

        # 2. Inactivity trigger
        time_since_activity = now - session.last_user_activity
        if time_since_activity >= self.INACTIVITY_THRESHOLD:
            return True, "inactivity"

        # 3. Random interval trigger
        time_since_last_push = now - session.last_push_time if session.last_push_time > 0 else now - session.session_start
        if time_since_last_push >= session.next_random_interval:
            return True, "random_interval"

        return False, "no_trigger"
