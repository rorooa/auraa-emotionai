"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Link2, Users, Zap, ArrowLeft, Loader2, Copy, Check, Search } from "lucide-react";
import { useTherapyRoom } from "@/hooks/useTherapyRoom";

const ROOM_TYPES = [
    {
        id: "solo",
        icon: <Brain size={28} />,
        title: "Solo Therapy",
        subtitle: "1-on-1 with AI Therapist",
        desc: "Private CBT-style session. AURAA guides you through reflection, mindfulness, and emotional processing.",
        color: "#00d4ff",
        gradient: "from-cyan-500/20 to-blue-600/20",
        border: "hover:border-cyan-500/50",
        maxUsers: "You + AI",
    },
    {
        id: "sync",
        icon: <Link2 size={28} />,
        title: "Aura Sync",
        subtitle: "User + User + AI Mediator",
        desc: "Connect with a stranger who shares your emotional wavelength. AURAA bridges the gap between you.",
        color: "#a855f7",
        gradient: "from-purple-500/20 to-violet-600/20",
        border: "hover:border-purple-500/50",
        maxUsers: "2 Users + AI",
    },
    {
        id: "group",
        icon: <Users size={28} />,
        title: "Group Healing",
        subtitle: "2-5 Users + AI Moderator",
        desc: "Anonymous healing room centered around shared emotions. AURAA moderates and guides the group.",
        color: "#10b981",
        gradient: "from-emerald-500/20 to-teal-600/20",
        border: "hover:border-emerald-500/50",
        maxUsers: "Up to 5 + AI",
    },
];

const EMOTION_COLORS: Record<string, string> = {
    neutral: "#94a3b8", happy: "#00ffaa", sad: "#4488ff",
    angry: "#ff3344", fear: "#bb66ff", surprise: "#ffffff", disgust: "#88cc00",
};

