"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import EmotionMirrorCard from "@/components/EmotionMirrorCard";

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION BANKS
// ─────────────────────────────────────────────────────────────────────────────
const QUESTIONS: Record<string, string[]> = {
    relationship: [
        "Are you really over your ex?",
        "Do you trust your partner 100%?",
        "Would you forgive cheating?",
        "Are you happy being single?",
        "Do you believe in soulmates?",
        "Have you ever faked being in love?",
        "Would you choose love over career?",
        "Are you afraid of commitment?",
        "Do you stalk your ex on social media?",
        "Would you lie to protect someone you love?",
    ],
    deep_mind: [
        "Are you actually happy with your life?",
        "Do you love yourself?",
        "Are you confident about your future?",
        "Do you think people genuinely like you?",
        "Are you living the life you wanted?",
        "Would you restart your life if you could?",
        "Do you feel emotionally stable?",
        "Are you afraid of being alone?",
        "Do you compare yourself to others?",
        "Are you proud of who you've become?",
    ],
    roast: [
        "Do you think you're funny?",
        "Are you the toxic friend in the group?",
        "Do you secretly enjoy drama?",
        "Are you actually a good person?",
        "Do you think you're smarter than your friends?",
        "Have you ever been the villain in someone's story?",
        "Would you ghost someone?",
        "Do you judge people by their looks?",
        "Are you actually productive or just pretending?",
        "Do you lie about being busy?",
    ],
};

const MODE_CONFIG: Record<string, { label: string; icon: string; gradient: string; desc: string; border: string }> = {
    relationship: {
        label: "Relationship",
        icon: "💕",
        gradient: "from-pink-500 to-rose-600",
        desc: "Love, trust & attachment",
        border: "border-pink-500/30 hover:border-pink-400/60",
    },
    deep_mind: {
        label: "Deep Mind",
        icon: "🧠",
        gradient: "from-violet-500 to-indigo-600",
        desc: "Self-reflection & awareness",
        border: "border-violet-500/30 hover:border-violet-400/60",
    },
    roast: {
        label: "Roast Mode",
        icon: "🔥",
        gradient: "from-orange-500 to-red-600",
        desc: "Playful emotional exposure",
        border: "border-orange-500/30 hover:border-orange-400/60",
    },
};

type Phase = "mode_select" | "webcam_init" | "webcam_error" | "question" | "analyzing" | "result";

