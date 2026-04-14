"""
RoomManager — Real-time therapy room state management.
Handles creation, joining, leaving, matchmaking, and emotion tracking for:
 - Solo Therapy (1 user + AI)
 - Aura Sync (2 users + AI mediator)
 - Group Healing (2-5 users + AI moderator)
"""

import time
import uuid
import random
from typing import Optional
from collections import Counter


class Participant:
    """Represents a user in a room."""
    def __init__(self, sid: str, name: str):
        self.sid = sid
        self.name = name
        self.emotion = "neutral"
        self.joined_at = time.time()
        self.last_emotion_update = time.time()
        self.previous_emotion = "neutral"

    def update_emotion(self, new_emotion: str):
        self.previous_emotion = self.emotion
        self.emotion = new_emotion.lower()
        self.last_emotion_update = time.time()

    def emotion_shifted(self) -> bool:
        """Check if emotion changed significantly."""
        return self.emotion != self.previous_emotion and self.previous_emotion != "neutral"

    def to_dict(self):
        return {
            "sid": self.sid,
            "name": self.name,
            "emotion": self.emotion,
            "joined_at": self.joined_at,
        }


class RoomState:
    """Holds all state for a single therapy room."""

    ROOM_TYPES = {"solo": 1, "sync": 2, "group": 5}

    def __init__(self, room_id: str, room_type: str, creator_name: str = "Anonymous"):
        self.room_id = room_id
        self.room_type = room_type  # "solo" | "sync" | "group"
        self.max_participants = self.ROOM_TYPES.get(room_type, 5)
        self.participants: dict[str, Participant] = {}
        self.message_history: list[dict] = []
        self.created_at = time.time()
        self.creator_name = creator_name
        self.is_public = room_type == "group"  # Only group rooms show in lobby
        self.ai_interjection_count = 0
        self.last_ai_interjection = 0.0

    def add_participant(self, sid: str, name: str) -> bool:
        """Add a user to the room. Returns False if room is full."""
        if len(self.participants) >= self.max_participants:
            return False
        self.participants[sid] = Participant(sid, name)
        return True

    def remove_participant(self, sid: str):
        """Remove a user from the room."""
        self.participants.pop(sid, None)

    def is_empty(self) -> bool:
        return len(self.participants) == 0

    def is_full(self) -> bool:
        return len(self.participants) >= self.max_participants

    def add_message(self, sender: str, content: str, role: str = "user", emotion: str = "neutral", sender_sid: str = None):
        """Add a message to room history."""
        self.message_history.append({
            "sender": sender,
            "sender_sid": sender_sid,
            "content": content,
            "role": role,  # "user" | "ai"
            "emotion": emotion,
            "timestamp": time.time(),
        })
        # Keep last 100 messages max
        if len(self.message_history) > 100:
            self.message_history = self.message_history[-100:]

    def get_recent_messages(self, count: int = 10) -> list[dict]:
        return self.message_history[-count:]

    def get_room_aura(self) -> str:
        """Calculate the dominant emotion across all participants."""
        if not self.participants:
            return "neutral"
        emotions = [p.emotion for p in self.participants.values()]
        counter = Counter(emotions)
        # Filter out neutral
        non_neutral = {k: v for k, v in counter.items() if k != "neutral"}
        if non_neutral:
            return max(non_neutral, key=non_neutral.get)
        return "neutral"

    def calculate_sync_meter(self) -> int:
        """
        Calculate emotional alignment (%) between participants.
        Used in Aura Sync (2 user) rooms.
        Returns 0-100.
        """
        participants = list(self.participants.values())
        if len(participants) < 2:
            return 0

        # Compare first two participants' emotions
        e1 = participants[0].emotion
        e2 = participants[1].emotion

        if e1 == e2:
            return 100

        # Similar emotion groupings
        positive = {"happy", "surprise"}
        negative = {"sad", "angry", "fear", "disgust"}
        
        if (e1 in positive and e2 in positive) or (e1 in negative and e2 in negative):
            return 70
        if e1 == "neutral" or e2 == "neutral":
            return 40
        return 15  # Very different emotions

    def should_ai_interject(self) -> tuple[bool, str]:
        """
        Determine if the AI should interject based on emotional dynamics.
        Returns (should_interject, reason).
        """
        now = time.time()

        # Minimum 30 seconds between AI interjections
        if self.last_ai_interjection > 0 and (now - self.last_ai_interjection) < 30:
            return False, "cooldown"

        # Max 10 interjections per session
        if self.ai_interjection_count >= 10:
            return False, "max_reached"

        # Check for emotion shifts in any participant
        for p in self.participants.values():
            if p.emotion_shifted():
                return True, f"emotion_shift:{p.name}:{p.previous_emotion}->{p.emotion}"

        # In sync mode, interject if sync meter changes significantly
        if self.room_type == "sync" and len(self.participants) == 2:
            sync = self.calculate_sync_meter()
            if sync >= 70:
                # Both feeling the same — AI acknowledges connection
                if random.random() > 0.7:  # Don't always fire
                    return True, f"sync_high:{sync}%"
            elif sync <= 20 and len(self.message_history) > 3:
                return True, f"sync_low:{sync}%"

        # Periodic check-in if room is quiet
        if self.message_history:
            last_msg_time = self.message_history[-1]["timestamp"]
            if (now - last_msg_time) > 120:  # 2 minutes of silence
                return True, "silence"
        elif (now - self.created_at) > 15:  # No messages yet after 15 seconds
            return True, "welcome"

        return False, "no_trigger"

    def record_ai_interjection(self):
        self.ai_interjection_count += 1
        self.last_ai_interjection = time.time()

    def get_participants_emotions(self) -> dict[str, str]:
        """Return {name: emotion} for all participants."""
        return {p.name: p.emotion for p in self.participants.values()}

    def to_dict(self):
        return {
            "room_id": self.room_id,
            "room_type": self.room_type,
            "participants": [p.to_dict() for p in self.participants.values()],
            "participant_count": len(self.participants),
            "max_participants": self.max_participants,
            "room_aura": self.get_room_aura(),
            "sync_meter": self.calculate_sync_meter() if self.room_type == "sync" else None,
            "created_at": self.created_at,
            "is_public": self.is_public,
        }