export default function RoomsLobbyPage() {
    const router = useRouter();
    const { isConnected, roomData, isMatching, matchStatus, error, createRoom, joinRoom, quickMatch, cancelMatch, clearError } = useTherapyRoom();

    const [userName, setUserName] = useState("Anonymous");
    const [joinCode, setJoinCode] = useState("");
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [publicRooms, setPublicRooms] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("userName");
        if (saved) setUserName(saved);
    }, []);

    // Redirect when room is created/joined
    useEffect(() => {
        if (roomData?.room_id) {
            router.push(`/rooms/${roomData.room_id}`);
        }
    }, [roomData, router]);

    // Fetch public rooms
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                // Using relative path to hit Next.js rewrites
                const res = await fetch(`/api/rooms`);
                if (res.ok) {
                    const data = await res.json();
                    setPublicRooms(data.rooms || []);
                }
            } catch (e) { /* silent fail */ }
        };
        fetchRooms();
        const interval = setInterval(fetchRooms, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleCreate = async (roomType: string) => {
        if (isCreating) return;
        setIsCreating(true);
        try {
            const res = await fetch(`/api/rooms/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ room_type: roomType, creator_name: userName }),
            });
            if (res.ok) {
                const data = await res.json();
                setIsCreating(false);
                router.push(`/rooms/${data.room_id}`);
            } else {
                console.error("Failed to create room");
                setIsCreating(false);
            }
        } catch (e) {
            console.error("Error creating room:", e);
            setIsCreating(false);
        }
    };

    const handleJoin = () => {
        if (!joinCode.trim()) return;
        joinRoom(joinCode.trim(), userName);
    };

    const handleQuickMatch = () => {
        quickMatch(userName, "neutral");
    };

    return (
        <main className="min-h-screen w-full bg-[#020617] text-white font-jura relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-indigo-600/10 blur-[180px] rounded-full" />
                <div className="absolute bottom-[5%] right-[10%] w-[600px] h-[600px] bg-purple-600/8 blur-[200px] rounded-full" />
                <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.06] mix-blend-overlay" />
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between p-6 md:p-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push("/")}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-colors"
                    >
                        <ArrowLeft size={18} className="text-white/70" />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 uppercase">
                            Aura Rooms
                        </h1>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-1">AI-Moderated Emotional Healing Spaces</p>
                    </div>
                </div>

                {/* Connection Status */}
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'} ${isConnected ? 'animate-pulse' : ''}`} />
                    <span className="text-[9px] uppercase tracking-widest text-white/50">{isConnected ? "Online" : "Connecting..."}</span>
                </div>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="relative z-10 mx-8 mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm flex justify-between items-center"
                    >
                        <span>{error}</span>
                        <button onClick={clearError} className="text-red-400 hover:text-white text-xs uppercase tracking-widest">Dismiss</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="relative z-10 px-6 md:px-8 pb-16 max-w-7xl mx-auto">

                {/* Quick Actions Row */}
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                    {/* Join Room */}
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                        <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">Join by Code</h3>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                                placeholder="ROOM CODE"
                                maxLength={6}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm uppercase tracking-widest focus:outline-none focus:border-white/30 placeholder:text-white/20 font-mono"
                            />
                            <button
                                onClick={handleJoin}
                                disabled={!joinCode.trim() || !isConnected}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-30"
                            >
                                Join
                            </button>
                        </div>
                    </div>

                    {/* Quick Match */}
                    <div className="flex-1 bg-gradient-to-br from-purple-500/10 to-violet-600/10 border border-purple-500/20 rounded-3xl p-6 backdrop-blur-md">
                        <h3 className="text-[10px] uppercase tracking-[0.3em] text-purple-300/60 mb-4">Aura Sync â€” Quick Match</h3>
                        {isMatching ? (
                            <div className="flex items-center gap-4">
                                <Loader2 size={18} className="text-purple-400 animate-spin" />
                                <span className="text-sm text-purple-300/80">{matchStatus || "Searching..."}</span>
                                <button 
                                    onClick={cancelMatch}
                                    className="ml-auto px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-xs uppercase tracking-widest text-red-300 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleQuickMatch}
                                disabled={!isConnected}
                                className="w-full py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-widest text-purple-300 transition-all hover:scale-[1.02] disabled:opacity-30 group"
                            >
                                <Zap size={16} className="group-hover:animate-pulse" />
                                Find My Match
                            </button>
                        )}
                    </div>
                </div>

                {/* Room Type Selection */}
                <h2 className="text-[10px] uppercase tracking-[0.4em] text-white/30 mb-6 ml-1">Create a Room</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    {ROOM_TYPES.map((type) => (
                        <motion.div
                            key={type.id}
                            whileHover={{ scale: 1.02, translateY: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => !isCreating && handleCreate(type.id)}
                            className={`group cursor-pointer bg-gradient-to-br ${type.gradient} border border-white/10 ${type.border} rounded-[2rem] p-8 backdrop-blur-md transition-all duration-500 relative overflow-hidden`}
                        >
                            {/* Glow */}
                            <div 
                                className="absolute top-0 right-0 w-40 h-40 blur-[80px] opacity-0 group-hover:opacity-30 transition-opacity duration-700 rounded-full"
                                style={{ backgroundColor: type.color }}
                            />

                            <div className="relative z-10">
                                <div 
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-white/10"
                                    style={{ backgroundColor: `${type.color}15`, color: type.color }}
                                >
                                    {type.icon}
                                </div>
                                <h3 className="text-xl font-bold uppercase tracking-wider mb-1">{type.title}</h3>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">{type.subtitle}</p>
                                <p className="text-sm text-white/50 leading-relaxed mb-6">{type.desc}</p>
                                <div className="flex items-center justify-between">
                                    <span 
                                        className="text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-full border"
                                        style={{ borderColor: `${type.color}30`, color: `${type.color}CC` }}
                                    >
                                        {type.maxUsers}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-widest text-white/30 group-hover:text-white/60 transition-colors">
                                        Click to Create â†’
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Public Rooms */}
                {publicRooms.length > 0 && (
                    <div>
                        <h2 className="text-[10px] uppercase tracking-[0.4em] text-white/30 mb-6 ml-1">Active Public Rooms</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {publicRooms.map((room) => (
                                <motion.div
                                    key={room.room_id}
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => joinRoom(room.room_id, userName)}
                                    className="cursor-pointer bg-white/5 border border-white/10 hover:border-emerald-500/30 rounded-2xl p-5 backdrop-blur-md transition-all group"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-mono tracking-widest text-white/70">{room.room_id}</span>
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-full orb-pulse"
                                                style={{ backgroundColor: EMOTION_COLORS[room.room_aura] || EMOTION_COLORS.neutral }}
                                            />
                                            <span className="text-[8px] uppercase tracking-widest text-white/40">{room.room_aura}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] uppercase tracking-widest text-white/40">
                                            {room.participant_count}/{room.max_participants} users
                                        </span>
                                        <span className="text-[8px] uppercase tracking-widest text-emerald-400/60 group-hover:text-emerald-400 transition-colors">
                                            Join â†’
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
