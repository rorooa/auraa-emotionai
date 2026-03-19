from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import jwt
import os

from passlib.context import CryptContext
from firebase_admin import auth as firebase_auth
from database import db_firestore, User

router = APIRouter()

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "SUPER_SECRET_DEV_KEY_PLEASE_CHANGE")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

class Token(BaseModel):
    access_token: str
    token_type: str

class FirebaseLogin(BaseModel):
    id_token: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

def get_db():
    return db_firestore

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/firebase-login", response_model=Token)
def firebase_login(payload: FirebaseLogin, db=Depends(get_db)):
    try:
        # Verify the ID token sent from the client
        decoded_token = firebase_auth.verify_id_token(payload.id_token)
        uid = decoded_token['uid']
        email = decoded_token.get('email')
        name = decoded_token.get('name', email.split('@')[0] if email else "User")

        # Check if user exists in Firestore, if not create them
        docs = db.collection("users").where("email", "==", email).limit(1).get()
        
        if not docs:
            # Create a new user record linked to Firebase UID
            user_data = {
                "username": name,
                "email": email,
                "firebase_uid": uid,
                "language_preference": "English",
                "created_at": datetime.utcnow()
            }
            db.collection("users").document(uid).set(user_data)
            username = name
        else:
            user_dict = docs[0].to_dict()
            username = user_dict["username"]

        # Create our local JWT for the session
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": username}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"[ERROR] Firebase login failed: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {str(e)}")

@router.post("/register", response_model=Token)
def register(user: UserCreate, db=Depends(get_db)):
    # Check if user already exists
    docs = db.collection("users").where("username", "==", user.username).stream()
    if any(docs):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    docs_email = db.collection("users").where("email", "==", user.email).stream()
    if any(docs_email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = pwd_context.hash(user.password)
    user_data = {
        "username": user.username,
        "email": user.email,
        "hashed_password": hashed_pwd,
        "language_preference": "English",
        "created_at": datetime.utcnow()
    }
    
    new_user_ref = db.collection("users").add(user_data)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(user: UserLogin, db=Depends(get_db)):
    docs = db.collection("users").where("username", "==", user.username).limit(1).get()
    
    if not docs:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    user_doc = docs[0]
    user_dict = user_doc.to_dict()
    
    if not pwd_context.verify(user.password, user_dict["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

def get_current_user(token: str, db=Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    docs = db.collection("users").where("username", "==", username).limit(1).get()
    if not docs:
        raise credentials_exception
    
    user_doc = docs[0]
    user_id = user_doc.id
    user_dict = user_doc.to_dict()
    
    from types import SimpleNamespace
    user_obj = SimpleNamespace(
        id=user_id,
        username=user_dict["username"],
        email=user_dict["email"],
        language_preference=user_dict.get("language_preference", "English")
    )
    return user_obj
