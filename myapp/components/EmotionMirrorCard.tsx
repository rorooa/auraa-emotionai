"use client";

import { useRef, useState } from "react";
import { X, Download, Share2, RotateCcw } from "lucide-react";
import * as htmlToImage from "html-to-image";
import { motion, AnimatePresence } from "framer-motion";

interface EmotionMirrorResult {
    question: string;
    user_answer: string;
    emotions: Record<string, number>;
    dominant_emotion: string;
    reaction_delay_ms: number;
    reaction_label: string;
    is_consistent: boolean;
    verdict: string;
    truth_score: number;
    vibe_tag: string;
    game_mode: string;
    username: string;
    timestamp: string;
}

interface EmotionMirrorCardProps {
    isOpen: boolean;
    onClose: () => void;
    result: EmotionMirrorResult | null;
    onPlayAgain: () => void;
    onNewMode: () => void;
}

const EMOTION_GRADIENTS: Record<string, string> = {
    happy: "from-amber-500/60 via-yellow-400/30 to-orange-600/60",
    sad: "from-blue-600/60 via-indigo-500/30 to-cyan-400/60",
    angry: "from-red-600/60 via-rose-500/30 to-orange-500/60",
    fear: "from-purple-600/60 via-violet-500/30 to-fuchsia-400/60",
    surprise: "from-emerald-500/60 via-teal-400/30 to-cyan-500/60",
    disgust: "from-lime-600/60 via-green-500/30 to-emerald-400/60",
    neutral: "from-slate-500/60 via-gray-400/30 to-zinc-500/60",
};

const EMOTION_EMOJIS: Record<string, string> = {
    happy: "😊", sad: "😢", angry: "😤", fear: "😨",
    surprise: "😲", disgust: "🤢", neutral: "😐",
};

const TRUTH_LABELS: { min: number; label: string; color: string }[] = [
    { min: 80, label: "Brutally Honest", color: "text-emerald-400" },
    { min: 60, label: "Mostly Truthful", color: "text-cyan-400" },
    { min: 40, label: "Emotionally Conflicted", color: "text-amber-400" },
    { min: 20, label: "In Denial", color: "text-orange-400" },
    { min: 0, label: "Full Cap 🧢", color: "text-red-400" },
];

function getTruthLabel(score: number) {
    return TRUTH_LABELS.find(t => score >= t.min) || TRUTH_LABELS[TRUTH_LABELS.length - 1];
}

