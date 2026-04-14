"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import FaceScanner from "@/components/FaceScanner";
import SharedViralCard, { ViralCardData } from "@/components/SharedViralCard";
import { Zap } from "lucide-react";

const EMOTION_MAP: Record<string, { emoji: string; label: string; color: string }> = {
  happy: { emoji: "😁", label: "JOY", color: "text-emerald-400" },
  angry: { emoji: "😡", label: "ANGER", color: "text-red-500" },
  surprise: { emoji: "😲", label: "SHOCK", color: "text-yellow-400" },
  sad: { emoji: "😭", label: "SADNESS", color: "text-blue-400" },
  disgust: { emoji: "🤢", label: "DISGUST", color: "text-green-500" },
  fear: { emoji: "😨", label: "FEAR", color: "text-purple-400" },
  neutral: { emoji: "😐", label: "STOIC", color: "text-gray-400" },
};

const EMOTION_POOL = ["happy", "angry", "surprise", "sad", "fear"];

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; desc: string; sequenceLen: number; timeSec: number; color: string; captureMs: number }> = {
  easy: {
    label: "EASY",
    desc: "3 emotions · 25 seconds",
    sequenceLen: 3,
    timeSec: 25,
    color: "border-emerald-500/40 hover:border-emerald-400/70 hover:bg-emerald-500/10 text-emerald-400",
    captureMs: 600,
  },
  medium: {
    label: "MEDIUM",
    desc: "5 emotions · 30 seconds",
    sequenceLen: 5,
    timeSec: 30,
    color: "border-amber-500/40 hover:border-amber-400/70 hover:bg-amber-500/10 text-amber-400",
    captureMs: 500,
  },
  hard: {
    label: "HARD",
    desc: "7 emotions · 30 seconds",
    sequenceLen: 7,
    timeSec: 30,
    color: "border-red-500/40 hover:border-red-400/70 hover:bg-red-500/10 text-red-500",
    captureMs: 400,
  },
};

type Phase = "intro" | "webcam_init" | "countdown" | "playing" | "analyzing" | "result";

