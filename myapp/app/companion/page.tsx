/* eslint-disable */
"use client";

import { useState, useEffect, useCallback } from "react";
import { trackEvent } from "@/lib/analytics";
import ControlHUD from "@/components/spatial/ControlHUD";
import ChatOverlay from "@/components/spatial/ChatOverlay";
import GlassPanel from "@/components/spatial/GlassPanel";
import AvatarScene from "@/components/AvatarScene";
import MediaOverlay from "@/components/MediaOverlay";
import EmotionTracker from "@/components/spatial/EmotionTracker";
import dynamic from "next/dynamic";
import { useEmotionAI } from "@/hooks/useEmotionAI";
import { useProactiveCompanion } from "@/hooks/useProactiveCompanion";
import UserDashboard from "@/components/UserDashboard";
import { motion } from "framer-motion";
import FeedbackModal from "@/components/FeedbackModal";
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
        speak,
        proactiveEmotion,
        clearProactiveTrigger,
        videoRef,
        canvasRef,
        socketRef,
        emotionCount,
        getHistory
    } = useEmotionAI();

    // Proactive Companion System
    const {
        proactiveMessage,
        clearProactiveMessage,
        recordActivity,
        setTyping,
        setSpeaking,
    } = useProactiveCompanion(socketRef);

    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [userInfo, setUserInfo] = useState({
        name: "User", // Will be hydrated from localStorage/profile API
        interests: "",
        context: "",
        language: "English",
        personalityMode: "friend",
        custom_avatar_url: ""
    });
    
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [subscriptionTier, setSubscriptionTier] = useState("pro"); // DEFAULT TO PRO FOR LOCALHOST
    const [isMobile, setIsMobile] = useState(false);
    const [mobileMode, setMobileMode] = useState<'avatar_only' | 'chat_only' | 'unselected'>('unselected');

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchStatus = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;
            try {
                const res = await fetch("http://localhost:8000/api/payments/status", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSubscriptionTier(data.tier);
                    trackEvent("Companion Session Started", { tier: data.tier });
                }
                
                
                const profileRes = await fetch("http://localhost:8000/profile", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setUserInfo(prev => ({
                        ...prev, 
                        name: profileData.username || localStorage.getItem("userName") || "User",
                        language: profileData.language_preference || "English",
                        personalityMode: profileData.personality_mode || "friend",
                        custom_avatar_url: profileData.custom_avatar_url || ""
                    }));
                } else if (localStorage.getItem("userName")) {
                     setUserInfo(prev => ({ ...prev, name: localStorage.getItem("userName") || "User" }));
                }
            } catch (e) {
                 if (localStorage.getItem("userName")) {
                     setUserInfo(prev => ({ ...prev, name: localStorage.getItem("userName") || "User" }));
                 }
            }
        };
        fetchStatus();
    }, []);

    // Recommendation State
    const [recommendation, setRecommendation] = useState<any>(null);
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
    const [isTrackerOpen, setIsTrackerOpen] = useState(false);
    const [trackerData, setTrackerData] = useState<{ emotion: string; timestamp: string }[]>([]);

    // On-demand history loading (no auto-load for faster startup)
    const handleLoadHistory = useCallback(async () => {
        const history = await getHistory();
        if (history && history.length > 0) {
            const formatted = history.map((item: any) => ({
                role: item.role === "system" ? "ai" : "user",
                text: item.content
            }));
            setChatHistory(formatted);
            // Also build tracker data from emotion metadata
            const emotions = history
                .filter((item: any) => item.emotion)
                .map((item: any) => ({
                    emotion: item.emotion,
                    timestamp: item.timestamp || new Date().toISOString()
                }));
            setTrackerData(emotions);
            return formatted;
        }
        return [];
    }, [getHistory]);

    const handleOpenTracker = useCallback(async () => {
        // Load history data if not already loaded
        if (trackerData.length === 0) {
            await handleLoadHistory();
        }
        setIsTrackerOpen(true);
    }, [trackerData, handleLoadHistory]);

    const handleAvatarSelect = (id: string) => {
        trackEvent("Avatar Selected", { avatarId: id, tier: subscriptionTier });
        setSelectedAvatar(id);
    };

    const handleChat = async (messages: any[]) => {
        trackEvent("Chat Transmitted");
        recordActivity(); // Signal backend that user is active
        const response = await chat(messages, userInfo);
        if (response?.recommendation && response.recommendation.type !== "none") {
            setRecommendation(response.recommendation);
        }
        return response;
    };

    // Global Speech for Avatar-Only Mode
    const [isGlobalListening, setIsGlobalListening] = useState(false);
    const handleGlobalSpeech = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        
        recognition.onstart = () => setIsGlobalListening(true);
        recognition.onend = () => setIsGlobalListening(false);
        recognition.onerror = () => setIsGlobalListening(false);

        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;
            try {
                await handleChat([{ role: 'user', content: transcript }]);
            } catch (e) {
                console.error(e);
            }
        };
        recognition.start();
    };

    // Speak proactive messages when they arrive
    useEffect(() => {
        if (proactiveMessage && speak) {
            speak(proactiveMessage.message);
        }
    }, [proactiveMessage]);

    // Sync speaking state with backend trigger system
    useEffect(() => {
        setSpeaking(isSpeaking);
    }, [isSpeaking, setSpeaking]);

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
            <main className="min-h-screen w-full bg-[#020617] text-white flex flex-col items-center justify-start pt-24 pb-12 px-6 font-jura relative overflow-y-auto hidden-scrollbar perspective-[1000px]">
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

                        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.08] mix-blend-overlay" />
                    </div>
                )}

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                        opacity: 1, 
                        x: mousePosition.x * 0.2,
                        y: mousePosition.y * 0.2,
                    }}
                    className="z-10 text-center relative w-full"
                >
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="fixed top-6 sm:top-8 left-4 sm:left-8 z-[60] p-2 text-white/50 hover:text-white border border-white/10 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 bg-[#0a0a0f]/40 backdrop-blur-md"
                    >
                        <span className="text-xl leading-none">←</span> <span className="text-sm font-bold tracking-widest uppercase hidden sm:inline">Back</span>
                    </button>
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

    if (selectedAvatar && isMobile && mobileMode === 'unselected') {
        return (
            <main className="min-h-screen w-full bg-[#020617] text-white flex flex-col items-center justify-center p-6 font-jura relative overflow-hidden perspective-[1000px]">
                <div className="absolute top-12 sm:top-6 left-4 sm:left-6 z-[60]">
                    <button 
                        onClick={() => { setSelectedAvatar(null); setMobileMode('unselected'); }} 
                        className="p-2 text-white/50 hover:text-white border border-white/10 hover:bg-white/10 rounded-full flex items-center gap-2 bg-[#0a0a0f]/40 backdrop-blur-md transition-colors"
                    >
                        <span className="text-xl leading-none">←</span> <span className="text-sm font-bold tracking-widest uppercase">Back</span>
                    </button>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-wider uppercase text-center mt-12 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400">Select Interface Mode</h1>
                <p className="text-white/40 mb-12 text-sm text-center">Optimize your mobile experience</p>
                
                <div className="flex flex-col gap-6 w-full max-w-sm z-10">
                    <button 
                        onClick={() => setMobileMode('avatar_only')}
                        className="w-full bg-slate-900/60 backdrop-blur-md border border-indigo-500/30 p-8 rounded-[2rem] hover:bg-indigo-500/20 transition-all flex flex-col items-center gap-4 group"
                    >
                        <div className="text-5xl group-hover:scale-110 transition-transform">🧬</div>
                        <div className="text-xl font-bold tracking-widest uppercase text-white/90">Avatar + Voice</div>
                        <div className="text-xs text-white/50 text-center leading-relaxed">Immersive 3D companion with voice controls.<br/>Saves screen space.</div>
                    </button>

                    <button 
                        onClick={() => setMobileMode('chat_only')}
                        className="w-full bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 p-8 rounded-[2rem] hover:bg-emerald-500/20 transition-all flex flex-col items-center gap-4 group"
                    >
                        <div className="text-5xl group-hover:scale-110 transition-transform">💬</div>
                        <div className="text-xl font-bold tracking-widest uppercase text-white/90">Chat + Voice</div>
                        <div className="text-xs text-white/50 text-center leading-relaxed">Focus on conversation history.<br/>Saves immense battery.</div>
                    </button>
                </div>

                <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.08] mix-blend-overlay pointer-events-none" />
            </main>
        );
    }

    return (
        <main className="h-screen w-screen overflow-hidden bg-[#020205] text-white relative selection:bg-indigo-500/30 font-jura flex items-center justify-center perspective-[1000px]">

            {/* Global Initialization Overlay */}
            {!isConnected && selectedAvatar && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md pointer-events-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center text-center p-8 bg-[#0a0a0f] border border-white/10 rounded-[2rem] shadow-2xl max-w-sm w-full mx-4"
                    >
                        <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
                            <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <h2 className="text-2xl font-bold uppercase tracking-widest mb-2">Establish Link</h2>
                        <p className="text-white/50 text-sm mb-4">Initialize webcam and neural engine to begin your session.</p>
                        
                        <div className="mb-6 px-6 py-2 bg-white/5 rounded-full border border-white/10">
                            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">{status}</span>
                        </div>
                        <button 
                            onClick={startSystem}
                            className="w-full py-4 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-bold uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] transition-all transform hover:scale-105"
                        >
                            Initialize System
                        </button>
                    </motion.div>
                </div>
            )}

            {/* Back Button */}
            <div className="absolute top-12 sm:top-6 left-4 sm:left-6 z-[60] pointer-events-auto">
                <button 
                    onClick={() => window.location.href = '/'}
                    className="p-2 px-4 text-white/50 hover:text-white border border-white/10 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 bg-[#0a0a0f]/40 backdrop-blur-md"
                >
                    <span className="text-xl leading-none">←</span> <span className="text-xs font-bold tracking-widest uppercase hidden sm:inline">Home</span>
                </button>
            </div>

            {/* Hidden Camera Stream & Processing Buffer */}
            <video ref={videoRef} autoPlay playsInline muted className="fixed top-0 left-0 w-full h-full opacity-0 pointer-events-none object-contain z-[-1]" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Ambient Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#020205_100%)] z-10 opacity-70" />
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-20 filter grayscale brightness-50"
                >
                    <source src="/background.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-tr from-[#020205] via-transparent to-[#020205]" />
            </div>

            {/* UI Overlays (Recommendations, FaceScanner, Profile) */}
            <div className="absolute inset-0 z-50 pointer-events-none">
                {recommendation && (
                    <div className="pointer-events-auto">
                        <MediaOverlay 
                            type={recommendation.type} 
                            query={recommendation.query}
                            music_url={recommendation.music_url}
                            movie_query={recommendation.movie_query}
                            onClose={() => setRecommendation(null)} 
                        />
                    </div>
                )}
                
                <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto scale-75 origin-top opacity-30 hover:opacity-100 transition-opacity">
                    <FaceScanner videoRef={videoRef} isConnected={isConnected} emotionCount={emotionCount} />
                </div>
                
                <div className="pointer-events-auto">
                    <UserDashboard
                        isOpen={isProfileOpen}
                        onClose={() => setIsProfileOpen(false)}
                        currentInfo={userInfo}
                        onSave={async (info) => {
                            setUserInfo(prev => ({ ...prev, ...info }));
                            localStorage.setItem("auraa_language", info.language);
                            localStorage.setItem("auraa_personality", info.personalityMode);
                            try {
                                const token = localStorage.getItem("token") || localStorage.getItem("auraa_token");
                                if (token) {
                                    await fetch("http://localhost:8000/profile/update", {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                            "Authorization": `Bearer ${token}`
                                        },
                                        body: JSON.stringify({ 
                                            language: info.language,
                                            personality_mode: info.personalityMode 
                                        })
                                    });
                                }
                            } catch (e) {
                                console.error("Failed to sync language preference", e);
                            }
                        }}
                    />
                </div>
                <div className="pointer-events-auto">
                    <EmotionTracker
                        isOpen={isTrackerOpen}
                        onClose={() => setIsTrackerOpen(false)}
                        data={trackerData}
                        subscriptionTier={subscriptionTier}
                    />
                </div>
            </div>

            {/* STRICT 3-COLUMN SPATIAL LAYOUT */}
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between p-4 sm:p-6 lg:p-6 xl:p-12 2xl:p-24 w-full h-screen max-w-[2500px] mx-auto overflow-y-auto lg:overflow-hidden hidden-scrollbar">
                
                {(!isMobile || mobileMode === 'avatar_only') && (
                    <>
                        {/* Left Panel: Control HUD */}
                        <div className="pointer-events-auto w-full max-w-[340px] lg:max-w-[280px] xl:max-w-[320px] 2xl:max-w-[380px] h-auto lg:h-[70vh] xl:h-[75vh] flex-shrink-0 shadow-2xl order-2 lg:order-1 mt-8 lg:mt-0 pb-16 lg:pb-0">
                            <GlassPanel tilt className="w-full h-full p-1 border border-white/5 rounded-[2rem] lg:rounded-[2.2rem]">
                                <div className="w-full h-[60vh] lg:h-full bg-[#0a0a0f]/40 rounded-[1.8rem] lg:rounded-[2rem] p-4 sm:p-6 lg:p-5 2xl:p-8 backdrop-blur-3xl shadow-inner border border-white/5 overflow-y-auto custom-scrollbar">
                                    <ControlHUD 
                                        emotion={emotion || "Neutral"} 
                                        status={status} 
                                        isSpeaking={isSpeaking}
                                        onSettingsClick={() => setSelectedAvatar(null)} 
                                        isConnected={isConnected}
                                        onStart={startSystem}
                                        availableVoices={availableVoices}
                                        selectedVoice={selectedVoice}
                                        onVoiceChange={setSelectedVoice}
                                        onManualEmotion={setEmotion}
                                        onOpenProfile={() => setIsProfileOpen(true)}
                                        onOpenTracker={handleOpenTracker}
                                        onTriggerProactive={() => {
                                            trackEvent("Neural Pulse Triggered", { avatar: selectedAvatar });
                                            if (socketRef.current?.connected) {
                                                socketRef.current.emit("trigger_proactive", {});
                                            }
                                        }}
                                    />
                                </div>
                            </GlassPanel>
                        </div>

                        {/* Middle: Strict Dedicated 3D Avatar Area (NEVER overlays) */}
                        <div className="flex-1 w-full h-[55vh] lg:h-full relative flex items-center justify-center pointer-events-none order-1 lg:order-2 self-stretch">
                            <div className="absolute inset-0 lg:-inset-8 xl:-inset-16 2xl:-inset-24 flex items-center justify-center">
                                <AvatarScene emotion={emotion} isSpeaking={isSpeaking} avatarId={selectedAvatar || "classic"} customAvatarUrl={userInfo.custom_avatar_url} />
                            </div>
                        </div>
                    </>
                )}

                {(!isMobile || mobileMode === 'chat_only') && (
                    <div className="pointer-events-auto w-full max-w-[380px] lg:max-w-[340px] xl:max-w-[380px] 2xl:max-w-[480px] h-auto lg:h-[80vh] xl:h-[85vh] flex-shrink-0 shadow-2xl order-3 lg:order-3 mt-8 lg:mt-0 mb-20 lg:mb-0">
                        {/* Right Panel: Chat */}
                        <GlassPanel tilt className="w-full h-full p-1 border border-white/5 rounded-[2rem] lg:rounded-[2.2rem]">
                            <div className="w-full h-[65vh] lg:h-full bg-[#0a0a0f]/40 rounded-[1.8rem] lg:rounded-[2rem] p-4 sm:p-6 lg:p-5 2xl:p-8 backdrop-blur-3xl shadow-inner border border-white/5 overflow-hidden">
                                <ChatOverlay 
                                    onChat={handleChat} 
                                    initialHistory={chatHistory} 
                                    proactiveEmotion={proactiveEmotion}
                                    onProactiveHandled={clearProactiveTrigger}
                                    onLoadHistory={handleLoadHistory}
                                    proactiveContent={proactiveMessage}
                                    onProactiveContentHandled={clearProactiveMessage}
                                    onTyping={setTyping}
                                />
                            </div>
                        </GlassPanel>
                    </div>
                )}
            </div>

            {/* Global Avatar-Only Mic Button */}
            {isMobile && mobileMode === 'avatar_only' && isConnected && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[80] pointer-events-auto">
                    <button 
                        onClick={handleGlobalSpeech}
                        className={`p-6 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/20 transition-all ${isGlobalListening ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110 shadow-[0_0_40px_rgba(239,68,68,0.6)]' : 'bg-[#0a0a0f]/80 backdrop-blur-md hover:bg-white/10 hover:scale-105'}`}
                    >
                        <div className="text-3xl">{isGlobalListening ? '🎙️' : '🎤'}</div>
                    </button>
                    {isGlobalListening && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold uppercase tracking-widest text-red-400 animate-pulse">
                            Listening...
                        </div>
                    )}
                </div>
            )}

            {/* Floating Action Buttons */}
            <div className="fixed bottom-24 right-6 z-50 pointer-events-auto flex flex-col items-end gap-3">
                <button 
                    onClick={() => setIsFeedbackOpen(true)}
                    className="group flex flex-row items-center gap-2 px-4 py-3 bg-[#0a0a0f]/80 backdrop-blur-md border border-white/10 hover:border-indigo-500/50 rounded-full shadow-xl transition-all hover:scale-105"
                >
                    <span className="text-[10px] font-bold tracking-widest uppercase text-white/70 group-hover:text-white max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap hidden sm:inline-block">
                        Rate Experience
                    </span>
                    <span className="text-yellow-400 text-lg group-hover:rotate-12 transition-transform">⭐</span>
                </button>
        </div>
            <FeedbackModal 
                isOpen={isFeedbackOpen} 
                onClose={() => setIsFeedbackOpen(false)} 
                sessionEmotion={emotion || "Neutral"}
            />

            {/* Floating Glow Effects */}
            <div className="fixed -bottom-48 -left-48 w-96 h-96 bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="fixed -top-48 -right-48 w-96 h-96 bg-cyan-600/10 blur-[150px] rounded-full pointer-events-none" />
        </main>
    );
}
