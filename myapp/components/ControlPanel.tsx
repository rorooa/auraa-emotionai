"use client";

import { useTheme } from "next-themes";
import { Mic, Moon, Sun, Zap, User } from "lucide-react";
import { cn } from "@/lib/utils";
import AudioVisualizer from "./AudioVisualizer";

interface ControlPanelProps {
    status: string;
    emotion: string;
    onStart: () => void;
    isConnected: boolean;
    isSpeaking: boolean;
    onManualEmotion?: (emotion: string) => void;
    onOpenProfile: () => void;
}

export default function ControlPanel({ status, emotion, onStart, isConnected, isSpeaking, onManualEmotion, onOpenProfile }: ControlPanelProps) {
    const { theme, setTheme } = useTheme();

    return (
        <aside className="w-full md:w-80 h-auto md:h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-between shadow-2xl transition-all duration-300 font-jura">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                        <Zap size={24} fill="currentColor" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-300 tracking-tighter">
                        AURAA
                    </h1>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Status</p>
                    <div className="flex items-center gap-2 mb-4">
                        <span className={cn("h-2 w-2 rounded-full animate-pulse", isConnected ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-rose-500")} />
                        <span className="text-sm font-semibold text-slate-200">{status}</span>
                    </div>

                    {/* Visualizer */}
                    <AudioVisualizer isActive={isSpeaking} />
                </div>
            </div>

            {/* Main Stats */}
            <div className="py-8 text-center bg-slate-800/20 rounded-3xl border border-white/5 backdrop-blur-md">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-2">Current Emotion</p>
                <div className="text-4xl font-bold capitalize transition-all duration-500 ease-out text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">
                    {emotion}
                </div>
                {/* Decorative bar */}
                <div className="h-0.5 w-12 mx-auto mt-4 rounded-full bg-indigo-500/50" />

                {/* DEBUG CONTROLS (Simulate Emotions) */}
                <div className="mt-8 grid grid-cols-2 gap-2 px-4">
                    <button
                        onClick={() => onManualEmotion && onManualEmotion("sad")}
                        className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all"
                    >
                        Sad
                    </button>
                    <button
                        onClick={() => onManualEmotion && onManualEmotion("happy")}
                        className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all"
                    >
                        Happy
                    </button>
                    <button
                        onClick={() => onManualEmotion && onManualEmotion("angry")}
                        className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all"
                    >
                        Angry
                    </button>
                    <button
                        onClick={() => onManualEmotion && onManualEmotion("fear")}
                        className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 transition-all"
                    >
                        Fear
                    </button>
                </div>
            </div>


            {/* Footer / Controls */}
            <div className="space-y-4">
                <button
                    onClick={onOpenProfile}
                    className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                    <User size={16} />
                    Edit Profile
                </button>

                {!isConnected && (
                    <button
                        onClick={onStart}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-95"
                    >
                        Initialize System
                    </button>
                )}

                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    Toggle Theme
                </button>
            </div>
        </aside >
    );
}
