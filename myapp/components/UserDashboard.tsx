"use client";

import { useState } from "react";
import { User, Save, X } from "lucide-react";

interface UserInfo {
    name: string;
    interests: string;
    context: string;
    language: string;
    personalityMode: string;
}

interface UserDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    currentInfo: UserInfo;
    onSave: (info: UserInfo) => void;
}

export default function UserDashboard({ isOpen, onClose, currentInfo, onSave }: UserDashboardProps) {
    const [formData, setFormData] = useState(currentInfo);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200 font-jura">
            <div className="bg-slate-900/90 border border-white/10 p-8 rounded-[2rem] w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-50" />

                <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all">
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-slate-100">
                    <User className="text-indigo-400" />
                    User Profile
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-slate-400">Identity</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-xl px-4 py-3.5 outline-none transition-all text-slate-100 placeholder-slate-600 font-medium"
                            placeholder="What should I call you?"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-slate-400">Interests & Hobbies</label>
                        <textarea
                            value={formData.interests}
                            onChange={e => setFormData({ ...formData, interests: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-xl px-4 py-3.5 outline-none transition-all h-28 resize-none text-slate-100 placeholder-slate-600 font-medium"
                            placeholder="e.g. Astrophysics, Deep Learning, Jazz..."
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-slate-400">Current Context</label>
                        <input
                            type="text"
                            value={formData.context}
                            onChange={e => setFormData({ ...formData, context: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-xl px-4 py-3.5 outline-none transition-all text-slate-100 placeholder-slate-600 font-medium"
                            placeholder="How is your day going?"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-slate-400">Preferred Language</label>
                        <select
                            value={formData.language}
                            onChange={e => setFormData({ ...formData, language: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-xl px-4 py-3.5 outline-none transition-all text-slate-100 font-medium appearance-none"
                        >
                            <option value="English" className="bg-slate-900">English</option>
                            <option value="Spanish" className="bg-slate-900">Español</option>
                            <option value="French" className="bg-slate-900">Français</option>
                            <option value="German" className="bg-slate-900">Deutsch</option>
                            <option value="Japanese" className="bg-slate-900">日本語</option>
                            <option value="Hindi" className="bg-slate-900">हिंदी</option>
                            <option value="Korean" className="bg-slate-900">한국어</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-rose-400">Personality Core (Pro)</label>
                        <select
                            value={formData.personalityMode}
                            onChange={e => setFormData({ ...formData, personalityMode: e.target.value })}
                            className="w-full bg-rose-500/10 border border-rose-500/30 focus:border-rose-500/70 rounded-xl px-4 py-3.5 outline-none transition-all text-white font-medium appearance-none"
                        >
                            <option value="friend" className="bg-slate-900">Best Friend (Casual)</option>
                            <option value="therapist" className="bg-slate-900">Therapist (Empathetic)</option>
                            <option value="sassy" className="bg-slate-900">Sassy (Gen-Z & Witty)</option>
                            <option value="philosopher" className="bg-slate-900">Philosopher (Deep)</option>
                            <option value="mentor" className="bg-slate-900">Mentor (Direct & Motivating)</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 group"
                    >
                        <Save size={18} className="group-hover:scale-110 transition-transform" />
                        Update Profile
                    </button>
                </form>
            </div>
        </div>
    );
}