class RoomManager:
    """Manages all active therapy rooms and matchmaking."""

    def __init__(self):
        self.rooms: dict[str, RoomState] = {}
        self.waiting_queue: dict[str, dict] = {}  # sid -> {name, emotion, queued_at}
        self.sid_to_room: dict[str, str] = {}  # Quick lookup: sid -> room_id

    def _generate_room_id(self) -> str:
        """Generate a 6-character room code."""
        return uuid.uuid4().hex[:6].upper()

    def create_room(self, room_type: str, creator_name: str = "Anonymous") -> RoomState:
        """Create a new room and return its state."""
        room_id = self._generate_room_id()
        while room_id in self.rooms:
            room_id = self._generate_room_id()
        room = RoomState(room_id, room_type, creator_name)
        self.rooms[room_id] = room
        print(f"[ROOMS] Created {room_type} room: {room_id}")
        return room

    def join_room(self, room_id: str, sid: str, name: str) -> Optional[RoomState]:
        """Join an existing room. Returns the room if successful, None if full/not found."""
        room = self.rooms.get(room_id)
        if not room:
            return None
        if room.is_full():
            return None
        success = room.add_participant(sid, name)
        if success:
            self.sid_to_room[sid] = room_id
            print(f"[ROOMS] {name} joined room {room_id} ({room.room_type})")
            return room
        return None

    def leave_room(self, sid: str) -> Optional[RoomState]:
        """Remove a user from their room. Returns room for cleanup check."""
        room_id = self.sid_to_room.pop(sid, None)
        if not room_id:
            return None
        room = self.rooms.get(room_id)
        if not room:
            return None
        room.remove_participant(sid)
        print(f"[ROOMS] {sid} left room {room_id}")
        
        # Don't auto-delete empty rooms immediately to allow for page-refresh / redirect reconnections.
        # Stale rooms will be swept by cleanup_stale().
        if room.is_empty():
            print(f"[ROOMS] Room {room_id} is now empty (waiting for reconnect or cleanup)")
            
        return room

    def get_room(self, room_id: str) -> Optional[RoomState]:
        return self.rooms.get(room_id)

    def get_user_room(self, sid: str) -> Optional[RoomState]:
        room_id = self.sid_to_room.get(sid)
        if room_id:
            return self.rooms.get(room_id)
        return None

    def list_public_rooms(self) -> list[dict]:
        """Return list of joinable public rooms."""
        return [
            room.to_dict() for room in self.rooms.values()
            if room.is_public and not room.is_full()
        ]

    # ─── MATCHMAKING ───
    def queue_for_match(self, sid: str, name: str, emotion: str):
        """Add user to the matchmaking waiting queue."""
        self.waiting_queue[sid] = {
            "name": name,
            "emotion": emotion.lower(),
            "queued_at": time.time(),
        }
        print(f"[MATCH] {name} queued for matching (emotion: {emotion})")

    def dequeue(self, sid: str):
        """Remove user from waiting queue."""
        self.waiting_queue.pop(sid, None)

    def find_match(self, sid: str) -> Optional[tuple[str, dict]]:
        """
        Find a compatible match for the given user.
        Returns (matched_sid, matched_info) or None.
        """
        if sid not in self.waiting_queue:
            return None

        user = self.waiting_queue[sid]
        user_emotion = user["emotion"]

        # Compatibility groups
        positive = {"happy", "surprise"}
        negative = {"sad", "angry", "fear", "disgust"}

        for other_sid, other_info in self.waiting_queue.items():
            if other_sid == sid:
                continue

            other_emotion = other_info["emotion"]

            # Match same emotions or same group
            compatible = (
                user_emotion == other_emotion or
                (user_emotion in positive and other_emotion in positive) or
                (user_emotion in negative and other_emotion in negative) or
                user_emotion == "neutral" or other_emotion == "neutral"
            )

            if compatible:
                return other_sid, other_info

        return None

    def create_match_room(self, sid1: str, sid2: str) -> Optional[RoomState]:
        """
        Create an Aura Sync room for two matched users.
        Removes both from the waiting queue.
        """
        info1 = self.waiting_queue.pop(sid1, None)
        info2 = self.waiting_queue.pop(sid2, None)
        if not info1 or not info2:
            return None

        room = self.create_room("sync", info1["name"])
        room.add_participant(sid1, info1["name"])
        room.add_participant(sid2, info2["name"])
        self.sid_to_room[sid1] = room.room_id
        self.sid_to_room[sid2] = room.room_id

        print(f"[MATCH] Created Aura Sync room {room.room_id}: {info1['name']} <-> {info2['name']}")
        return room

    def update_emotion(self, sid: str, emotion: str) -> Optional[RoomState]:
        """Update a user's emotion in their room."""
        room = self.get_user_room(sid)
        if room and sid in room.participants:
            room.participants[sid].update_emotion(emotion)
        return room

    def cleanup_stale(self, max_age: int = 7200):
        """Remove rooms older than max_age seconds (default 2 hours)."""
        now = time.time()
        stale = [rid for rid, room in self.rooms.items() if (now - room.created_at) > max_age]
        for rid in stale:
            # Remove sid mappings
            for sid in list(self.rooms[rid].participants.keys()):
                self.sid_to_room.pop(sid, None)
            del self.rooms[rid]
            print(f"[ROOMS] Cleaned up stale room: {rid}")
