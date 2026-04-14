"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "@/lib/analytics";

interface ExportClipModalProps {
    isOpen: boolean;
    onClose: () => void;
    subscriptionTier: string;
}

type RecordingState = "idle" | "countdown" | "recording" | "processing" | "done";

export default function ExportClipModal({ isOpen, onClose, subscriptionTier }: ExportClipModalProps) {
    const [state, setState] = useState<RecordingState>("idle");
    const [countdown, setCountdown] = useState(3);
    const [progress, setProgress] = useState(0);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const RECORD_DURATION = 15; // seconds
    const isFreeTier = subscriptionTier === "basic" || subscriptionTier === "free";

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        };
    }, [downloadUrl]);

    const startRecording = () => {
        setState("countdown");
        setCountdown(3);
        setProgress(0);
        setDownloadUrl(null);
        chunksRef.current = [];

        let count = 3;
        const countdownInterval = setInterval(() => {
            count--;
            setCountdown(count);
            if (count <= 0) {
                clearInterval(countdownInterval);
                beginCapture();
            }
        }, 1000);
    };

    const beginCapture = () => {
        // Find the Three.js canvas
        const canvas = document.querySelector("canvas") as HTMLCanvasElement;
        if (!canvas) {
            alert("Could not find the 3D canvas. Please ensure an avatar is loaded.");
            setState("idle");
            return;
        }

        setState("recording");
        trackEvent("Export Clip Started", { tier: subscriptionTier });

        try {
            const stream = canvas.captureStream(30);
            const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
                ? "video/webm;codecs=vp9"
                : "video/webm";

            const recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 5000000, // 5 Mbps for quality
            });

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                setState("processing");
                const blob = new Blob(chunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);
                setDownloadUrl(url);
                setState("done");
                trackEvent("Export Clip Completed", { tier: subscriptionTier, sizeMB: (blob.size / 1024 / 1024).toFixed(2) });
            };

            recorder.start(100); // Collect data every 100ms
            recorderRef.current = recorder;

            // Progress + auto-stop timer
            let elapsed = 0;
            timerRef.current = setInterval(() => {
                elapsed += 0.1;
                setProgress(Math.min(elapsed / RECORD_DURATION, 1));
                if (elapsed >= RECORD_DURATION) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    recorder.stop();
                }
            }, 100);
        } catch (err) {
            console.error("Recording failed:", err);
            alert("Recording failed. Your browser may not support canvas capture.");
            setState("idle");
        }
    };

    const handleDownload = () => {
        if (!downloadUrl) return;
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `AURAA_Clip_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        trackEvent("Export Clip Downloaded", { tier: subscriptionTier });
    };

    const handleClose = () => {
        // Cleanup
        if (recorderRef.current && recorderRef.current.state === "recording") {
            recorderRef.current.stop();
        }
        if (timerRef.current) clearInterval(timerRef.current);
        setState("idle");
        setProgress(0);
        setCountdown(3);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-lg font-jura"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 30 }}
                    className="relative w-full max-w-md bg-[#05050A] border border-red-500/20 rounded-3xl p-8 overflow-hidden shadow-[0_0_60px_rgba(239,68,68,0.1)]"
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />

                    <button
                        onClick={handleClose}
                        className="absolute top-6 right-6 p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    {/* Title */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold uppercase tracking-widest text-red-400 mb-1">
                            🎬 Export Clip
                        </h2>
                        <p className="text-xs text-white/40 tracking-widest uppercase">
                            {RECORD_DURATION}s · Reels · Shorts · Stories
                        </p>
                    </div>

                    {/* STATE: Idle */}
                    {state === "idle" && (
                        <div className="space-y-6">
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-3">
                                <p className="text-sm text-white/60 leading-relaxed">
                                    Record a <strong className="text-white">15-second clip</strong> of your AI companion in action.
                                    Perfect for sharing on Instagram Reels and YouTube Shorts.
                                </p>
                                {isFreeTier && (
                                    <div className="flex items-center gap-2 text-[10px] text-orange-400/80 bg-orange-500/10 border border-orange-500/10 px-3 py-2 rounded-xl">
                                        ⚠️ Basic tier clips include AURAA watermark. Upgrade to Pro for clean exports.
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={startRecording}
                                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold uppercase tracking-widest py-4 rounded-xl flex justify-center items-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-red-500/20"
                            >
                                <span className="text-xl">⏺</span>
                                Start Recording
                            </button>
                        </div>
                    )}

                    {/* STATE: Countdown */}
                    {state === "countdown" && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <motion.div
                                key={countdown}
                                initial={{ scale: 2, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="text-8xl font-black text-red-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                            >
                                {countdown}
                            </motion.div>
                            <p className="text-white/40 text-xs tracking-widest uppercase mt-4">Get Ready...</p>
                        </div>
                    )}

                    {/* STATE: Recording */}
                    {state === "recording" && (
                        <div className="space-y-6 py-4">
                            <div className="flex items-center justify-center gap-3">
                                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                                <span className="text-red-400 font-bold tracking-widest uppercase text-sm">Recording</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                                    style={{ width: `${progress * 100}%` }}
                                    transition={{ duration: 0.1 }}
                                />
                            </div>

                            <p className="text-center text-white/30 text-xs tracking-widest">
                                {Math.ceil(RECORD_DURATION - progress * RECORD_DURATION)}s remaining
                            </p>

                            {/* Watermark Preview Info */}
                            {isFreeTier && (
                                <div className="text-center text-[10px] text-orange-400/60 tracking-widest">
                                    AURAA watermark will be overlaid
                                </div>
                            )}
                        </div>
                    )}

                    {/* STATE: Processing */}
                    {state === "processing" && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                            <p className="text-white/40 text-xs tracking-widest uppercase">Processing clip...</p>
                        </div>
                    )}

                    {/* STATE: Done */}
                    {state === "done" && downloadUrl && (
                        <div className="space-y-6 py-4">
                            <div className="flex flex-col items-center gap-3">
                                <span className="text-5xl">✅</span>
                                <p className="text-white/60 text-sm">Your clip is ready!</p>
                            </div>

                            <button
                                onClick={handleDownload}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold uppercase tracking-widest py-4 rounded-xl flex justify-center items-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-green-500/20"
                            >
                                <span className="text-xl">⬇️</span>
                                Download Clip
                            </button>

                            <button
                                onClick={startRecording}
                                className="w-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold uppercase tracking-widest py-3 rounded-xl transition-all text-sm"
                            >
                                Record Again
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>

            {/* Full-screen Countdown Overlay (shown on the actual page behind the modal) */}
            {state === "countdown" && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none"
                >
                    <motion.div
                        key={`overlay-${countdown}`}
                        initial={{ scale: 3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 0.15 }}
                        className="text-[40vw] font-black text-red-500"
                    >
                        {countdown}
                    </motion.div>
                </motion.div>
            )}

            {/* Recording Indicator (corner badge) */}
            {state === "recording" && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-2 px-4 py-2 bg-red-500/90 backdrop-blur-md rounded-full shadow-[0_0_20px_rgba(239,68,68,0.5)] pointer-events-none">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-white text-xs font-bold tracking-widest uppercase">REC</span>
                    <span className="text-white/70 text-xs font-mono">{Math.ceil(RECORD_DURATION - progress * RECORD_DURATION)}s</span>
                </div>
            )}

            {/* Watermark Overlay (visible during recording for free tier) */}
            {state === "recording" && isFreeTier && (
                <div className="fixed bottom-16 right-8 z-[180] pointer-events-none opacity-60">
                    <div className="text-white font-black text-3xl tracking-[0.3em] uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]" style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}>
                        AURAA
                    </div>
                    <div className="text-white/40 text-[8px] tracking-widest text-right">auraa.ai</div>
                </div>
            )}
        </AnimatePresence>
    );
}
