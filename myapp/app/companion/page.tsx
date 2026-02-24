"use client";

import { useState, useEffect } from "react";
import ControlPanel from "@/components/ControlPanel";
import ChatInterface from "@/components/ChatInterface";
import AvatarScene from "@/components/AvatarScene";
import MediaOverlay from "@/components/MediaOverlay";
import { useEmotionAI } from "@/hooks/useEmotionAI";
import UserDashboard from "@/components/UserDashboard";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function CompanionPage() {
    const router = useRouter();
    const {
        emotion,
        status,
        isSpeaking,
        isConnected,
        startSystem,
        chat,
        greet,
        videoRef,
        canvasRef,
        proactiveEmotion,
        clearProactiveTrigger,
        setEmotion
    } = useEmotionAI();

    const [recommendation, setRecommendation] = useState<any>(null);
    const [userInfo, setUserInfo] = useState({ name: "User", interests: "", context: "" });
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // Avatar Selection State
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

    // Sync user info and avatar choice from localStorage
    useEffect(() => {
        const savedName = localStorage.getItem("userName") || "User";
        const savedAvatar = localStorage.getItem("userAvatar");
        setUserInfo(prev => ({ ...prev, name: savedName }));

        if (savedAvatar) {
            setSelectedAvatar(savedAvatar);
        }

        const timer = setTimeout(() => {
            greet(savedName);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    const handleAvatarSelect = (id: string) => {
        setSelectedAvatar(id);
        localStorage.setItem("userAvatar", id);
    };

    const handleChat = async (messages: { role: string; content: string }[]) => {
        const response = await chat(messages, userInfo);
        if (response && response.recommendation && response.recommendation.type !== "none") {
            setRecommendation(response.recommendation);
        }
        return response;
    };

    // -------------------------------------------------------------------------
    // 🎭 AVATAR SELECTION SCREEN
    // -------------------------------------------------------------------------
    if (!selectedAvatar) {
        return (
            <main className="h-screen w-screen overflow-hidden bg-[#020617] text-white flex flex-col items-center justify-center p-8 font-jura relative">
                <div className="absolute inset-0 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

                <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 text-center">
                    SELECT YOUR COMPANION
                </h1>
                <p className="text-white/40 mb-12 text-lg">Choose the visual interface for AURAA</p>

                <div className="flex flex-col md:flex-row gap-8 z-10 w-full max-w-4xl">
                    {/* Avatar 1 Card */}
                    <div
                        onClick={() => handleAvatarSelect("avatar1")}
                        className="flex-1 group cursor-pointer bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-500 text-center"
                    >
                        <div className="w-full h-48 mb-6 bg-gradient-to-b from-blue-500/20 to-transparent rounded-2xl flex items-center justify-center overflow-hidden">
                            <div className="text-blue-400 group-hover:scale-110 transition-transform duration-500">
                                <span className="text-6xl">👤</span>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-400 transition-colors uppercase">Avatar 1</h2>
                        <p className="text-white/40 text-sm">Full-bodied Humanoid (Claudia)<br />High-density Blue Wireframe</p>
                    </div>

                    {/* Avatar 2 Card */}
                    <div
                        onClick={() => handleAvatarSelect("avatar2")}
                        className="flex-1 group cursor-pointer bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-500 text-center"
                    >
                        <div className="w-full h-48 mb-6 bg-gradient-to-b from-indigo-500/20 to-transparent rounded-2xl flex items-center justify-center">
                            <div className="text-indigo-400 group-hover:scale-110 transition-transform duration-500">
                                <span className="text-6xl">🤖</span>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold mb-2 group-hover:text-indigo-400 transition-colors uppercase">Classic Bot</h2>
                        <p className="text-white/40 text-sm">Experimental Core (Archive)<br />Reactive Multi-color Eyes & Mouth</p>
                    </div>
                </div>

                <div className="mt-12 text-white/20 text-xs tracking-widest uppercase">
                    Neural Protocol v2.5.0
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
                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                >
                    <source src="/background.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            </div>

            {/* Header Controls */}
            <div className="absolute top-8 left-8 z-50 flex gap-4">
                <button
                    onClick={() => router.push("/")}
                    className="p-3 bg-white/5 backdrop-blur-xl border border-white/20 rounded-full hover:bg-white/20 transition-all text-white shadow-2xl group"
                    title="Back to Dashboard"
                >
                    <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Hidden Elements for Processing */}
            <div className="absolute opacity-0 pointer-events-none">
                <video ref={videoRef} autoPlay playsInline muted />
                <canvas ref={canvasRef} />
            </div>

            {/* Media Overlay */}
            {recommendation && (
                <MediaOverlay
                    type={recommendation.type}
                    query={recommendation.query}
                    onClose={() => setRecommendation(null)}
                />
            )}

            <UserDashboard
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                currentInfo={userInfo}
                onSave={(info) => {
                    setUserInfo(info);
                    localStorage.setItem("userName", info.name);
                }}
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
                />
            </div>

            {/* Main 3D Stage */}
            <div className="flex-1 relative rounded-3xl overflow-hidden border border-white/10 shadow-inner bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-sm">

                {/* 3D Canvas */}
                <div className="absolute inset-0 z-0">
                    <AvatarScene emotion={emotion} isSpeaking={isSpeaking} avatarId={selectedAvatar || "avatar1"} />
                </div>

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

                {/* Bottom Interaction Bar */}
                <ChatInterface
                    onChat={handleChat}
                    isThinking={status === "Thinking..."}
                    proactiveEmotion={proactiveEmotion}
                    onProactiveHandled={clearProactiveTrigger}
                />
            </div>

            {/* Background Ambient Glows */}
            <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
        </main>
    );
}
