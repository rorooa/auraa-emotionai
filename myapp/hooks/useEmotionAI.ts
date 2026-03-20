"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

export function useEmotionAI() {
    const [emotion, setEmotion] = useState("neutral");
    const [status, setStatus] = useState("Disconnected");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    // Voice Selection
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

    // Proactive Chat State
    const [lastEmotion, setLastEmotion] = useState("neutral");
    const [emotionCount, setEmotionCount] = useState(0);
    const [proactiveEmotion, setProactiveEmotion] = useState<string | null>(null);
    const [heartbeat, setHeartbeat] = useState(0);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const socketRef = useRef<any>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load available voices
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                setAvailableVoices(voices);
                const preferred = voices.find(v =>
                    v.lang.startsWith("en") && v.name.toLowerCase().includes("female")
                ) || voices.find(v => v.lang.startsWith("en")) || voices[0];
                setSelectedVoice(prev => prev ?? preferred ?? null);
            }
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);

    // Initialize System
    const startSystem = async () => {
        setStatus("Initializing Request...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    setStatus("Camera Ready");
                };
            }

            // Connect Socket
            if (!socketRef.current) {
                const socket = getSocket();
                socketRef.current = socket;

                socket.on("connect", () => {
                    setIsConnected(true);
                    setStatus("System Online");
                });

                socket.on("emotion", (data: { emotion: string }) => {
                    setEmotion(data.emotion);
                    setHeartbeat(prev => prev + 1);
                });
            }

            // Start Frame Loop
            if (intervalRef.current) clearInterval(intervalRef.current);
            
            const captureFrame = () => {
                const socket = socketRef.current;
                if (!videoRef.current || !socket || !socket.connected) return;
                
                // Use the ref canvas (which is now in the DOM for better browser support)
                const canvas = canvasRef.current;
                if (!canvas) return;
                
                const ctx = canvas.getContext("2d");
                if (!ctx || videoRef.current.videoWidth === 0) return;
                
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                
                const imageData = canvas.toDataURL("image/jpeg", 0.7);
                if (imageData.length > 100) {
                    console.log("[useEmotionAI] Emitting frame to socket...");
                    socket.emit("emotion", { image: imageData });
                }
            };

            // Run immediately and then every 8 seconds
            captureFrame();
            intervalRef.current = setInterval(captureFrame, 8000);

            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        } catch (err: any) {
            console.error("Camera Error:", err);
            setStatus("Hardware Error");
        }
    };

    // Proactive Logic Effect
    useEffect(() => {
        if (emotion === "neutral") {
            setLastEmotion("neutral");
            setEmotionCount(0);
            return;
        }
        if (emotion === lastEmotion) {
            const newCount = emotionCount + 1;
            setEmotionCount(newCount);
            if (newCount >= 2 && ["sad", "angry", "happy", "fear", "surprise", "disgust"].includes(emotion)) {
                if (!isSpeaking) {
                    setProactiveEmotion(emotion);
                }
                setEmotionCount(0);
            }
        } else {
            setLastEmotion(emotion);
            setEmotionCount(1);
        }
    }, [emotion, heartbeat]);

    const clearProactiveTrigger = () => setProactiveEmotion(null);

    // Text to Speech
    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        if (selectedVoice) utter.voice = selectedVoice;
        utter.onstart = () => setIsSpeaking(true);
        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
    };

    // Chat with AI
    const chat = async (messages: { role: string; content: string }[], userInfo?: { name: string, interests: string, context: string }) => {
        try {
            const token = localStorage.getItem("auraa_token");
            if (!token) {
                window.location.href = "/login";
                return { reply: "Auth required.", recommendation: { type: "none" } };
            }

            setStatus("Thinking...");
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
            const response = await fetch(`${backendUrl}/chat`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify({
                    name: userInfo?.name || "User",
                    emotion: emotion,
                    messages: messages,
                    context: userInfo ? `User Interests: ${userInfo.interests}. User Context: ${userInfo.context}` : ""
                }),
            });

            if (response.status === 401) {
                localStorage.removeItem("auraa_token");
                window.location.href = "/login";
                return { reply: "Session expired.", recommendation: { type: "none" } };
            }

            if (!response.ok) {
                const text = await response.text();
                try {
                    const errorData = JSON.parse(text);
                    return { reply: errorData.detail || "Error", recommendation: { type: "none" } };
                } catch (e) {
                    return { reply: "My brain is warming up. Please try again in 30 seconds.", recommendation: { type: "none" } };
                }
            }

            const data = await response.json();
            setStatus("Speaking...");
            speak(data.reply);
            return data;
        } catch (e) {
            console.error(e);
            setStatus("Disconnected");
            return { reply: "I couldn't reach my brain. Please refresh the page.", recommendation: { type: "none" } };
        }
    };

    const greet = (name: string) => speak(`Hello ${name}, I am AURAA.`);
    
    const getHistory = async () => {
        try {
            const token = localStorage.getItem("auraa_token");
            if (!token) return [];
            
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
            const response = await fetch(`${backendUrl}/history`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.history;
            }
            return [];
        } catch (e) {
            console.error("Fetch history error:", e);
            return [];
        }
    };

    return {
        emotion,
        emotionCount,
        status,
        isSpeaking,
        isConnected,
        videoRef,
        canvasRef,
        startSystem,
        chat,
        getHistory,
        greet,
        proactiveEmotion,
        clearProactiveTrigger,
        setEmotion: (emo: string) => { setEmotion(emo); setHeartbeat(prev => prev + 1); },
        availableVoices,
        selectedVoice,
        setSelectedVoice,
    };
}