export default function EmotionMirrorCard({ isOpen, onClose, result, onPlayAgain, onNewMode }: EmotionMirrorCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    if (!isOpen || !result) return null;

    const grad = EMOTION_GRADIENTS[result.dominant_emotion] || EMOTION_GRADIENTS.neutral;
    const truthInfo = getTruthLabel(result.truth_score);
    const topEmotions = Object.entries(result.emotions).slice(0, 3);

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await htmlToImage.toPng(cardRef.current, {
                quality: 1,
                pixelRatio: 3,
            });
            const link = document.createElement("a");
            link.download = `AURAA_EmotionMirror_${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Failed to generate card", err);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShare = async () => {
        if (!cardRef.current) return;
        try {
            const dataUrl = await htmlToImage.toPng(cardRef.current, { quality: 1, pixelRatio: 3 });
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], "emotion_mirror.png", { type: "image/png" });
            if (navigator.share) {
                await navigator.share({
                    title: "My Emotion Mirror Result 🧠",
                    text: `"${result.question}" — ${result.verdict} ${result.vibe_tag} #AURAA #EmotionMirror`,
                    files: [file],
                });
            }
        } catch (err) {
            console.error("Share failed", err);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-jura"
            >
                <div className="relative flex flex-col items-center max-h-[95vh] overflow-y-auto hidden-scrollbar">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute -top-2 right-0 sm:-top-12 sm:right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-50"
                    >
                        <X size={20} />
                    </button>

                    {/* THE CARD (Exportable) */}
                    <div
                        ref={cardRef}
                        className="relative w-[340px] sm:w-[400px] rounded-3xl overflow-hidden bg-[#05050A] border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col"
                    >
                        {/* Background Glow */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br ${grad} rounded-full blur-[100px] opacity-50 z-0`} />

                        {/* Header */}
                        <div className="relative z-20 flex justify-between items-center p-5 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="font-audiowide text-lg tracking-widest text-white">AURAA</span>
                                <span className="text-white/30">|</span>
                                <span className="text-xs tracking-[0.2em] uppercase text-white/50">🧠 Mirror</span>
                            </div>
                            <div className="px-3 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-[10px] uppercase tracking-widest text-white/70">
                                {result.username}
                            </div>
                        </div>

                        {/* Question */}
                        <div className="relative z-20 px-6 pt-6 pb-4">
                            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">The Question</div>
                            <p className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight">
                                "{result.question}"
                            </p>
                        </div>

                        {/* Answer vs Face */}
                        <div className="relative z-20 px-6 py-4 flex gap-4">
                            <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                <div className="text-[9px] uppercase tracking-[0.25em] text-white/40 mb-2">You Said</div>
                                <div className="text-2xl font-bold text-white">{result.user_answer.toUpperCase()}</div>
                                <div className="text-[10px] text-white/30 mt-1">{result.reaction_label} • {(result.reaction_delay_ms / 1000).toFixed(1)}s</div>
                            </div>
                            <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                <div className="text-[9px] uppercase tracking-[0.25em] text-white/40 mb-2">Your Face Said</div>
                                <div className="text-2xl font-bold text-white flex items-center gap-2">
                                    {EMOTION_EMOJIS[result.dominant_emotion] || "🤔"}
                                    <span className="uppercase text-lg">{result.dominant_emotion}</span>
                                </div>
                                <div className="text-[10px] text-white/30 mt-1">
                                    {topEmotions.map(([emo, pct]) => `${emo} ${pct}%`).join(" · ")}
                                </div>
                            </div>
                        </div>

                        {/* Verdict */}
                        <div className="relative z-20 mx-6 mb-4 p-5 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/15 backdrop-blur-md">
                            <div className="text-[9px] uppercase tracking-[0.3em] text-white/40 mb-3">🎯 Verdict</div>
                            <p className="text-base sm:text-lg font-semibold text-white leading-snug">
                                {result.verdict}
                            </p>
                        </div>

                        {/* Truth Score Bar */}
                        <div className="relative z-20 px-6 pb-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] uppercase tracking-[0.25em] text-white/40">Truth Score</span>
                                <span className={`text-xs font-bold ${truthInfo.color}`}>{truthInfo.label}</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${result.truth_score}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                                    className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400"
                                />
                            </div>
                            <div className="text-right mt-1 text-xs font-bold text-white/60">{result.truth_score}/100</div>
                        </div>

                        {/* Footer */}
                        <div className="relative z-20 p-5 flex justify-between items-end border-t border-white/5 bg-black/30 backdrop-blur-sm">
                            <div>
                                <div className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Vibe Check</div>
                                <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">
                                    {result.vibe_tag}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[8px] uppercase tracking-widest text-white/30">#AURAA #EmotionMirror</div>
                                <div className="text-[9px] text-white/20 mt-0.5">{new Date().toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Actions (Outside export area) */}
                    <div className="mt-6 flex flex-wrap gap-3 justify-center pointer-events-auto">
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-full hover:scale-105 transition-transform disabled:opacity-50"
                        >
                            <Download size={14} />
                            {isDownloading ? "Saving..." : "Save Card"}
                        </button>
                        {typeof navigator !== "undefined" && navigator.share && (
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white font-bold uppercase tracking-widest text-xs rounded-full hover:scale-105 transition-transform"
                            >
                                <Share2 size={14} />
                                Share
                            </button>
                        )}
                        <button
                            onClick={onPlayAgain}
                            className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white font-bold uppercase tracking-widest text-xs rounded-full hover:bg-white/20 transition-colors"
                        >
                            <RotateCcw size={14} />
                            Play Again
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
