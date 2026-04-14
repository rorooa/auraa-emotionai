"use client";

import { useRef, useState } from "react";
import { X, Download, Share2 } from "lucide-react";
import * as htmlToImage from "html-to-image";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "@/lib/analytics";

interface AuraCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    dominantEmotion: string;
    userName: string;
}

const EMOTION_PROFILES: Record<string, { color: string, title: string, desc: string, grad: string }> = {
    happy: { color: "#f59e0b", title: "Joyful Resonance", desc: "A bright, outward-radiating energy pattern.", grad: "from-amber-400 to-orange-600" },
    sad: { color: "#3b82f6", title: "Deep Reflection", desc: "A calm, introspective blue aura signature.", grad: "from-blue-400 to-indigo-600" },
    angry: { color: "#ef4444", title: "Intense Passion", desc: "A high-energy, fiery neural state.", grad: "from-red-500 to-rose-700" },
    fear: { color: "#a855f7", title: "Heightened Awareness", desc: "A sensitive and alert purple frequency.", grad: "from-purple-400 to-violet-700" },
    surprise: { color: "#10b981", title: "Sudden Insight", desc: "An expansive, sudden burst of green energy.", grad: "from-emerald-400 to-teal-600" },
    calm: { color: "#14b8a6", title: "Tranquil Flow", desc: "A perfectly balanced, smooth teal current.", grad: "from-teal-300 to-cyan-600" },
    neutral: { color: "#94a3b8", title: "Balanced Core", desc: "A stable, grounded gray-scale energy field.", grad: "from-slate-400 to-slate-600" },
};

export default function AuraCardModal({ isOpen, onClose, dominantEmotion, userName }: AuraCardModalProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    if (!isOpen) return null;

    const lowerEmotion = dominantEmotion.toLowerCase();
    // Default to neutral if the exact string isn't mapped
    const profile = EMOTION_PROFILES[lowerEmotion] || EMOTION_PROFILES.neutral;

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            trackEvent("Aura Card Generated", { emotion: lowerEmotion });
            
            // Generate Image
            const dataUrl = await htmlToImage.toPng(cardRef.current, {
                quality: 1,
                pixelRatio: 3, // High-res for social media sharing
            });

            // Trigger Download
            const link = document.createElement('a');
            link.download = `Auraa_Mood_${lowerEmotion}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Failed to generate Aura Card", err);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-jura"
            >
                <div className="relative flex flex-col items-center">
                    {/* Close Button */}
                    <button 
                        onClick={onClose} 
                        className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
                    >
                        <X size={20} />
                    </button>

                    {/* THE CARD ITSELF (What gets exported) */}
                    <div 
                        ref={cardRef}
                        className="relative w-[340px] h-[480px] sm:w-[380px] sm:h-[540px] rounded-3xl overflow-hidden bg-[#05050A] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col"
                    >
                        {/* Background Grain & Gradients */}
                        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.15] mix-blend-overlay pointer-events-none z-10" />
                        
                        {/* Dynamic Aura Glow */}
                        <div 
                            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-to-br ${profile.grad} rounded-full blur-[80px] opacity-60 z-0`}
                        />

                        {/* Top Header */}
                        <div className="relative z-20 flex justify-between items-center p-6 border-b border-white/5">
                            <div className="text-white font-audiowide text-lg tracking-widest">AURAA</div>
                            <div className="px-3 py-1 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-[10px] uppercase tracking-widest text-white/80">
                                Neural ID: {userName || "Anonymous"}
                            </div>
                        </div>

                        {/* Center Content */}
                        <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-6">
                            <div className="mb-4 inline-flex px-4 py-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-md text-xs tracking-[0.3em] uppercase text-white/50">
                                Dominant State
                            </div>
                            
                            <h2 className="text-5xl sm:text-6xl font-bold uppercase tracking-tighter text-white drop-shadow-lg mb-2">
                                {dominantEmotion}
                            </h2>
                            
                            <p className="text-sm text-white/70 tracking-wide max-w-[250px] mt-4 font-medium px-4 py-2 border border-white/5 bg-white/5 rounded-2xl backdrop-blur-md">
                                {profile.desc}
                            </p>
                        </div>

                        {/* Bottom Footer */}
                        <div className="relative z-20 p-6 flex justify-between items-end border-t border-white/5 bg-black/20 backdrop-blur-sm">
                            <div>
                                <div className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Session Data</div>
                                <div className="text-xs font-bold text-white tracking-wider">Sync: 100% | {new Date().toLocaleDateString()}</div>
                            </div>
                            
                            {/* Fake QR or watermark area */}
                            <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/20 flex flex-wrap p-1 gap-0.5 opacity-80 backdrop-blur-md">
                                {[...Array(9)].map((_, i) => (
                                    <div key={i} className={`w-[10px] h-[10px] rounded-sm ${Math.random() > 0.5 ? 'bg-white/80' : 'bg-transparent'}`} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Actions (Outside the export area) */}
                    <div className="mt-8 flex gap-4 pointer-events-auto">
                        <button 
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold uppercase tracking-widest text-sm rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                        >
                            <Download size={16} />
                            {isDownloading ? "Synthesizing..." : "Save Aura Card"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
