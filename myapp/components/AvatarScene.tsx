"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, ContactShadows } from "@react-three/drei";
import AIAvatar from "./AIAvatar";

// ─────────────────────────────────────────────────────────────────────────────
// EMOTION → VISUAL CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const EMOTION_VISUALS: Record<string, { color: string; glow: string; eyeShape: string; mouthShape: string }> = {
    neutral: { color: "#00d4ff", glow: "0 0 60px rgba(0,212,255,0.4)", eyeShape: "rounded-full", mouthShape: "w-6 h-1.5 rounded-full" },
    happy:   { color: "#00ffaa", glow: "0 0 60px rgba(0,255,170,0.5)", eyeShape: "rounded-full scale-y-50", mouthShape: "w-8 h-4 rounded-b-full border-t-0 border-2" },
    sad:     { color: "#4488ff", glow: "0 0 60px rgba(68,136,255,0.5)", eyeShape: "rounded-full scale-y-75", mouthShape: "w-6 h-3 rounded-t-full border-b-0 border-2 translate-y-1" },
    angry:   { color: "#ff3344", glow: "0 0 60px rgba(255,51,68,0.5)", eyeShape: "rounded-sm -rotate-6", mouthShape: "w-8 h-1 rounded-full" },
    fear:    { color: "#bb66ff", glow: "0 0 60px rgba(187,102,255,0.5)", eyeShape: "rounded-full scale-125", mouthShape: "w-4 h-4 rounded-full border-2" },
    disgust: { color: "#88cc00", glow: "0 0 60px rgba(136,204,0,0.5)", eyeShape: "rounded-full scale-y-50 -rotate-3", mouthShape: "w-7 h-2 rounded-full skew-x-6" },
    surprise:{ color: "#ffffff", glow: "0 0 60px rgba(255,255,255,0.5)", eyeShape: "rounded-full scale-125", mouthShape: "w-5 h-5 rounded-full border-2" },
};

