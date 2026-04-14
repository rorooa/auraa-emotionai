"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import FaceScanner from "@/components/FaceScanner";
import SharedViralCard, { ViralCardData } from "@/components/SharedViralCard";
import { ChevronRight } from "lucide-react";

// ─── QUESTION CATEGORIES ───
const QUESTION_CATEGORIES: Record<string, { label: string; icon: string; color: string; questions: string[] }> = {
  couples: {
    label: "Couples",
    icon: "💕",
    color: "text-pink-400 border-pink-500/30 hover:border-pink-400/60 hover:bg-pink-500/10",
    questions: [
      "Do you think my best friend is attractive?",
      "Have you ever lied about why you were busy?",
      "Did you ever consider breaking up?",
      "Do you check your ex's social media?",
      "Have you ever hidden a text from me?",
      "Is there something you're afraid to tell me?",
      "Do you trust me 100%?",
      "Have you ever faked being happy around me?",
    ],
  },
  friends: {
    label: "Friends",
    icon: "🤝",
    color: "text-amber-400 border-amber-500/30 hover:border-amber-400/60 hover:bg-amber-500/10",
    questions: [
      "Are you the toxic friend in the group?",
      "Have you ever talked behind my back?",
      "Do you secretly judge my life choices?",
      "Would you ghost someone you care about?",
      "Have you ever stolen something from a friend?",
      "Do you think you're smarter than everyone here?",
      "Have you ever pretended to like someone's partner?",
      "Would you choose your career over a friendship?",
    ],
  },
  family: {
    label: "Family",
    icon: "👨‍👩‍👧‍👦",
    color: "text-emerald-400 border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-500/10",
    questions: [
      "Who is your favorite child?",
      "Do you think your parents have a favorite?",
      "Have you ever lied to protect a family member?",
      "Do you secretly resent a sibling?",
      "Have you ever read someone's diary or messages?",
      "Do you feel pressure to make your family proud?",
      "Have you ever wished you were born in a different family?",
      "Are you keeping a big secret from your parents?",
    ],
  },
  spicy: {
    label: "Spicy 🔥",
    icon: "🌶️",
    color: "text-red-500 border-red-500/30 hover:border-red-400/60 hover:bg-red-500/10",
    questions: [
      "Are you keeping a secret right now?",
      "Have you ever cheated on a test or at work?",
      "Do you secretly enjoy drama?",
      "Have you ever stalked an ex online?",
      "Is there someone else you think about?",
      "Have you ever pretended to be someone you're not?",
      "Do you judge people by their looks?",
      "Are you actually happy or just pretending?",
    ],
  },
};

const VERDICTS_BY_EMOTION: Record<string, string[]> = {
  sad: ["THEY FEEL GUILTY", "SOMETHING IS WRONG", "HIDING THE PAIN"],
  angry: ["DEFENSIVE LIAR", "THEY HATED THAT QUESTION", "AGGRESSIVE DECEPTION"],
  fear: ["ABSOLUTELY TERRIFIED", "CAUGHT IN A LIE", "PANIC MODE ACTIVATED"],
  disgust: ["SECRETLY JUDGING", "DISGUSTED BY TRUTH", "THE ICK IS REAL"],
  happy: ["SMILING ASSASSIN", "ENJOYING THE LIE", "NOT TAKING THIS SERIOUSLY"],
  surprise: ["CAUGHT OFF GUARD", "FORGOT THEIR ALIBI", "GENUINE SHOCK"],
  neutral: ["STONE COLD PSYCHOPATH", "UNREADABLE", "NERVES OF STEEL"],
};

type Phase = "category_select" | "question_select" | "webcam_init" | "interrogation" | "analyzing" | "result";

