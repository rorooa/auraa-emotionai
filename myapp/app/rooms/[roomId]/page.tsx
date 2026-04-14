"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Mic, Copy, Check, Users, Brain, Link2, Sparkles } from "lucide-react";
import { useTherapyRoom } from "@/hooks/useTherapyRoom";

// ─── EMOTION VISUALS ─────────────────────────────────────────
const EMOTION_COLORS: Record<string, string> = {
    neutral: "#94a3b8", happy: "#00ffaa", sad: "#4488ff",
    angry: "#ff3344", fear: "#bb66ff", surprise: "#ffffff", disgust: "#88cc00",
};

const ROOM_TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    solo: { label: "Solo Therapy", icon: <Brain size={14} />, color: "#00d4ff" },
    sync: { label: "Aura Sync", icon: <Link2 size={14} />, color: "#a855f7" },
    group: { label: "Group Healing", icon: <Users size={14} />, color: "#10b981" },
};

// ─── ENERGY ORB COMPONENT ────────────────────────────────────
function EnergyOrb({ name, emotion, isCurrentUser = false }: { name: string; emotion: string; isCurrentUser?: boolean }) {
    const color = EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral;
    return (
        <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-2"
        >
            <div 
                className={`relative w-16 h-16 rounded-full orb-pulse flex items-center justify-center border-2 ${isCurrentUser ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-[#020617]' : ''}`}
                style={{ 
                    borderColor: `${color}60`,
                    backgroundColor: `${color}15`,
                    boxShadow: `0 0 30px ${color}40, 0 0 60px ${color}20`,
                }}
            >
                <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}` }}
                />
                {/* Emotion wave rings */}
                <div className="absolute inset-0 rounded-full border opacity-30 animate-ping" style={{ borderColor: color }} />
            </div>
            <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 block">{name}</span>
                <span className="text-[8px] uppercase tracking-widest block" style={{ color: `${color}CC` }}>{emotion}</span>
            </div>
        </motion.div>
    );
}

// ─── MINI BOT AVATAR FOR AI MESSAGES ─────────────────────────
function MiniBotAvatar() {
    return (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 flex items-center justify-center shrink-0">
            <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 6px #00d4ff" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 6px #00d4ff" }} />
            </div>
        </div>
    );
}

// ─── MAIN ROOM PAGE ──────────────────────────────────────────
export default function RoomPage() {
    const router = useRouter();
    const params = useParams();
    const roomId = (params.roomId as string)?.toUpperCase() || "";

    const {
        socket, isConnected, roomData, messages, participants, roomAura, syncMeter,
        joinRoom, leaveRoom, sendMessage, updateEmotion,
    } = useTherapyRoom();

    const [userName, setUserName] = useState("Anonymous");
    const [inputValue, setInputValue] = useState("");
    const [isJoined, setIsJoined] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
    }, [messages]);

    // Get username
    useEffect(() => {
        const saved = localStorage.getItem("userName");
        if (saved) setUserName(saved);
    }, []);

    // Auto-join the room
    useEffect(() => {
        if (isConnected && roomId && !isJoined) {
            joinRoom(roomId, userName);
            setIsJoined(true);
        }
    }, [isConnected, roomId, userName, isJoined, joinRoom]);

    const handleSend = useCallback(() => {
        if (!inputValue.trim()) return;
        sendMessage(inputValue.trim(), userName, "neutral");
        setInputValue("");
    }, [inputValue, userName, sendMessage]);

    const handleLeave = () => {
        leaveRoom();
        router.push("/rooms");
    };

    const copyCode = () => {
        navigator.clipboard.writeText(roomId);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.start();
        setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            sendMessage(transcript, userName, "neutral");
        };
    };

    const roomType = roomData?.room_type || "solo";
    const meta = ROOM_TYPE_META[roomType] || ROOM_TYPE_META.solo;
    const auraColor = EMOTION_COLORS[roomAura] || EMOTION_COLORS.neutral;

    return (
        <main className="h-screen w-screen bg-[#020617] text-white font-jura relative overflow-hidden flex flex-col">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] blur-[180px] rounded-full transition-colors duration-2000" style={{ backgroundColor: `${auraColor}15` }} />
                <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] blur-[200px] rounded-full opacity-50" style={{ backgroundColor: `${meta.color}10` }} />
            </div>

            {/* ─── TOP BAR ─── */}
            <div className="relative z-10 flex items-center justify-between p-4 md:p-6 border-b border-white/5 backdrop-blur-md bg-white/[0.02] shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={handleLeave} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors">
                        <ArrowLeft size={16} className="text-white/70" />
                    </button>
                    
                    {/* Room Badge */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border" style={{ borderColor: `${meta.color}30`, backgroundColor: `${meta.color}10` }}>
                        <span style={{ color: meta.color }}>{meta.icon}</span>
                        <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: meta.color }}>{meta.label}</span>
                    </div>

                    {/* Room Code */}
                    <button onClick={copyCode} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all group">
                        <span className="text-xs font-mono tracking-widest text-white/60">{roomId}</span>
                        {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-white/30 group-hover:text-white/60" />}
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {/* Room Aura */}
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full orb-pulse" style={{ backgroundColor: auraColor, boxShadow: `0 0 10px ${auraColor}` }} />
                        <span className="text-[9px] uppercase tracking-widest text-white/50">Room Aura: <span className="text-white/80">{roomAura}</span></span>
                    </div>

                    {/* Participant Count */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                        <Users size={12} className="text-white/50" />
                        <span className="text-[9px] uppercase tracking-widest text-white/50">
                            {participants.length}/{roomData?.max_participants || "?"}
                        </span>
                    </div>
                </div>
            </div>

            {/* ─── MAIN CONTENT ─── */}
            <div className="flex-1 flex overflow-hidden relative z-10">
                
                {/* LEFT: Participants Panel (hidden in solo mode) */}
                {roomType !== "solo" && (
                    <div className="w-48 lg:w-56 border-r border-white/5 bg-white/[0.01] backdrop-blur-md p-4 flex flex-col gap-4 shrink-0 overflow-y-auto hidden-scrollbar">
                        <h3 className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-2">Participants</h3>
                        
                        {participants.map((p) => (
                            <EnergyOrb 
                                key={p.sid} 
                                name={p.name} 
                                emotion={p.emotion}
                                isCurrentUser={p.name === userName}
                            />
                        ))}

                        {/* Sync Meter (Aura Sync mode only) */}
                        {roomType === "sync" && participants.length === 2 && (
                            <div className="mt-auto pt-4 border-t border-white/5">
                                <h4 className="text-[8px] uppercase tracking-[0.3em] text-white/30 mb-3 text-center">Emotional Sync</h4>
                                <div className="relative h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                                    <motion.div 
                                        className="h-full rounded-full sync-meter-glow"
                                        animate={{ width: `${syncMeter}%` }}
                                        transition={{ type: "spring", stiffness: 50 }}
                                        style={{
                                            background: syncMeter > 60 
                                                ? 'linear-gradient(90deg, #a855f7, #00ffaa)' 
                                                : syncMeter > 30 
                                                    ? 'linear-gradient(90deg, #a855f7, #f59e0b)'
                                                    : 'linear-gradient(90deg, #a855f7, #ff3344)',
                                            boxShadow: `0 0 15px ${syncMeter > 60 ? '#a855f780' : '#ff334480'}`
                                        }}
                                    />
                                </div>
                                <p className="text-center text-lg font-bold" style={{ color: syncMeter > 60 ? '#00ffaa' : syncMeter > 30 ? '#f59e0b' : '#ff3344' }}>
                                    {syncMeter}%
                                </p>
                                <p className="text-[8px] uppercase tracking-widest text-white/30 text-center mt-1">
                                    {syncMeter > 80 ? "Deep Resonance" : syncMeter > 60 ? "In Harmony" : syncMeter > 30 ? "Finding Balance" : "Diverging Waves"}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* CENTER: Chat Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    
                    {/* AI Bot Header */}
                    <div className="shrink-0 p-4 border-b border-white/5 flex items-center gap-3 bg-white/[0.01]">
                        <MiniBotAvatar />
                        <div>
                            <span className="text-sm font-bold tracking-wider">AURAA</span>
                            <span className="text-[8px] uppercase tracking-widest text-white/30 ml-2">
                                {roomType === "solo" ? "Your Therapist" : roomType === "sync" ? "Your Bridge" : "Group Moderator"}
                            </span>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5">
                            <Sparkles size={10} className="text-cyan-400" />
                            <span className="text-[8px] uppercase tracking-widest text-cyan-400/60">AI Active</span>
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                        {/* Welcome Message */}
                        {messages.length === 0 && (
                            <div className="flex justify-center py-12">
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                                        <div className="flex gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-cyan-400 bot-antenna-pulse" />
                                            <div className="w-2 h-2 rounded-full bg-cyan-400 bot-antenna-pulse" style={{ animationDelay: "0.3s" }} />
                                        </div>
                                    </div>
                                    <p className="text-white/40 text-sm">Waiting for the session to begin...</p>
                                    <p className="text-[9px] uppercase tracking-widest text-white/20 mt-2">AURAA is preparing your space</p>
                                </div>
                            </div>
                        )}

                        <AnimatePresence>
                            {messages.map((msg, i) => {
                                const isAI = msg.role === "ai";
                                const isCurrentUser = msg.sender_sid ? msg.sender_sid === socket?.id : msg.sender === userName;
                                const emotionColor = EMOTION_COLORS[msg.emotion] || EMOTION_COLORS.neutral;

                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 15, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                        className={`flex ${isAI ? 'justify-start' : isCurrentUser ? 'justify-end' : 'justify-start'} gap-2`}
                                    >
                                        {/* Bot Avatar for AI */}
                                        {isAI && <MiniBotAvatar />}
                                        
                                        {/* Orb for other users */}
                                        {!isAI && !isCurrentUser && (
                                            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center border" style={{ borderColor: `${emotionColor}40`, backgroundColor: `${emotionColor}15` }}>
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: emotionColor }} />
                                            </div>
                                        )}

                                        <div className={`max-w-[75%] ${isAI ? '' : isCurrentUser ? '' : ''}`}>
                                            {/* Sender Name */}
                                            <span 
                                                className={`text-[9px] uppercase tracking-widest mb-1.5 block ${isCurrentUser ? 'text-right' : 'text-left'}`} 
                                                style={{ color: isAI ? '#00d4ff80' : `${emotionColor}80` }}
                                            >
                                                {isCurrentUser ? "YOU" : msg.sender}
                                            </span>
                                            <div className={`p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-md ${
                                                isAI 
                                                    ? 'bg-cyan-500/10 border border-cyan-500/20 text-white/90 rounded-tl-sm' 
                                                    : isCurrentUser
                                                        ? 'bg-white/15 border border-white/20 text-white rounded-tr-sm'
                                                        : 'bg-white/5 border border-white/10 text-white/80 rounded-tl-sm'
                                            }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Input Bar */}
                    <div className="shrink-0 p-4 border-t border-white/5 bg-white/[0.02] backdrop-blur-md">
                        <div className="relative flex items-center gap-3">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder={roomType === "solo" ? "Share what's on your mind..." : "Type a message..."}
                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-20 text-white text-sm focus:outline-none focus:border-white/25 transition-all placeholder:text-white/25 backdrop-blur-xl"
                            />
                            <div className="absolute right-2 flex items-center gap-1.5">
                                <button
                                    onClick={startListening}
                                    className={`p-2.5 rounded-xl transition-all ${isListening ? 'text-rose-400 bg-rose-500/10 animate-pulse' : 'text-white/30 hover:text-white/70 hover:bg-white/5'}`}
                                >
                                    <Mic size={16} />
                                </button>
                                <button
                                    onClick={handleSend}
                                    disabled={!inputValue.trim()}
                                    className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all disabled:opacity-30"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: AI Insights Panel (visible in group/sync with enough participants) */}
                {roomType !== "solo" && participants.length >= 2 && (
                    <div className="w-56 lg:w-64 border-l border-white/5 bg-white/[0.01] backdrop-blur-md p-4 shrink-0 overflow-y-auto hidden-scrollbar hidden lg:block">
                        <h3 className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-4">AI Insights</h3>
                        
                        {/* Room Aura Display */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                            <h4 className="text-[8px] uppercase tracking-widest text-white/30 mb-3">Room Energy</h4>
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-10 h-10 rounded-full orb-pulse"
                                    style={{ backgroundColor: `${auraColor}30`, boxShadow: `0 0 20px ${auraColor}40`, border: `2px solid ${auraColor}60` }}
                                />
                                <div>
                                    <span className="text-sm font-bold capitalize" style={{ color: auraColor }}>{roomAura}</span>
                                    <span className="text-[8px] uppercase tracking-widest text-white/30 block">Dominant Aura</span>
                                </div>
                            </div>
                        </div>

                        {/* Emotion Distribution */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                            <h4 className="text-[8px] uppercase tracking-widest text-white/30 mb-3">Emotion Map</h4>
                            <div className="space-y-2">
                                {participants.map((p) => (
                                    <div key={p.sid} className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: EMOTION_COLORS[p.emotion] || EMOTION_COLORS.neutral }} />
                                        <span className="text-[10px] text-white/60 flex-1">{p.name}</span>
                                        <span className="text-[9px] capitalize" style={{ color: EMOTION_COLORS[p.emotion] || EMOTION_COLORS.neutral }}>{p.emotion}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Session Info */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                            <h4 className="text-[8px] uppercase tracking-widest text-white/30 mb-3">Session</h4>
                            <div className="space-y-2 text-[10px] text-white/40">
                                <div className="flex justify-between"><span>Messages</span><span className="text-white/70">{messages.length}</span></div>
                                <div className="flex justify-between"><span>AI Actions</span><span className="text-cyan-400">{messages.filter(m => m.role === "ai").length}</span></div>
                                <div className="flex justify-between"><span>Type</span><span className="text-white/70 capitalize">{roomType}</span></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