// ─────────────────────────────────────────────────────────────────────────────
// CUTE CSS BOT AVATAR
// ─────────────────────────────────────────────────────────────────────────────
export default function AvatarScene({ emotion, isSpeaking, avatarId = "classic", customAvatarUrl }: { emotion: string; isSpeaking: boolean; avatarId?: string; customAvatarUrl?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
    const [isBlinking, setIsBlinking] = useState(false);

    // Mouse tracking for eye follow
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const x = ((e.clientX - cx) / (window.innerWidth / 2)) * 8;
        const y = ((e.clientY - cy) / (window.innerHeight / 2)) * 5;
        setMouseOffset({ x: Math.max(-8, Math.min(8, x)), y: Math.max(-5, Math.min(5, y)) });
    }, []);

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [handleMouseMove]);

    // Random blinking
    useEffect(() => {
        const blink = () => {
            setIsBlinking(true);
            setTimeout(() => setIsBlinking(false), 150);
        };
        const interval = setInterval(() => {
            if (Math.random() > 0.6) blink();
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    const normalizedEmotion = emotion?.toLowerCase() || "neutral";
    const visuals = EMOTION_VISUALS[normalizedEmotion] || EMOTION_VISUALS.neutral;

    if (avatarId === "ai" || avatarId === "custom") {
        const modelUrl = (avatarId === "custom" && customAvatarUrl) ? customAvatarUrl : "/models/ai_avatar.glb";
        return (
            <div className="w-full h-full flex items-center justify-center">
                <Canvas camera={{ position: [0, 0.5, 4.5], fov: 35 }}>
                    {/* Strong ambient light to completely fix the 'dullness' */}
                    <ambientLight intensity={1.5} />
                    
                    {/* Strong Front Key Light */}
                    <directionalLight position={[0, 2, 5]} intensity={2.5} color="#ffffff" />
                    
                    {/* Vivid Rim Lights */}
                    <directionalLight position={[-3, 2, -5]} intensity={2.5} color="#a855f7" /> 
                    <directionalLight position={[3, 2, -5]} intensity={2.5} color="#3b82f6" />
                    
                    <Environment preset="city" />
                    <ContactShadows position={[0, -1.2, 0]} opacity={0.6} scale={10} blur={2.5} far={4} />
                    
                    {/* Force-scale the model geometry to physically enlarge it */}
                    <group scale={3.5} position={[0, -1.8, 0]}>
                        <AIAvatar 
                            modelPath={modelUrl} 
                            emotion={normalizedEmotion} 
                            isSpeaking={isSpeaking} 
                        />
                    </group>

                    <OrbitControls 
                        target={[0, 1.5, 0]}
                        enableZoom={false} 
                        enablePan={false}
                        minPolarAngle={Math.PI / 2.5}
                        maxPolarAngle={Math.PI / 2}
                    />
                </Canvas>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center select-none">
            <div className="bot-float relative" style={{ filter: `drop-shadow(${visuals.glow})` }}>
                
                {/* ── ANTENNA ── */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-8 flex flex-col items-center z-10">
                    <div 
                        className="w-4 h-4 rounded-full bot-antenna-pulse"
                        style={{ backgroundColor: visuals.color, boxShadow: `0 0 20px ${visuals.color}` }}
                    />
                    <div className="w-0.5 h-6 bg-gradient-to-b from-white/40 to-transparent" />
                </div>

                {/* ── HEAD ── */}
                <div 
                    className="relative w-44 h-36 rounded-[2.5rem] border border-white/20 flex items-center justify-center overflow-hidden"
                    style={{ 
                        background: "linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(10,10,30,0.95) 100%)",
                        boxShadow: `inset 0 -20px 40px rgba(0,0,0,0.3), 0 0 30px rgba(0,0,0,0.5), ${visuals.glow}`
                    }}
                >
                    {/* Glass Reflection */}
                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent rounded-t-[2.5rem]" />
                    
                    {/* Face Container */}
                    <div className="relative flex items-center gap-8 -mt-1">
                        {/* Left Eye */}
                        <div 
                            className={`relative transition-all duration-300 ${isBlinking ? 'scale-y-0' : ''}`}
                            style={{ transform: `translate(${mouseOffset.x}px, ${mouseOffset.y}px) ${isBlinking ? 'scaleY(0.1)' : ''}` }}
                        >
                            <div 
                                className={`w-5 h-5 transition-all duration-500 ${visuals.eyeShape}`}
                                style={{ backgroundColor: visuals.color, boxShadow: `0 0 15px ${visuals.color}` }}
                            />
                        </div>
                        {/* Right Eye */}
                        <div 
                            className={`relative transition-all duration-300 ${isBlinking ? 'scale-y-0' : ''}`}
                            style={{ transform: `translate(${mouseOffset.x}px, ${mouseOffset.y}px) ${isBlinking ? 'scaleY(0.1)' : ''}` }}
                        >
                            <div 
                                className={`w-5 h-5 transition-all duration-500 ${visuals.eyeShape}`}
                                style={{ backgroundColor: visuals.color, boxShadow: `0 0 15px ${visuals.color}` }}
                            />
                        </div>
                    </div>

                    {/* Mouth */}
                    <div className="absolute bottom-7 left-1/2 -translate-x-1/2">
                        <div 
                            className={`transition-all duration-300 ${visuals.mouthShape} ${isSpeaking ? 'bot-speak' : ''}`}
                            style={{ 
                                borderColor: visuals.color,
                                backgroundColor: isSpeaking ? visuals.color : 'transparent',
                                opacity: isSpeaking ? 0.8 : 0.6,
                                boxShadow: isSpeaking ? `0 0 10px ${visuals.color}` : 'none'
                            }}
                        />
                    </div>
                </div>

                {/* ── EARS / SIDE NODES ── */}
                <div 
                    className="absolute -left-3 top-1/3 w-4 h-8 rounded-l-full border border-white/10"
                    style={{ background: 'rgba(15,23,42,0.8)', boxShadow: `inset 2px 0 8px ${visuals.color}30` }}
                />
                <div 
                    className="absolute -right-3 top-1/3 w-4 h-8 rounded-r-full border border-white/10"
                    style={{ background: 'rgba(15,23,42,0.8)', boxShadow: `inset -2px 0 8px ${visuals.color}30` }}
                />

                {/* ── NECK ── */}
                <div className="flex justify-center">
                    <div className="w-10 h-4 bg-gradient-to-b from-slate-800 to-slate-900 border-x border-white/5" />
                </div>

                {/* ── BODY ── */}
                <div 
                    className="relative w-52 h-32 rounded-[2rem] rounded-t-xl border border-white/15 flex items-center justify-center overflow-hidden mx-auto"
                    style={{ 
                        background: "linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(20,30,60,0.9) 100%)",
                        boxShadow: `0 20px 40px rgba(0,0,0,0.4), ${visuals.glow}`
                    }}
                >
                    {/* Body Reflection */}
                    <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-white/5 to-transparent" />
                    
                    {/* Core Energy Circle */}
                    <div className="relative bot-breathe">
                        <div 
                            className="w-12 h-12 rounded-full border-2 flex items-center justify-center"
                            style={{ 
                                borderColor: `${visuals.color}60`,
                                boxShadow: `0 0 30px ${visuals.color}40, inset 0 0 15px ${visuals.color}20`
                            }}
                        >
                            <div 
                                className="w-5 h-5 rounded-full"
                                style={{ 
                                    backgroundColor: visuals.color,
                                    boxShadow: `0 0 20px ${visuals.color}, 0 0 40px ${visuals.color}60`
                                }}
                            />
                        </div>
                    </div>

                    {/* Chest Accent Lines */}
                    <div className="absolute bottom-4 left-6 right-6 flex gap-2 justify-center">
                        {[...Array(3)].map((_, i) => (
                            <div 
                                key={i} 
                                className="h-0.5 rounded-full opacity-30"
                                style={{ width: `${30 - i * 8}px`, backgroundColor: visuals.color }}
                            />
                        ))}
                    </div>
                </div>

                {/* ── ARMS ── */}
                <div className="absolute -left-7 top-[11.5rem] flex flex-col items-center">
                    <div 
                        className="w-5 h-16 rounded-full border border-white/10"
                        style={{ 
                            background: "linear-gradient(180deg, rgba(15,23,42,0.8), rgba(30,40,70,0.8))",
                            transform: "rotate(10deg)",
                            boxShadow: visuals.glow
                        }}
                    />
                    <div 
                        className="w-6 h-6 rounded-full border border-white/10 -mt-1"
                        style={{ background: "rgba(15,23,42,0.8)" }}
                    />
                </div>
                <div className="absolute -right-7 top-[11.5rem] flex flex-col items-center">
                    <div 
                        className="w-5 h-16 rounded-full border border-white/10"
                        style={{ 
                            background: "linear-gradient(180deg, rgba(15,23,42,0.8), rgba(30,40,70,0.8))",
                            transform: "rotate(-10deg)",
                            boxShadow: visuals.glow
                        }}
                    />
                    <div 
                        className="w-6 h-6 rounded-full border border-white/10 -mt-1"
                        style={{ background: "rgba(15,23,42,0.8)" }}
                    />
                </div>

                {/* ── EMOTION LABEL ── */}
                <div className="flex justify-center mt-4">
                    <span 
                        className="text-[9px] uppercase tracking-[0.4em] font-bold px-4 py-1.5 rounded-full border backdrop-blur-md"
                        style={{ 
                            color: visuals.color, 
                            borderColor: `${visuals.color}30`,
                            backgroundColor: `${visuals.color}10`,
                            textShadow: `0 0 10px ${visuals.color}`
                        }}
                    >
                        {normalizedEmotion}
                    </span>
                </div>
            </div>
        </div>
    );
}