export default function ShapeshifterPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<any>(null);
  const emotionCaptureRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const [phase, setPhase] = useState<Phase>("intro");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [sequence, setSequence] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentEmotion, setCurrentEmotion] = useState("neutral");
  const [timeLeft, setTimeLeft] = useState(30000);
  const [snapshot, setSnapshot] = useState("");
  const [cardData, setCardData] = useState<ViralCardData | null>(null);
  const [lastMatchedTime, setLastMatchedTime] = useState(Date.now());
  const [matchTimes, setMatchTimes] = useState<number[]>([]);
  const [count, setCount] = useState(3);

  const config = DIFFICULTY_CONFIG[difficulty];

  const generateSequence = () => {
    // Build a pool that can repeat for hard mode
    const pool = [...EMOTION_POOL];
    const arr: string[] = [];
    for (let i = 0; i < config.sequenceLen; i++) {
      const available = pool.filter((e) => e !== arr[arr.length - 1]); // no consecutive duplicates
      arr.push(available[Math.floor(Math.random() * available.length)]);
    }
    setSequence(arr);
    setCurrentIndex(0);
    setMatchTimes([]);
  };

  const initWebcam = async () => {
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
        });
      }

      await new Promise((r) => setTimeout(r, 2500));
      setCount(3);
      setPhase("countdown");
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

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

  // ─── COUNTDOWN ───
  useEffect(() => {
    if (phase === "countdown") {
      if (count > 0) {
        const timer = setTimeout(() => setCount(count - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        generateSequence();
        setTimeLeft(config.timeSec * 1000);
        setLastMatchedTime(Date.now());
        startTimeRef.current = Date.now();
        setPhase("playing");
        captureFrame();
        emotionCaptureRef.current = setInterval(captureFrame, config.captureMs);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count]);

  // ─── MAIN TIMER LOOP ───
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      if (phase !== "playing") return;
      const delta = time - lastTime;
      lastTime = time;

      setTimeLeft((prev) => {
        const next = Math.max(0, prev - delta);
        if (next === 0) {
          finishGame(false);
        }
        return next;
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    if (phase === "playing") {
      animationFrameId = requestAnimationFrame(loop);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─── EMOTION MATCHING ───
  useEffect(() => {
    if (phase === "playing" && sequence.length > 0 && currentIndex < sequence.length) {
      const target = sequence[currentIndex];
      // Accept close matches (fear ≈ surprise, angry ≈ disgust)
      const matched =
        currentEmotion === target ||
        (target === "surprise" && currentEmotion === "fear") ||
        (target === "fear" && currentEmotion === "surprise") ||
        (target === "angry" && currentEmotion === "disgust") ||
        (target === "disgust" && currentEmotion === "angry");

      if (matched) {
        const now = Date.now();
        const timeTaken = now - lastMatchedTime;
        setMatchTimes((prev) => [...prev, timeTaken]);
        setLastMatchedTime(now);

        if (currentIndex < sequence.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          finishGame(true);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmotion, phase, sequence, currentIndex]);

  const finishGame = (won: boolean) => {
    if (emotionCaptureRef.current) clearInterval(emotionCaptureRef.current);
    setPhase("analyzing");

    setTimeout(() => {
      generateResult(won);
    }, 2500);
  };

  const generateResult = (won: boolean) => {
    const totalTimeMs = Date.now() - startTimeRef.current;
    const agilityScore = won ? (totalTimeMs / 1000).toFixed(2) : "FAILED";

    const avgTime =
      matchTimes.length > 0
        ? (matchTimes.reduce((a, b) => a + b, 0) / matchTimes.length / 1000).toFixed(2) + "s"
        : "N/A";

    let archetype = "THE SLOTH";
    if (won) {
      const ratio = totalTimeMs / (config.timeSec * 1000);
      if (ratio < 0.3) archetype = "NEURAL GOD";
      else if (ratio < 0.6) archetype = "EMOTION CHAMELEON";
      else archetype = "FACIAL GYMNAST";
    } else {
      if (currentIndex === 0) archetype = "STONE STATUE";
      else if (currentIndex < sequence.length / 2) archetype = "GLITCHED ACTOR";
      else archetype = "ALMOST HUMAN";
    }

    const newData: ViralCardData = {
      mode: "SHAPESHIFTER",
      targetImageSrc: snapshot,
      title: archetype,
      subtitle: won ? `MISSION CLEARED · ${config.label}` : `MISSION FAILED · ${config.label}`,
      stats: [
        { label: "AGILITY TIME", value: won ? `${agilityScore}s` : "DNF", color: won ? "#10b981" : "#ef4444" },
        { label: "EMOTIONS HIT", value: `${won ? sequence.length : currentIndex} / ${sequence.length}`, color: "#3b82f6" },
        { label: "AVG RELAY", value: avgTime, color: "#f59e0b" },
        { label: "FACIAL RANK", value: won ? (difficulty === "hard" ? "SSS" : difficulty === "medium" ? "S" : "A") : "F", color: won ? "#a855f7" : "#64748b" },
      ],
      verdict: won
        ? `SURVIVED IN ${agilityScore} SECONDS`
        : `CRACKED ON: ${EMOTION_MAP[sequence[currentIndex]]?.label || "UNKNOWN"}`,
    };

    setCardData(newData);
    setPhase("result");
  };

  const resetGame = () => {
    setPhase("intro");
    setCardData(null);
    setCurrentIndex(0);
    setSequence([]);
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-zinc-950 text-white relative font-jura flex flex-col items-center justify-center">
      <video ref={videoRef} autoPlay playsInline muted className="fixed top-0 left-0 w-1 h-1 opacity-0 pointer-events-none" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Cyberpunk Grid Background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          transform: "perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/40 to-transparent mix-blend-screen pointer-events-none z-0" />

      <button
        onClick={() => router.push("/")}
        className="absolute top-8 left-8 z-50 p-3 text-white/50 hover:text-white border border-white/10 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2"
      >
        <span className="text-xl">←</span>
      </button>

      <AnimatePresence mode="wait">
        {/* ── INTRO + DIFFICULTY SELECT ── */}
        {phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 flex flex-col items-center max-w-lg text-center px-6"
          >
            <Zap className="text-cyan-400 mb-4" size={48} />
            <h1 className="text-3xl sm:text-4xl font-bold font-orbitron tracking-widest text-cyan-400 mb-2">SHAPESHIFTER</h1>
            <p className="text-white/60 mb-8 uppercase tracking-[0.15em] text-sm">
              Rapid facial gymnastics. Match the target emotions before time runs out.
            </p>

            {/* Difficulty Selector */}
            <div className="w-full space-y-3 mb-8">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-2">SELECT DIFFICULTY</p>
              {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG["easy"]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setDifficulty(key)}
                  className={`w-full p-4 rounded-xl bg-white/5 border transition-all flex items-center justify-between ${
                    difficulty === key
                      ? cfg.color + " bg-white/10 shadow-lg"
                      : "border-white/10 text-white/50 hover:border-white/20"
                  }`}
                >
                  <span className="font-orbitron font-bold tracking-widest text-sm">{cfg.label}</span>
                  <span className="text-xs text-white/40">{cfg.desc}</span>
                </button>
              ))}
            </div>

            <button
              onClick={initWebcam}
              className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            >
              START SPEEDRUN
            </button>
          </motion.div>
        )}

        {/* ── WEBCAM INIT ── */}
        {phase === "webcam_init" && (
          <motion.div key="webcam_init" className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="tracking-[0.3em] font-orbitron text-cyan-500 animate-pulse">CONNECTING NEURAL LINK</p>
          </motion.div>
        )}

        {/* ── COUNTDOWN ── */}
        {phase === "countdown" && (
          <motion.div
            key="countdown"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="relative z-10 text-9xl font-orbitron font-bold text-cyan-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.8)]"
          >
            {count}
          </motion.div>
        )}

        {/* ── PLAYING ── */}
        {phase === "playing" && (
          <div className="w-full h-full flex flex-col overflow-hidden relative z-10 px-4 items-center">
            {/* Timer Bar */}
            <div className="w-full max-w-2xl mt-8 mb-3 border-2 border-white/20 p-1 bg-black/50 relative overflow-hidden">
              <div
                className={`h-4 transition-all duration-75 min-w-[2%] ${timeLeft < 5000 ? "bg-red-500 animate-pulse" : "bg-cyan-500"}`}
                style={{ width: `${(timeLeft / (config.timeSec * 1000)) * 100}%` }}
              />
            </div>
            <div
              className="text-3xl font-orbitron font-bold mb-6 tracking-widest"
              style={{ color: timeLeft < 5000 ? "#ef4444" : "#22d3ee" }}
            >
              {(timeLeft / 1000).toFixed(1)}s
            </div>

            {/* Live emotion readout */}
            <div className="flex items-center gap-3 mb-6 px-4 py-2 bg-black/40 border border-white/10 rounded-full">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-white/50">Your Face:</span>
              <span className="text-xs font-bold uppercase text-white/80">{currentEmotion}</span>
            </div>

            {/* Sequence Tracker */}
            <div className="flex gap-3 mb-8 flex-wrap justify-center">
              {sequence.map((em, i) => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-all border-2 ${
                    i < currentIndex
                      ? "bg-green-500/20 border-green-500 text-green-400 scale-90 opacity-50"
                      : i === currentIndex
                      ? "bg-cyan-500/30 border-cyan-400 scale-110 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                      : "bg-white/5 border-white/20 opacity-30"
                  }`}
                >
                  {i < currentIndex ? "✓" : EMOTION_MAP[em]?.emoji}
                </div>
              ))}
            </div>

            {/* Target Display */}
            {sequence[currentIndex] && (
              <div className="flex flex-col items-center">
                <div className="text-7xl mb-3 animate-bounce">{EMOTION_MAP[sequence[currentIndex]].emoji}</div>
                <div className={`text-4xl font-orbitron font-bold tracking-[0.3em] ${EMOTION_MAP[sequence[currentIndex]].color}`}>
                  {EMOTION_MAP[sequence[currentIndex]].label}
                </div>
              </div>
            )}

            {/* Face Scanner Overlay */}
            <div className="absolute bottom-8 right-8 scale-75 origin-bottom-right">
              <FaceScanner videoRef={videoRef} isConnected={true} />
            </div>
          </div>
        )}

        {/* ── ANALYZING ── */}
        {phase === "analyzing" && (
          <motion.div key="analyzing" className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-x-transparent rounded-full animate-spin mb-4" />
            <h2 className="text-2xl font-orbitron tracking-widest text-cyan-400">PROCESSING AGILITY SCORE</h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      {phase === "result" && cardData && <SharedViralCard data={cardData} onClose={resetGame} />}
    </main>
  );
}
