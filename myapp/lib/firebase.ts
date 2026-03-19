import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDag4dQFwQnYBrDmEZFqZFd4RLd3P3T2jE",
  authDomain: "emotionai-5fde1.firebaseapp.com",
  projectId: "emotionai-5fde1",
  storageBucket: "emotionai-5fde1.firebasestorage.app",
  messagingSenderId: "611473014210",
  appId: "1:611473014210:web:021331432f0a4e93b3ea5b",
  measurementId: "G-TNT6NQR4K1"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
