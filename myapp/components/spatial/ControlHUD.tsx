"use client";
import React from 'react';
import { Activity, ShieldAlert, Cpu, Settings, Volume2, User, BarChart3, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface ControlHUDProps {
    emotion: string;
    status: string;
    isSpeaking: boolean;
    onSettingsClick?: () => void;
    isConnected?: boolean;
    onStart?: () => void;
    availableVoices?: SpeechSynthesisVoice[];
    selectedVoice?: SpeechSynthesisVoice | null;
    onVoiceChange?: (voice: SpeechSynthesisVoice) => void;
    onManualEmotion?: (emotion: string) => void;
    onOpenProfile?: () => void;
    onOpenTracker?: () => void;
    onTriggerProactive?: () => void;
}

export default function ControlHUD({ 
    emotion, 
    status, 
    isSpeaking, 
    onSettingsClick,
    isConnected,
    onStart,
    availableVoices = [],
    selectedVoice,
    onVoiceChange,
    onManualEmotion,
    onOpenProfile,
    onOpenTracker,
    onTriggerProactive
}: ControlHUDProps) {
    const e = emotion.toLowerCase();
    const intensity = e === "angry" || e === "fear" ? 90 : e === "happy" ? 75 : 30;
    
    return (
        <div className="flex flex-col h-full font-michroma text-white relative z-50 overflow-y-auto custom-scrollbar pr-2 pb-6">
            <div className="flex items-center justify-between mb-6 shrink-0 pt-2">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                        <Cpu className="text-white" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold tracking-widest uppercase">AURAA Core</h3>
                        <p className="text-[9px] text-white/50 tracking-[0.2em]">{status}</p>
                    </div>
                </div>
                {onSettingsClick && (
                    <button 
                        onClick={onSettingsClick}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-colors"
                        title="Back to Selection"
                    >
                        <Settings className="text-white/70 hover:text-white" size={18} />
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {/* Telemetry Panel */}
                <div>
                    <h4 className="text-[9px] uppercase tracking-[0.3em] text-white/40 mb-3 ml-1">Neural Telemetry</h4>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-inner relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] opacity-20 transition-colors duration-1000 ${intensity > 80 ? 'bg-rose-500' : 'bg-cyan-500'}`} />

                        <div className="flex justify-between items-center mb-4 relative z-10">
                            <span className="text-[10px] tracking-wider text-white/70 flex items-center gap-2 uppercase">
                                <Activity size={12} className={intensity > 80 ? "text-rose-400" : "text-cyan-400"} /> State
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-white/90">{emotion}</span>
                        </div>
                        {/* Progress Bar (Pulse) */}
                        <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden relative z-10">
                            <motion.div 
                                className={`h-full ${intensity > 80 ? 'bg-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.8)]' : 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]'}`}
                                initial={{ width: "0%" }}
                                animate={{ width: `${intensity}%` }}
                                transition={{ type: "spring", stiffness: 50 }}
                            />
                        </div>

                        {/* Manual Override Buttons (Hidden feature) */}
                        <div className="grid grid-cols-2 gap-2 mt-4 relative z-10 font-jura">
                            <button onClick={() => onManualEmotion && onManualEmotion("sad")} className="p-2 sm:px-2 sm:py-1.5 text-[10px] sm:text-[9px] font-bold tracking-widest uppercase bg-white/5 hover:bg-white/10 text-white/60 border border-white/5 rounded-xl transition-all hover:text-blue-300">Sad</button>
                            <button onClick={() => onManualEmotion && onManualEmotion("happy")} className="p-2 sm:px-2 sm:py-1.5 text-[10px] sm:text-[9px] font-bold tracking-widest uppercase bg-white/5 hover:bg-white/10 text-white/60 border border-white/5 rounded-xl transition-all hover:text-emerald-300">Happy</button>
                            <button onClick={() => onManualEmotion && onManualEmotion("angry")} className="p-2 sm:px-2 sm:py-1.5 text-[10px] sm:text-[9px] font-bold tracking-widest uppercase bg-white/5 hover:bg-white/10 text-white/60 border border-white/5 rounded-xl transition-all hover:text-rose-300">Angry</button>
                            <button onClick={() => onManualEmotion && onManualEmotion("fear")} className="p-2 sm:px-2 sm:py-1.5 text-[10px] sm:text-[9px] font-bold tracking-widest uppercase bg-white/5 hover:bg-white/10 text-white/60 border border-white/5 rounded-xl transition-all hover:text-purple-300">Fear</button>
                        </div>
                    </div>
                </div>

                {/* Voice Synthesis Panel */}
                <div>
                    <div className="flex justify-between items-center mb-3 ml-1">
                        <h4 className="text-[9px] uppercase tracking-[0.3em] text-white/40">Voice Config</h4>
                        {availableVoices.length > 0 && (
                            <select 
                                value={selectedVoice?.name || ''} 
                                onChange={(e) => {
                                    const voice = availableVoices.find(v => v.name === e.target.value);
                                    if(voice && onVoiceChange) onVoiceChange(voice);
                                }}
                                className="bg-transparent text-[8px] uppercase tracking-widest text-white/50 border-none outline-none cursor-pointer max-w-[120px] truncate"
                            >
                                {availableVoices.map(v => (
                                    <option key={v.name} value={v.name} className="bg-[#0a0a0f] text-white">
                                        {v.name.split(' ')[0]} {v.lang}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center p-4 relative overflow-hidden shadow-inner mb-2">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/5 opacity-50" />
                        {isSpeaking ? (
                            <div className="flex gap-2 items-center justify-center h-full w-full relative z-10">
                                {[...Array(12)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="w-1.5 bg-white/90 rounded-full shadow-[0_0_15px_white]"
                                        animate={{ height: ["15%", "85%", "15%"] }}
                                        transition={{ duration: 0.4 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.05 }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-[9px] uppercase tracking-[0.4em] text-white/20 text-center animate-pulse relative z-10">
                                Output Ready
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-2.5 font-jura mt-4">
                        <button
                            onClick={() => {
                                window.speechSynthesis.cancel();
                                const t = new SpeechSynthesisUtterance("Hello! I am AURAA, your AI companion.");
                                if (selectedVoice) t.voice = selectedVoice;
                                window.speechSynthesis.speak(t);
                            }}
                            className="flex-1 py-3 sm:py-2.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-[11px] sm:text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white"
                        >
                            <Volume2 size={12} /> Test
                        </button>
                        <button
                            onClick={onOpenProfile}
                            className="flex-1 py-3 sm:py-2.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-[11px] sm:text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white"
                        >
                            <User size={12} /> Profile
                        </button>
                        <button
                            onClick={onOpenTracker}
                            className="flex-1 py-3 sm:py-2.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-[11px] sm:text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-indigo-300"
                        >
                            <BarChart3 size={12} /> Tracker
                        </button>
                    </div>

                    {/* Proactive Trigger Button (Neural Pulse) */}
                    <div className="mt-4">
                        <button
                            onClick={onTriggerProactive}
                            className="w-full py-2.5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 group overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            <Activity size={12} className="group-hover:animate-pulse" />
                            <span>Neural Pulse</span>
                            <Sparkles size={11} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-6 border-t border-white/10 w-full space-y-4 shrink-0">
                {!isConnected ? (
                    onStart && (
                        <button 
                            onClick={onStart}
                            className="w-full py-4 rounded-3xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all"
                        >
                            Initialize System
                        </button>
                    )
                ) : (
                    <div className="w-full py-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center font-bold text-xs uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(52,211,153,0.1)] transition-all">
                        System Online
                    </div>
                )}
                
                <div className="flex items-center gap-3 text-[9px] uppercase tracking-[0.4em] text-white/30 ml-1">
                    <ShieldAlert size={14} className="text-emerald-500/70" />
                    <span>Secure Connect</span>
                </div>
            </div>
        </div>
    );
}
