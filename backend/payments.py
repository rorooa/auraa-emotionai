from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
import razorpay
import os
from auth import get_current_user, get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

router = APIRouter(prefix="/api/payments", tags=["payments"])

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "secret_placeholder")

# Allow failure locally if keys are entirely missing
try:
    client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
except Exception as e:
    print(f"[WARNING] Razorpay initialization failed: {e}")
    client = None

class OrderRequest(BaseModel):
    tier: str  # 'pro' or 'premium'

@router.post("/create-order")
def create_order(req: OrderRequest, token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    if not client:
        raise HTTPException(status_code=500, detail="Razorpay client not configured in backend.")
        
    user = get_current_user(token, db)
    
    amount = 0
    if req.tier == "pro":
        amount = 1900 # ₹19.00
    elif req.tier == "premium":
        amount = 3900 # ₹39.00
    else:
        raise HTTPException(status_code=400, detail="Invalid tier selection")
        
    data = {
        "amount": amount,
        "currency": "INR",
        "receipt": f"receipt_{user.id}_{req.tier}",
        "notes": {
            "tier": req.tier,
            "user_id": user.id
        }
    }
    
    try:
        order = client.order.create(data=data)
        return {
            "order_id": order["id"], 
            "amount": amount, 
            "currency": "INR", 
            "key_id": RAZORPAY_KEY_ID
        }
    except Exception as e:
        print(f"[ERROR] creating Razorpay order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    tier: str

@router.post("/verify")
def verify_payment(req: VerifyRequest, token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    if not client:
        raise HTTPException(status_code=500, detail="Razorpay client not configured.")
        
    user = get_current_user(token, db)
    
    params_dict = {
        'razorpay_order_id': req.razorpay_order_id,
        'razorpay_payment_id': req.razorpay_payment_id,
        'razorpay_signature': req.razorpay_signature
    }
    
    try:
        # Verify cryptographically
        client.utility.verify_payment_signature(params_dict)
        
        # Update User Document in Firestore
        user_ref = db.collection("users").document(user.id)
        user_ref.update({
            "subscription_tier": req.tier
        })
        
        return {"status": "success", "message": f"Successfully upgraded to {req.tier} tier"}
        
    except razorpay.errors.SignatureVerificationError:
        print("[ERROR] Razorpay invalid signature")
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    except Exception as e:
        print(f"[ERROR] Post-payment processing failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to process successful payment")

@router.get("/status")
def payment_status(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    user = get_current_user(token, db)
    
    # Needs to fetch the latest doc to see if tier was updated
    user_doc = db.collection("users").document(user.id).get()
    
    if user_doc.exists:
        data = user_doc.to_dict()
        tier = data.get("subscription_tier", "free")
        return {"tier": tier}
        
    return {"tier": "free"}
