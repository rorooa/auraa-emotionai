# AURAA — Startup Project Overview

## 📖 Introduction
**AURAA** is an interactive AI application that detects a user's real-time emotions via webcam and responds with an empathetic 3D avatar. Built for the startup ecosystem, it combines emotional intelligence with cutting-edge web technologies to provide a unique companion experience.

---

## 🏗 Tech Stack

### Frontend (Next.js)
- **Framework**: Next.js 15+ (App Router, TypeScript)
- **3D Engine**: Three.js (React Three Fiber)
- **Styling**: Tailwind CSS & Framer Motion
- **Sensing**: Web Speech API & Socket.io-client

### Backend (FastAPI)
- **Server**: FastAPI & Uvicorn (Asynchronous Python)
- **Emotion Sensing**: DeepFace & OpenCV (Facial analysis)
- **Conversation**: Groq API (Llama-3 models)
- **Real-time**: Socket.IO
- **Database**: Firestore (NoSQL) & Firebase Auth

### Business Layer
- **Payments**: Razorpay (Pro/Premium subscriptions)
- **Growth**: Built-in Review/Feedback & Testimonial wall
- **Productivity**: Proactive Trigger System & Neural Insights

---

## 🧩 Architecture Flow
1.  **Sight**: Webcam capture -> Socket.IO -> `emotion.py` (DeepFace) -> Real-time mood state.
2.  **Sound**: User speaks -> `Web Speech API` -> Text -> Backend -> `chatbot_llm.py` (Groq).
3.  **Synthesis**: LLM generates response -> `personality_engine.py` adds flair -> `AIAvatar` animates/speaks.
4.  **Growth**: Session ends -> `FeedbackModal` prompts rating -> Testimonial wall updates.

---

## 📂 Key File Structure

### Backend (`/backend`)
| File | Description |
|---|---|
| `main.py` | Entry point & Router registration |
| `emotion.py` | Facial analysis logic |
| `chatbot_llm.py` | Groq AI interface |
| `payments.py` | Razorpay integration |
| `reviews.py` | Feedback system API |
| `memory_engine.py` | User relationship tracking |

### Frontend (`/myapp`)
| File | Description |
|---|---|
| `app/companion/page.tsx` | Main interactive interface |
| `app/reviews/page.tsx` | Public testimonials wall |
| `components/AIAvatar.tsx` | 3D Character logic |
| `components/FeedbackModal.tsx` | Premium review UI |
| `next.config.ts` | API rewrites & workspace config |

---

## 🚀 Setup & Usage
1.  **Backend**: `pip install -r requirements.txt` -> `uvicorn main:app --reload`
2.  **Frontend**: `npm install` -> `npm run dev`
3.  **Env Vars**: Set `GROQ_API_KEY`, `RAZORPAY_KEY_*`, and Firebase credentials.