export default function ConfessionsPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<any>(null);
  const emotionCaptureRef = useRef<NodeJS.Timeout | null>(null);

  const [phase, setPhase] = useState<Phase>("category_select");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentEmotion, setCurrentEmotion] = useState("neutral");
  const [emotionLog, setEmotionLog] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [snapshot, setSnapshot] = useState("");
  const [cardData, setCardData] = useState<ViralCardData | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // ─── WEBCAM + SOCKET INIT ───
  const initWebcam = async (question: string) => {
    setCurrentQuestion(question);
    setPhase("webcam_init");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      if (!socketRef.current) {
        const socket = getSocket();
        socketRef.current = socket;
        socket.on("emotion", (data: { emotion: string }) => {
          setCurrentEmotion(data.emotion);
          setEmotionLog((prev) => [...prev, data.emotion]);
        });
      }

      await new Promise((r) => setTimeout(r, 2500));
      setCameraReady(true);
      startInterrogation();
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  // ─── CAPTURE FRAME ───
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
    setSnapshot(imageData);

    if (imageData.length > 100) {
      socket.emit("emotion", { image: imageData });
    }
  }, []);

  // ─── START INTERROGATION ───
  const startInterrogation = () => {
    setEmotionLog([]);
    setTimeLeft(15);
    setPhase("interrogation");

    captureFrame();
    emotionCaptureRef.current = setInterval(captureFrame, 800);
  };

  // ─── TIMER COUNTDOWN ───
  useEffect(() => {
    if (phase === "interrogation") {
      if (timeLeft > 0) {
        const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        finishInterrogation();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft]);

  const finishInterrogation = () => {
    if (emotionCaptureRef.current) clearInterval(emotionCaptureRef.current);
    setPhase("analyzing");

    setTimeout(() => {
      generateVerdict();
    }, 2500);
  };

  const generateVerdict = () => {
    const counts = emotionLog.reduce((acc, emp) => {
      acc[emp] = (acc[emp] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let dominant = "neutral";
    let max = 0;
    for (const [emo, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        dominant = emo;
      }
    }

    let secondary = "none";
    let max2 = 0;
    for (const [emo, count] of Object.entries(counts)) {
      if (count > max2 && emo !== dominant) {
        max2 = count;
        secondary = emo;
      }
    }

    const total = emotionLog.length || 1;
    const leakage = dominant === "neutral" ? (max2 / total) * 100 : (max / total) * 100;

    const possibleVerdicts = VERDICTS_BY_EMOTION[dominant] || VERDICTS_BY_EMOTION["neutral"];
    const textVerdict = possibleVerdicts[Math.floor(Math.random() * possibleVerdicts.length)];

    const newData: ViralCardData = {
      mode: "CONFESSIONS",
      targetImageSrc: snapshot,
      title: "INTERROGATION",
      subtitle: "AURA CONFESSIONS",
      stats: [
        { label: "DOMINANT VIBE", value: dominant.toUpperCase(), color: dominant === "fear" ? "#ef4444" : "#a855f7" },
        { label: "EMOTION LEAKAGE", value: `${Math.round(leakage)}%`, color: "#10b981" },
        { label: "HIDDEN TRACE", value: secondary.toUpperCase(), color: "#f59e0b" },
        { label: "HEART RATE EST.", value: `${80 + Math.floor(Math.random() * 40)} BPM`, color: "#ef4444" },
      ],
      verdict: textVerdict,
    };

    setCardData(newData);
    setPhase("result");
  };

  const resetGame = () => {
    setPhase("category_select");
    setSelectedCategory(null);
    setCurrentQuestion("");
    setEmotionLog([]);
    setCardData(null);
    setCameraReady(false);
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-black text-white relative font-jura flex items-center justify-center">
      <video ref={videoRef} autoPlay playsInline muted className="fixed top-0 left-0 w-1 h-1 opacity-0 pointer-events-none" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#000_100%)] z-10" />
        <div className="absolute inset-0 bg-red-900/10 mix-blend-screen" />
      </div>

      <button
        onClick={() => router.push("/")}
        className="absolute top-8 left-8 z-50 p-3 text-white/50 hover:text-white border border-white/10 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2"
      >
        <span className="text-xl">←</span>
      </button>

      <AnimatePresence mode="wait">
        {/* ── PHASE 1: CATEGORY SELECT ── */}
        {phase === "category_select" && (
          <motion.div
            key="category_select"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 flex flex-col items-center max-w-2xl w-full px-6 text-center"
          >
            <div className="text-6xl mb-4">🕵️</div>
            <h1 className="text-3xl sm:text-4xl font-bold font-orbitron tracking-widest text-red-500 mb-2">
              AURA CONFESSIONS
            </h1>
            <p className="text-white/60 mb-10 uppercase tracking-[0.15em] text-sm">
              Choose a category. Pick a question. Expose the truth.
            </p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {Object.entries(QUESTION_CATEGORIES).map(([key, cat], i) => (
                <motion.button
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => {
                    setSelectedCategory(key);
                    setPhase("question_select");
                  }}
                  className={`group p-5 rounded-2xl bg-white/5 border ${cat.color} backdrop-blur-sm transition-all text-left`}
                >
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <div className="text-sm font-bold tracking-wider uppercase">{cat.label}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── PHASE 2: QUESTION SELECT ── */}
        {phase === "question_select" && selectedCategory && (
          <motion.div
            key="question_select"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="relative z-10 flex flex-col items-center max-w-lg w-full px-6"
          >
            <button
              onClick={() => setPhase("category_select")}
              className="self-start mb-4 text-white/50 hover:text-white text-sm tracking-widest uppercase flex items-center gap-2"
            >
              ← Back
            </button>

            <h2 className="text-2xl font-bold font-orbitron tracking-wider text-red-500 mb-2">
              {QUESTION_CATEGORIES[selectedCategory].icon} {QUESTION_CATEGORIES[selectedCategory].label}
            </h2>
            <p className="text-white/40 text-xs tracking-[0.2em] uppercase mb-6">
              TAP A QUESTION TO BEGIN THE INTERROGATION
            </p>

            <div className="w-full space-y-3 max-h-[60vh] overflow-y-auto hidden-scrollbar">
              {QUESTION_CATEGORIES[selectedCategory].questions.map((q, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => initWebcam(q)}
                  className="w-full text-left p-4 bg-white/5 border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 rounded-xl transition-all group flex items-center gap-3"
                >
                  <ChevronRight size={16} className="text-red-500/50 group-hover:text-red-400 shrink-0 transition-colors" />
                  <span className="text-sm text-white/80 group-hover:text-white transition-colors">{q}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── PHASE 3: WEBCAM INIT ── */}
        {phase === "webcam_init" && (
          <motion.div key="webcam_init" className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="tracking-[0.3em] font-orbitron text-red-500 animate-pulse">CALIBRATING BIOMETRICS</p>
          </motion.div>
        )}

        {/* ── PHASE 4: INTERROGATION (15 seconds) ── */}
        {phase === "interrogation" && (
          <motion.div
            key="interrogation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 flex flex-col items-center w-full max-w-3xl px-4"
          >
            {/* Face Scanner Top */}
            <div className="mb-8">
              <FaceScanner videoRef={videoRef} isConnected={true} />
            </div>

            {/* Question + Timer */}
            <div className="text-center bg-black/60 p-8 border border-red-500/30 rounded-2xl backdrop-blur-md w-full max-w-xl">
              <p className="text-red-500 font-bold font-orbitron tracking-[0.4em] text-xs mb-4 animate-pulse">
                ASK THEM NOW
              </p>
              <h2 className="text-2xl md:text-3xl font-bold mb-6 leading-tight">
                &ldquo;{currentQuestion}&rdquo;
              </h2>

              {/* Live emotion indicator */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-white/50">Live:</span>
                <span className="text-xs font-bold text-white/80 uppercase">{currentEmotion}</span>
              </div>

              {/* Timer */}
              <div className="text-5xl font-orbitron text-white/30">
                00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
              </div>

              {/* Timer Bar */}
              <div className="w-full h-2 mt-4 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? "bg-red-500 animate-pulse" : "bg-red-500/60"}`}
                  style={{ width: `${(timeLeft / 15) * 100}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PHASE 5: ANALYZING ── */}
        {phase === "analyzing" && (
          <motion.div key="analyzing" className="relative z-10 flex flex-col items-center text-center">
            <div className="text-5xl mb-6 animate-ping text-red-500">⚠️</div>
            <h2 className="text-2xl font-orbitron tracking-widest text-red-500">ANALYZING MICRO-EXPRESSIONS</h2>
            <p className="text-white/40 tracking-[0.3em] uppercase mt-4">Correlating emotional leaks...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PHASE 6: RESULT ── */}
      {phase === "result" && cardData && (
        <SharedViralCard data={cardData} onClose={resetGame} />
      )}
    </main>
  );
}
