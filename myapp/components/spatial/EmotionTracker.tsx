"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, TrendingUp } from "lucide-react";

interface EmotionEntry {
    emotion: string;
    timestamp: string;
}

interface EmotionTrackerProps {
    isOpen: boolean;
    onClose: () => void;
    data: EmotionEntry[];
    subscriptionTier?: string;
}

const EMOTION_COLORS: Record<string, string> = {
    happy: "#34d399",
    sad: "#60a5fa",
    angry: "#f87171",
    fear: "#c084fc",
    surprise: "#fbbf24",
    disgust: "#a3e635",
    neutral: "#94a3b8",
};

const EMOTION_SCORES: Record<string, number> = {
    happy: 9,
    surprise: 7,
    neutral: 5,
    fear: 3,
    disgust: 3,
    sad: 2,
    angry: 1,
};

export default function EmotionTracker({ isOpen, onClose, data, subscriptionTier = "pro" }: EmotionTrackerProps) {
    const [insights, setInsights] = useState<{insight: string, habit: string} | null>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);

    useEffect(() => {
        if (isOpen && subscriptionTier !== 'free' && data.length > 0 && !insights) {
             setLoadingInsights(true);
             const token = localStorage.getItem("auraa_token");
             fetch("/api/history/insights", {
                 headers: { Authorization: `Bearer ${token}` }
             })
             .then(res => res.json())
             .then(d => {
                 if (d.insight) setInsights(d);
             })
             .finally(() => setLoadingInsights(false));
        }
    }, [isOpen, subscriptionTier, data.length, insights]);

    if (!isOpen) return null;

    // Calculate mood density
    const emotionCounts: Record<string, number> = {};
    data.forEach((entry) => {
        const e = entry.emotion?.toLowerCase() || "neutral";
        emotionCounts[e] = (emotionCounts[e] || 0) + 1;
    });
    const total = data.length || 1;
    const sortedEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);

    // Build SVG line chart data points
    const chartData = data.map((entry, i) => {
        const score = EMOTION_SCORES[entry.emotion?.toLowerCase()] ?? 5;
        return { x: i, y: score, emotion: entry.emotion?.toLowerCase() || "neutral" };
    });

    const svgWidth = 520;
    const svgHeight = 160;
    const padding = 20;
    const usableWidth = svgWidth - padding * 2;
    const usableHeight = svgHeight - padding * 2;

    const points = chartData.map((d, i) => {
        const px = padding + (chartData.length > 1 ? (i / (chartData.length - 1)) * usableWidth : usableWidth / 2);
        const py = padding + usableHeight - ((d.y - 1) / 8) * usableHeight;
        return { x: px, y: py, emotion: d.emotion };
    });

    // Build smooth path
    const pathD = points.length > 1
        ? points.reduce((acc, p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`;
            const prev = points[i - 1];
            const cpx = (prev.x + p.x) / 2;
            return `${acc} C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
        }, "")
        : "";

    // Gradient fill area
    const areaD = pathD
        ? `${pathD} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`
        : "";

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md pointer-events-auto"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.85, opacity: 0, y: 40 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.85, opacity: 0, y: 40 }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-[620px] max-w-[95vw] bg-[#0a0a10]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-[0_0_80px_rgba(99,102,241,0.15)] relative"
                >
                    {/* Close */}
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors">
                        <X size={16} className="text-white/70" />
                    </button>

                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                            <Brain size={22} className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold tracking-widest uppercase text-white font-michroma">Neural Tracker</h3>
                            <p className="text-[9px] text-white/40 tracking-[0.2em] uppercase">{data.length} Recorded Interactions</p>
                        </div>
                    </div>

                    {data.length === 0 ? (
                        <div className="text-center py-16 text-white/30 text-sm uppercase tracking-widest">
                            No emotion data found. Start chatting to build your Neural Profile.
                        </div>
                    ) : (
                        <>
                            {/* SVG Line Chart */}
                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-3 ml-1">
                                    <TrendingUp size={12} className="text-cyan-400" />
                                    <span className="text-[9px] uppercase tracking-[0.3em] text-white/40">Sentiment Arc</span>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-4 overflow-hidden">
                                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                                        <defs>
                                            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#818cf8" />
                                                <stop offset="50%" stopColor="#34d399" />
                                                <stop offset="100%" stopColor="#f87171" />
                                            </linearGradient>
                                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.25" />
                                                <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>

                                        {/* Grid lines */}
                                        {[1, 3, 5, 7, 9].map((val) => {
                                            const y = padding + usableHeight - ((val - 1) / 8) * usableHeight;
                                            return <line key={val} x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4" />;
                                        })}

                                        {/* Area fill */}
                                        {areaD && <path d={areaD} fill="url(#areaGrad)" />}

                                        {/* Line */}
                                        {pathD && <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" />}

                                        {/* Dots */}
                                        {points.map((p, i) => (
                                            <circle key={i} cx={p.x} cy={p.y} r={3} fill={EMOTION_COLORS[p.emotion] || "#94a3b8"} stroke="#0a0a10" strokeWidth="1.5" />
                                        ))}

                                        {/* Y axis labels */}
                                        <text x={padding - 5} y={padding + 4} fill="rgba(255,255,255,0.25)" fontSize="8" textAnchor="end">😊</text>
                                        <text x={padding - 5} y={svgHeight - padding + 4} fill="rgba(255,255,255,0.25)" fontSize="8" textAnchor="end">😠</text>
                                    </svg>
                                </div>
                            </div>

                            {/* Mood Density */}
                            <div>
                                <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 ml-1 mb-3 block">Mood Density</span>
                                <div className="grid grid-cols-2 gap-3">
                                    {sortedEmotions.map(([emo, count]) => {
                                        const pct = Math.round((count / total) * 100);
                                        const color = EMOTION_COLORS[emo] || "#94a3b8";
                                        return (
                                            <div key={emo} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-16 h-16 blur-[30px] opacity-20" style={{ backgroundColor: color }} />
                                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/80 truncate">{emo}</span>
                                                        <span className="text-[10px] text-white/50 font-mono">{pct}%</span>
                                                    </div>
                                                    <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full rounded-full"
                                                            style={{ backgroundColor: color }}
                                                            initial={{ width: "0%" }}
                                                            animate={{ width: `${pct}%` }}
                                                            transition={{ type: "spring", stiffness: 50, delay: 0.2 }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* AI Insights (PRO) */}
                            <div className="mt-8">
                                <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 ml-1 mb-3 block">Neural Insights</span>
                                {subscriptionTier === 'free' ? (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center relative overflow-hidden group">
                                         <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                         <h4 className="text-white font-bold mb-2 flex items-center justify-center gap-2">
                                             <span className="text-xl">🔒</span> Unlock Pro Insights
                                         </h4>
                                         <p className="text-white/50 text-xs mb-4">Get AI-generated psychological summaries and micro-habits based on your emotional data.</p>
                                         <button onClick={() => window.location.href='/pricing'} className="px-6 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-indigo-500/20">
                                              Upgrade to Pro
                                         </button>
                                    </div>
                                ) : loadingInsights ? (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-3">
                                         <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse"></div>
                                         <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse"></div>
                                    </div>
                                ) : insights ? (
                                    <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                                         <p className="text-indigo-200 text-sm leading-relaxed mb-4 font-medium">"{insights.insight}"</p>
                                         <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                                             <span className="text-green-400 text-base">🌱</span>
                                             <div>
                                                 <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Suggested Micro-Habit</div>
                                                 <div className="text-white/90 text-xs">{insights.habit}</div>
                                             </div>
                                         </div>
                                    </div>
                                ) : null}
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