export default function EmotionMirrorPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const socketRef = useRef<any>(null);
    const emotionCaptureRef = useRef<NodeJS.Timeout | null>(null);
    const questionTimerRef = useRef<number>(0);
    const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [phase, setPhase] = useState<Phase>("mode_select");
    const [selectedMode, setSelectedMode] = useState<string | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState("");
    const [emotionSnapshots, setEmotionSnapshots] = useState<{ emotion: string; timestamp: number }[]>([]);
    const [currentEmotion, setCurrentEmotion] = useState("neutral");
    const [result, setResult] = useState<any>(null);
    const [isCardOpen, setIsCardOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [usedQuestions, setUsedQuestions] = useState<string[]>([]);
    const [typewriterText, setTypewriterText] = useState("");
    const [showAnswerButtons, setShowAnswerButtons] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Removed strict auth check to allow guest access for virality
    useEffect(() => {
        const token = localStorage.getItem("auraa_token");
        // No redirect, just allow guest mode
    }, []);

    // Pick a random unused question
    const pickQuestion = useCallback((mode: string) => {
        const pool = QUESTIONS[mode] || QUESTIONS.deep_mind;
        const available = pool.filter(q => !usedQuestions.includes(q));
        const list = available.length > 0 ? available : pool;
        return list[Math.floor(Math.random() * list.length)];
    }, [usedQuestions]);

    // Start camera + socket
    const initWebcam = async () => {
        setPhase("webcam_init");
        setErrorMessage("");

        // Set a timeout to catch hanging initializations (e.g. system permissions dialog ignored)
        initTimeoutRef.current = setTimeout(() => {
            if (phase === "webcam_init") {
                setErrorMessage("Webcam request timed out. Please ensure you allow camera access in your browser.");
                setPhase("webcam_error");
            }
        }, 10000);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            if (!socketRef.current) {
                const socket = getSocket();
                socketRef.current = socket;
                socket.on("emotion", (data: { emotion: string }) => {
                    setCurrentEmotion(data.emotion);
                });
            }

            // Wait for camera to settle
            await new Promise(r => setTimeout(r, 2000));
            startQuestion();
        } catch (err: any) {
            if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
            console.error("Camera error:", err);
            
            let msg = "Could not access camera.";
            if (err.name === "NotAllowedError") msg = "Camera permission denied. Please allow camera access in your browser settings.";
            else if (err.name === "NotFoundError") msg = "No camera found on this device.";
            else if (err.name === "NotReadableError") msg = "Camera is already in use by another application.";
            
            setErrorMessage(msg);
            setPhase("webcam_error");
        }
    };

    // Capture a single frame and send to backend for emotion detection
    const captureFrame = useCallback(() => {
        const socket = socketRef.current;
        if (!videoRef.current || !socket || !socket.connected) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx || videoRef.current.videoWidth === 0) return;

        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg", 0.7);
        if (imageData.length > 100) {
            socket.emit("emotion", { image: imageData });
        }
    }, []);

    // Start question phase
    const startQuestion = useCallback(() => {
        if (!selectedMode) return;
        const q = pickQuestion(selectedMode);
        setCurrentQuestion(q);
        setUsedQuestions(prev => [...prev, q]);
        setEmotionSnapshots([]);
        setShowAnswerButtons(false);
        setTypewriterText("");
        setPhase("question");

        // Typewriter effect
        let i = 0;
        const typeInterval = setInterval(() => {
            if (i <= q.length) {
                setTypewriterText(q.slice(0, i));
                i++;
            } else {
                clearInterval(typeInterval);
                setShowAnswerButtons(true);
            }
        }, 50);

        // Record when question is fully shown
        questionTimerRef.current = Date.now();

        // Start emotion capture every 800ms
        captureFrame(); // immediate first capture
        emotionCaptureRef.current = setInterval(() => {
            captureFrame();
        }, 800);

        // Also record emotion snapshots as they come in
        const snapInterval = setInterval(() => {
            setEmotionSnapshots(prev => [...prev, { emotion: currentEmotion, timestamp: Date.now() }]);
        }, 800);

        // Store cleanup
        return () => {
            clearInterval(snapInterval);
            if (emotionCaptureRef.current) clearInterval(emotionCaptureRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMode, pickQuestion, captureFrame]);

    // Record emotion snapshots reactively
    useEffect(() => {
        if (phase === "question") {
            setEmotionSnapshots(prev => [...prev, { emotion: currentEmotion, timestamp: Date.now() }]);
        }
    }, [currentEmotion, phase]);

    // Handle answer
    const handleAnswer = async (answer: string) => {
        // Stop emotion capture
        if (emotionCaptureRef.current) {
            clearInterval(emotionCaptureRef.current);
            emotionCaptureRef.current = null;
        }

        const reactionDelay = Date.now() - questionTimerRef.current;

        // Transition to analyzing phase
        setPhase("analyzing");
        setIsLoading(true);
        setScanProgress(0);

        // Animate progress bar
        const progressInterval = setInterval(() => {
            setScanProgress(prev => {
                if (prev >= 95) { clearInterval(progressInterval); return 95; }
                return prev + Math.random() * 15;
            });
        }, 300);

        try {
            const token = localStorage.getItem("auraa_token");
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const response = await fetch(`/api/emotion-mirror/verdict`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    question: currentQuestion,
                    user_answer: answer,
                    emotions_detected: emotionSnapshots,
                    reaction_delay_ms: reactionDelay,
                    game_mode: selectedMode,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setScanProgress(100);
                await new Promise(r => setTimeout(r, 800)); // Dramatic pause
                setResult(data);
                setPhase("result");
                setIsCardOpen(true);
            } else {
                console.error("Verdict API error");
                setPhase("question");
            }
        } catch (err) {
            console.error("Verdict fetch error:", err);
            setPhase("question");
        } finally {
            clearInterval(progressInterval);
            setIsLoading(false);
        }
    };

    const handlePlayAgain = () => {
        setIsCardOpen(false);
        setResult(null);
        startQuestion();
    };

    const handleNewMode = () => {
        setIsCardOpen(false);
        setResult(null);
        setUsedQuestions([]);
        setPhase("mode_select");
        setSelectedMode(null);
    };

    // ─── RENDER ───────────────────────────────────────────────────────────────

    return (
        <main className="h-screen w-screen overflow-hidden bg-[#020205] text-white relative font-jura flex items-center justify-center">
            {/* Hidden camera & canvas */}
            <video ref={videoRef} autoPlay playsInline muted className="fixed top-0 left-0 w-1 h-1 opacity-0 pointer-events-none" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#020205_100%)] z-10 opacity-80" />
                <div className="absolute inset-0 opacity-30 mix-blend-screen bg-[radial-gradient(circle_at_50%_30%,_rgba(168,85,247,0.3)_0%,_transparent_50%),radial-gradient(circle_at_80%_70%,_rgba(236,72,153,0.2)_0%,_transparent_40%)]" />
            </div>

            {/* Back Button */}
            <button
                onClick={() => router.push("/")}
                className="absolute top-6 left-6 sm:top-8 sm:left-8 p-3 text-white/50 hover:text-white border border-white/10 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 z-50"
            >
                <span className="text-xl">←</span>
                <span className="text-sm font-bold tracking-widest uppercase hidden sm:inline">Back</span>
            </button>

            {/* ── PHASE 1: MODE SELECT ── */}
            <AnimatePresence mode="wait">
                {phase === "mode_select" && (
                    <motion.div
                        key="mode_select"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        className="relative z-10 flex flex-col items-center px-6 max-w-2xl w-full"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", damping: 15 }}
                            className="text-6xl mb-6"
                        >
                            🧠
                        </motion.div>

                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter mb-3 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400 uppercase text-center">
                            Emotion Mirror
                        </h1>
                        <p className="text-white/40 text-sm sm:text-base mb-10 text-center max-w-md tracking-wide">
                            Your face can't lie. We ask questions. Your emotions answer.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                            {Object.entries(MODE_CONFIG).map(([key, config], i) => (
                                <motion.button
                                    key={key}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + i * 0.1 }}
                                    onClick={() => {
                                        setSelectedMode(key);
                                        initWebcam();
                                    }}
                                    className={`group relative p-6 rounded-3xl bg-white/5 border ${config.border} backdrop-blur-sm transition-all hover:bg-white/10 hover:scale-[1.02] overflow-hidden text-left`}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                                    <div className="relative z-10">
                                        <div className="text-3xl mb-3">{config.icon}</div>
                                        <div className="text-lg font-bold tracking-wider uppercase text-white mb-1">{config.label}</div>
                                        <div className="text-xs text-white/40 tracking-wide">{config.desc}</div>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ── PHASE 2: WEBCAM INIT ── */}
                {phase === "webcam_init" && (
                    <motion.div
                        key="webcam_init"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        <div className="w-20 h-20 rounded-full border-2 border-violet-400/50 flex items-center justify-center mb-6 animate-pulse">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 animate-spin" style={{ animationDuration: "3s" }} />
                        </div>
                        <p className="text-lg tracking-[0.3em] uppercase text-white/50 animate-pulse">
                            Initializing Neural Scanner...
                        </p>
                    </motion.div>
                )}

                {/* ── PHASE 2.1: WEBCAM ERROR ── */}
                {phase === "webcam_error" && (
                    <motion.div
                        key="webcam_error"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative z-10 flex flex-col items-center p-8 bg-red-500/5 border border-red-500/20 rounded-3xl backdrop-blur-md max-w-md text-center"
                    >
                        <div className="text-5xl mb-6">🚫</div>
                        <h2 className="text-2xl font-bold text-red-400 mb-4 uppercase tracking-wider">Neural Link Failed</h2>
                        <p className="text-white/60 text-sm mb-8 leading-relaxed">
                            {errorMessage || "We couldn't connect to your optical sensor. Please check your camera permissions."}
                        </p>
                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => initWebcam()}
                                className="flex-1 py-3 px-6 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all font-bold uppercase tracking-[0.2em] text-[10px]"
                            >
                                Retry Link
                            </button>
                            <button
                                onClick={() => setPhase("mode_select")}
                                className="flex-1 py-3 px-6 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition-all font-bold uppercase tracking-[0.2em] text-[10px]"
                            >
                                Change Mode
                            </button>
                        </div>
                    </motion.div>
                )}
                {phase === "question" && (
                    <motion.div
                        key="question"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative z-10 flex flex-col items-center px-6 max-w-xl w-full"
                    >
                        {/* Live Emotion Indicator */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8 px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-3"
                        >
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] tracking-[0.3em] uppercase text-white/50">Scanning</span>
                            <span className="text-xs font-bold text-white/80 uppercase">{currentEmotion}</span>
                        </motion.div>

                        {/* Question */}
                        <div className="w-full p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm mb-8">
                            <div className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-4">
                                {MODE_CONFIG[selectedMode || "deep_mind"]?.icon} {MODE_CONFIG[selectedMode || "deep_mind"]?.label}
                            </div>
                            <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight min-h-[4rem]">
                                {typewriterText}
                                <span className="inline-block w-0.5 h-7 bg-violet-400 ml-1 animate-pulse" />
                            </p>
                        </div>

                        {/* Answer Buttons */}
                        <AnimatePresence>
                            {showAnswerButtons && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-4 w-full"
                                >
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleAnswer("yes")}
                                        className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 hover:border-emerald-400/60 text-emerald-300 text-xl font-bold uppercase tracking-[0.3em] transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                                    >
                                        Yes
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleAnswer("no")}
                                        className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 hover:border-red-400/60 text-red-300 text-xl font-bold uppercase tracking-[0.3em] transition-all hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                                    >
                                        No
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* ── PHASE 4: ANALYZING ── */}
                {phase === "analyzing" && (
                    <motion.div
                        key="analyzing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative z-10 flex flex-col items-center px-6"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="w-16 h-16 rounded-full border-2 border-transparent border-t-violet-400 border-r-pink-400 mb-8"
                        />
                        <p className="text-xl tracking-[0.2em] uppercase text-white/60 mb-6 text-center">
                            Scanning Your Soul...
                        </p>
                        <div className="w-64 h-2 rounded-full bg-white/10 overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400"
                                style={{ width: `${scanProgress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                        <p className="text-[10px] tracking-[0.3em] text-white/30 mt-3 uppercase">
                            Analyzing micro-expressions...
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── PHASE 5: RESULT CARD ── */}
            <EmotionMirrorCard
                isOpen={isCardOpen}
                onClose={() => { setIsCardOpen(false); setPhase("mode_select"); setSelectedMode(null); }}
                result={result}
                onPlayAgain={handlePlayAgain}
                onNewMode={handleNewMode}
            />
        </main>
    );
}
