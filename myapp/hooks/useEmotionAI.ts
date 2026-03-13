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
                // Default: prefer a female English voice
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
                    console.log("Socket Data:", data);
                    setEmotion(data.emotion);
                    setHeartbeat(prev => prev + 1); // Force effect to run
                });
            }

            // Start Frame Loop
            if (intervalRef.current) clearInterval(intervalRef.current);
            
            intervalRef.current = setInterval(() => {
                const socket = socketRef.current;
                if (!videoRef.current || !canvasRef.current || !socket || !socket.connected) return;

                const ctx = canvasRef.current.getContext("2d");
                if (!ctx || videoRef.current.videoWidth === 0) return;

                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;

                ctx.drawImage(videoRef.current, 0, 0);

                const imageData = canvasRef.current.toDataURL("image/jpeg", 0.6);
                
                // Prevent sending empty data
                if (imageData.length > 50) {
                    socket.emit("emotion", { image: imageData });
                }

            }, 8000); // 8s interval

            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };

        } catch (err: any) {
            console.error("Camera Error details:", err);
            if (err.name === 'NotFoundError') {
                setStatus("Retrying Camera...");
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    if (videoRef.current) videoRef.current.srcObject = stream;
                    setStatus("System Online (Fallback)");
                } catch (e) {
                    setStatus("No Camera Found (Check Hardware)");
                }
            } else if (err.name === 'NotAllowedError') {
                setStatus("Camera Denied (Check Browser Icons)");
            } else if (err.name === 'NotReadableError') {
                setStatus("Camera In Use by Other App");
            } else {
                setStatus(`Camera Error: ${err.name || "Unknown"}`);
            }
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
            console.log(`[EmotionAI] Emotion: ${emotion} | Count: ${newCount}/3`);

            // Trigger if we see the same strong emotion 3 times (3 * 8s = 24s)
            if (newCount >= 3 && ["sad", "angry", "happy", "fear"].includes(emotion)) {

                // Only trigger if not already speaking/thinking
                if (!isSpeaking) {
                    console.log("Triggering Proactive Chat for:", emotion);
                    setProactiveEmotion(emotion);
                }

                // Reset count so we don't spam every 8s
                setEmotionCount(0);
            }
        } else {
            console.log(`[EmotionAI] Emotion Changed: ${lastEmotion} -> ${emotion}`);
            setLastEmotion(emotion);
            setEmotionCount(1);
        }
    }, [emotion, heartbeat]);

    // Helper to clear the trigger after it's handled
    const clearProactiveTrigger = () => setProactiveEmotion(null);


    // Text to Speech
    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.0;
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
                return { reply: "Authentication required.", recommendation: { type: "none" } };
            }

            setStatus("Thinking...");
            // Pass the current emotion in the body
            const response = await fetch("http://localhost:8000/chat", {
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

            const data = await response.json();
            setStatus("Speaking...");
            speak(data.reply);
            return data;
        } catch (e) {
            console.error(e);
            setStatus("Network Error");
            return { reply: "I couldn't reach my brain.", recommendation: { type: "none" } };
        }
    };

    // Greeting logic
    const greet = (name: string) => {
        const text = `Hello ${name}, I am AURAA.`;
        speak(text);
    };

    // EXPOSED FOR DEBUGGING
    const handleSetEmotion = (emo: string) => {
        setEmotion(emo);
        setHeartbeat(prev => prev + 1); // Force effect to progress the count
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
        greet,
        proactiveEmotion,
        clearProactiveTrigger,
        setEmotion: handleSetEmotion,
        availableVoices,
        selectedVoice,
        setSelectedVoice,
    };
}
