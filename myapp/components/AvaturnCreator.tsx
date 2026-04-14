"use client";

import { useState } from "react";
import { X, CheckCircle, Link } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AvaturnCreatorProps {
    isOpen: boolean;
    onClose: () => void;
    onUrlReceived: (url: string) => void;
}

export default function AvaturnCreator({ isOpen, onClose, onUrlReceived }: AvaturnCreatorProps) {
    const [urlInput, setUrlInput] = useState("");
    const [fileInput, setFileInput] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fileInput && (!urlInput.trim() || !urlInput.endsWith(".glb"))) {
            alert("Please provide a valid .glb URL or upload a .glb file.");
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem("auraa_token");
            
            let finalUrl = urlInput.trim();

            if (token) {
                if (fileInput) {
                    // Handle File Upload
                    const formData = new FormData();
                    formData.append("file", fileInput);

                    const res = await fetch("/api/profile/upload_avatar", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`
                        },
                        body: formData
                    });

                    if (res.ok) {
                        const data = await res.json();
                        finalUrl = data.custom_avatar_url;
                    } else {
                        throw new Error("Failed to upload avatar");
                    }
                } else {
                    // Handle URL Link
                    const res = await fetch("/api/profile/custom_avatar", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ glb_url: finalUrl })
                    });
                    if (!res.ok) throw new Error("Failed to link avatar URL");
                }

                onUrlReceived(finalUrl);
                onClose();
            } else {
                if (fileInput) {
                    // Guest user file upload
                    const formData = new FormData();
                    formData.append("file", fileInput);
                    const res = await fetch("/api/profile/upload_avatar", { method: "POST", body: formData });
                    if (res.ok) {
                        const data = await res.json();
                        onUrlReceived(data.custom_avatar_url);
                    }
                } else {
                    onUrlReceived(finalUrl);
                }
                onClose();
            }
        } catch (error) {
            console.error("Failed to link custom avatar", error);
            alert("Error linking avatar.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md font-jura"
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-[#05050A] border border-emerald-500/20 rounded-3xl p-8 overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)]"
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <h2 className="text-2xl font-bold uppercase tracking-widest text-emerald-400 mb-2">Avaturn Core Linker</h2>
                    <p className="text-sm text-white/60 mb-6 leading-relaxed">
                        Bind your custom 3D neural twin to AURAA. We natively support T2 ARKit blendshapes from platforms like <strong>Avaturn</strong> or <strong>Ready Player Me</strong>.
                    </p>

                    <details className="mb-8">
                        <summary className="cursor-pointer text-emerald-400 text-xs tracking-widest uppercase mb-2">How to get your .glb (Click to expand)</summary>
                        <ol className="list-decimal list-inside text-xs text-white/70 space-y-3 bg-white/5 p-4 rounded-xl border border-white/5 mt-2">
                            <li>Go to <a href="https://avaturn.me" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">avaturn.me</a> or <a href="https://readyplayer.me" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">readyplayer.me</a>.</li>
                            <li>Create your personalized 3D avatar.</li>
                            <li>Export the model and <strong>Download the .glb file</strong> or copy its public URL.</li>
                            <li>Upload the downloaded file or paste the link below establishing a neural link.</li>
                        </ol>
                    </details>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <label className="flex-1 cursor-pointer bg-[#0a0a0f] border border-emerald-500/20 hover:border-emerald-500/50 rounded-xl p-4 flex flex-col items-center justify-center transition-colors text-center">
                                <span className="text-emerald-500/80 mb-1 text-sm">{fileInput ? fileInput.name : "Upload .glb File"}</span>
                                <span className="text-white/30 text-[10px] uppercase tracking-widest">{fileInput ? "Ready to sync" : "Drag or Click"}</span>
                                <input 
                                    type="file" 
                                    accept=".glb" 
                                    className="hidden" 
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setFileInput(e.target.files[0]);
                                            setUrlInput(""); // Clear URL if file selected
                                        }
                                    }}
                                />
                            </label>
                            
                            <div className="flex items-center justify-center text-white/20 text-xs font-bold uppercase">OR</div>
                            
                            <div className="relative flex items-center flex-1">
                                <Link size={16} className="absolute left-4 text-emerald-500/50" />
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={(e) => {
                                        setUrlInput(e.target.value);
                                        setFileInput(null); // Clear file if URL typed
                                    }}
                                    placeholder="Paste .glb URL"
                                    className="w-full bg-[#0a0a0f] border border-emerald-500/20 rounded-xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-white/20 h-full"
                                    disabled={!!fileInput}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || (!urlInput.trim() && !fileInput)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-widest py-4 rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Linking..." : "Establish Neural Link"}
                            {!isSubmitting && <CheckCircle size={18} />}
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
