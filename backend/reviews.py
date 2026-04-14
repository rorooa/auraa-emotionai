from fastapi import APIRouter, HTTPException
from typing import Optional, List
from pydantic import BaseModel, Field
import datetime
from database import db_firestore
from firebase_admin import firestore

router = APIRouter(prefix="/reviews", tags=["reviews"])

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    emotion_tags: List[str] = []
    comment: str = Field(..., max_length=500)
    session_emotion: str
    avatar_url: Optional[str] = None
    is_anonymous: bool = False
    user_id: Optional[str] = None
    username: Optional[str] = None

@router.post("")
def create_review(review: ReviewCreate):
    try:
        doc_ref = db_firestore.collection("reviews").document()
        review_data = {
            "id": doc_ref.id,
            "user_id": review.user_id if not review.is_anonymous else None,
            "username": review.username if not review.is_anonymous else "Anonymous User",
            "rating": review.rating,
            "emotion_tags": review.emotion_tags,
            "comment": review.comment,
            "session_emotion": review.session_emotion,
            "avatar_url": review.avatar_url,
            "is_anonymous": review.is_anonymous,
            "created_at": datetime.datetime.utcnow(),
            "is_featured": False
        }
        doc_ref.set(review_data)
        return {"status": "success", "review_id": doc_ref.id}
    except Exception as e:
        print(f"[ERROR] storing review: {e}")
        raise HTTPException(status_code=500, detail="Failed to store review")

@router.get("")
def get_reviews(limit: int = 50):
    try:
        docs = db_firestore.collection("reviews").order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit).stream()
        
        # Manually format for frontend
        reviews = []
        for doc in docs:
            d = doc.to_dict()
            if "created_at" in d and hasattr(d["created_at"], "isoformat"):
                d["created_at"] = d["created_at"].isoformat()
            elif "created_at" in d and isinstance(d["created_at"], datetime.datetime):
                d["created_at"] = d["created_at"].isoformat()
            else:
                d["created_at"] = str(d["created_at"])
            reviews.append(d)
                
        return {"reviews": reviews}
    except Exception as e:
        print(f"[ERROR] fetching reviews: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reviews")

@router.get("/stats")
def get_review_stats():
    try:
        docs = db_firestore.collection("reviews").stream()
        total = 0
        sum_rating = 0
        tags = {}
        
        for doc in docs:
            d = doc.to_dict()
            total += 1
            sum_rating += d.get("rating", 0)
            
            for t in d.get("emotion_tags", []):
                tags[t] = tags.get(t, 0) + 1
                
        avg_rating = sum_rating / total if total > 0 else 0
        
        return {
            "total_reviews": total,
            "average_rating": round(avg_rating, 1),
            "tag_distribution": tags
        }
    except Exception as e:
        print(f"[ERROR] fetching review stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch review stats")
