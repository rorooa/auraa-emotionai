"use client";

import { useState, useEffect } from "react";
import ControlPanel from "@/components/ControlPanel";
import ChatInterface from "@/components/ChatInterface";
import AvatarScene from "@/components/AvatarScene";
import MediaOverlay from "@/components/MediaOverlay";
import dynamic from "next/dynamic";
import { useEmotionAI } from "@/hooks/useEmotionAI";
import UserDashboard from "@/components/UserDashboard";
import { motion } from "framer-motion";

const FaceScanner = dynamic(() => import("@/components/FaceScanner"), { ssr: false });

export default function CompanionPage() {
    // ... existing hook calls ...
    const {
        emotion,
        status,
        isConnected,
        isSpeaking,
        startSystem,
        availableVoices,
        selectedVoice,
        setSelectedVoice,
        setEmotion,
        chat,
        proactiveEmotion,
        clearProactiveTrigger,
        videoRef,
        emotionCount,
        getHistory
    } = useEmotionAI();

    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [userInfo, setUserInfo] = useState({
        name: "User",
        interests: "",
        context: "",
        language: "English"
    });
    
    // Recommendation State
    const [recommendation, setRecommendation] = useState<any>(null);
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);

    useEffect(() => {
        const loadHistory = async () => {
            const history = await getHistory();
            if (history && history.length > 0) {
                const formatted = history.map((item: any) => ({
                    role: item.role === "system" ? "ai" : "user",
                    text: item.content
                }));
                setChatHistory(formatted);
            }
        };
        loadHistory();
    }, []);

    const handleAvatarSelect = (id: string) => {
        setSelectedAvatar(id);
    };

    const handleChat = async (messages: any[]) => {
        const response = await chat(messages, userInfo);
        if (response?.recommendation && response.recommendation.type !== "none") {
            setRecommendation(response.recommendation);
        }
        return response;
    };

    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({
                x: (e.clientX / window.innerWidth - 0.5) * 30,
                y: (e.clientY / window.innerHeight - 0.5) * 30,
            });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    if (!selectedAvatar) {
        return (
            <main className="min-h-screen w-full bg-[#020617] text-white flex flex-col items-center justify-center p-6 font-jura relative overflow-hidden perspective-[1000px]">
                {/* Shared Parallax Background */}
                {isMounted && (
                    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                        <motion.div 
                            animate={{ 
                                x: mousePosition.x * -0.5, 
                                y: mousePosition.y * -0.5,
                                opacity: [0.03, 0.05, 0.03]
                            }}
                            transition={{ opacity: { duration: 4, repeat: Infinity } }}
                            className="absolute inset-0 flex items-center justify-center select-none"
                        >
                            <h1 className="text-[25vw] font-black tracking-[-0.05em] text-white uppercase leading-none filter blur-sm">
                                AURAA
                            </h1>
                        </motion.div>

                        <motion.div 
                            animate={{ x: mousePosition.x * -1.2, y: mousePosition.y * -1.2 }}
                            className="absolute top-[10%] left-[15%] w-[600px] h-[600px] bg-indigo-600/20 blur-[180px] rounded-full" 
                        />
                        <motion.div 
                            animate={{ x: mousePosition.x * 1.8, y: mousePosition.y * 1.8 }}
                            className="absolute bottom-[5%] right-[10%] w-[700px] h-[700px] bg-purple-600/15 blur-[200px] rounded-full" 
                        />

                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.08] mix-blend-overlay" />
                    </div>
                )}

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                        opacity: 1, 
                        x: mousePosition.x * 0.2,
                        y: mousePosition.y * 0.2,
                    }}
                    className="z-10 text-center"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-blue-400 to-indigo-400 uppercase">
                        Neural Interface Selection
                    </h1>
                    <p className="text-white/40 mb-12 text-lg">Choose your visual manifestation for AURAA</p>
                </motion.div>

                <div className="flex flex-col md:flex-row gap-8 z-10 w-full max-w-5xl justify-center font-jura">
                    {/* Classic Bot Card */}
                    <motion.div
                        whileHover={{ scale: 1.05, translateY: -10 }}
                        animate={{ 
                            rotateX: -mousePosition.y * 0.05,
                            rotateY: mousePosition.x * 0.05,
                        }}
                        onClick={() => handleAvatarSelect("classic")}
                        className="flex-1 group cursor-pointer bg-slate-900/40 backdrop-blur-[40px] border border-white/10 p-8 rounded-[2.5rem] hover:border-indigo-500/60 hover:bg-indigo-500/5 transition-all duration-500 text-center max-w-[280px] relative overflow-hidden"
                    >
                        <div className="w-full h-40 mb-6 bg-gradient-to-b from-indigo-500/20 to-transparent rounded-2xl flex items-center justify-center font-mono text-6xl">
                            🤖
                        </div>
                        <h2 className="text-xl font-bold mb-2 group-hover:text-indigo-400 transition-colors uppercase tracking-widest">Bot Core</h2>
                        <p className="text-white/30 text-xs">Holographic Intelligence<br/>Reactive Eyes · Emotion HUD</p>
                        <div className="mt-4 text-[9px] tracking-widest uppercase text-indigo-400/60 border border-indigo-500/10 rounded-full px-3 py-1 inline-block">Physical Core</div>
                    </motion.div>

                    {/* Advanced AI Avatar Card */}
                    <motion.div
                        whileHover={{ scale: 1.05, translateY: -10 }}
                        animate={{ 
                            rotateX: -mousePosition.y * 0.05,
                            rotateY: mousePosition.x * 0.05,
                        }}
                        onClick={() => handleAvatarSelect("ai")}
                        className="flex-1 group cursor-pointer bg-slate-900/40 backdrop-blur-[40px] border border-white/10 p-8 rounded-[2.5rem] hover:border-emerald-500/60 hover:bg-emerald-500/5 transition-all duration-500 text-center max-w-[280px] relative overflow-hidden"
                    >
                        <div className="w-full h-40 mb-6 bg-gradient-to-b from-emerald-500/20 to-transparent rounded-2xl overflow-hidden flex items-center justify-center font-mono text-6xl">
                             🧬
                        </div>
                        <h2 className="text-xl font-bold mb-2 group-hover:text-emerald-400 transition-colors uppercase tracking-widest">AI NextGen</h2>
                        <p className="text-white/30 text-xs">High-Fidelity 3D<br/>Lip Sync · Emotion Mapping</p>
                        <div className="mt-4 text-[9px] tracking-widest uppercase text-emerald-400/60 border border-emerald-500/10 rounded-full px-3 py-1 inline-block">Neural Core</div>
                    </motion.div>
                </div>

                <div className="mt-12 text-white/20 text-[10px] tracking-[0.5em] uppercase z-10">
                    Neural Link Established v5.0
                </div>
            </main>
        );
    }

    return (
        <main className="h-screen w-screen overflow-hidden bg-black text-white relative flex flex-col md:flex-row p-4 md:p-8 gap-6 selection:bg-indigo-500/30 font-jura">

            {/* VIDEO BACKGROUND (Subtle) */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-20 filter grayscale brightness-50"
                >
                    <source src="/background.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/80 to-indigo-900/40" />
            </div>

            {/* UI Overlays */}
            {recommendation && (
                <MediaOverlay 
                    type={recommendation.type} 
                    query={recommendation.query}
                    music_url={recommendation.music_url}
                    movie_query={recommendation.movie_query}
                    onClose={() => setRecommendation(null)} 
                />
            )}
            
            <div className="absolute top-24 left-8 z-50">
                <FaceScanner videoRef={videoRef} isConnected={isConnected} emotionCount={emotionCount} />
            </div>
            
            <UserDashboard
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                currentInfo={userInfo}
                onSave={(info) => setUserInfo(info)}
            />

            {/* Left Sidebar */}
            <div className="z-10 relative">
                <ControlPanel
                    status={status}
                    emotion={emotion}
                    isConnected={isConnected}
                    onStart={startSystem}
                    isSpeaking={isSpeaking}
                    onManualEmotion={setEmotion}
                    onOpenProfile={() => setIsProfileOpen(true)}
                    availableVoices={availableVoices}
                    selectedVoice={selectedVoice}
                    onVoiceChange={setSelectedVoice}
                />
            </div>

            {/* Main Stage (40/60 Split Layout) */}
            <div className="flex-1 flex flex-row relative rounded-3xl overflow-hidden border border-white/10 shadow-inner bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-sm">

                {/* Left Side: Avatar Canvas (40%) */}
                <div className="w-[40%] h-full relative z-0 flex items-center justify-center">
                    <AvatarScene emotion={emotion} isSpeaking={isSpeaking} avatarId={selectedAvatar || "classic"} />
                    
                    {/* Viewport Controls: Switch Avatar */}
                    <div className="absolute top-6 left-6 z-10">
                        <button
                            onClick={() => setSelectedAvatar(null)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl hover:bg-blue-500/20 hover:border-blue-500/50 transition-all duration-300 text-white/70 hover:text-white text-xs tracking-widest uppercase font-bold group"
                        >
                            <span className="text-lg group-hover:rotate-90 transition-transform duration-500">🔄</span>
                            Switch Avatar
                        </button>
                    </div>
                </div>

                {/* Right Side: Chat Interface (60%) */}
                <div className="w-[60%] h-full relative z-10 flex flex-col justify-end">
                    <ChatInterface
                        onChat={handleChat}
                        initialHistory={chatHistory}
                        isThinking={status === "Thinking..."}
                        proactiveEmotion={proactiveEmotion}
                        onProactiveHandled={clearProactiveTrigger}
                        userName={userInfo.name}
                    />
                </div>
            </div>

            {/* Floating Glow Effects */}
            <div className="fixed -bottom-48 -left-48 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed -top-48 -right-48 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        </main>
    );
}
