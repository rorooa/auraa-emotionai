"use client";

import { useRazorpay } from "@/hooks/useRazorpay";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { trackCheckoutStep } from "@/lib/analytics";

export default function PricingPage() {
    const { processPayment } = useRazorpay();
    const router = useRouter();
    const [currentTier, setCurrentTier] = useState("free");
    const [loadingTier, setLoadingTier] = useState<string | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            const token = localStorage.getItem("auraa_token");
            if (!token) return;
            try {
                const res = await fetch("/api/payments/status", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCurrentTier(data.tier);
                }
            } catch (e) {}
        };
        fetchStatus();
    }, []);

    const handleUpgrade = (tier: string) => {
        const token = localStorage.getItem("auraa_token");
        if (!token) {
            alert("Please log in to upgrade.");
            router.push("/login?redirect=/pricing");
            return;
        }
        
        trackCheckoutStep("Initiated Checkout", undefined, tier);
        setLoadingTier(tier);
        processPayment(
            { tier },
            (success) => {
                trackCheckoutStep("Purchase Completed", undefined, tier);
                alert(`Successfully upgraded to ${tier.toUpperCase()}!`);
                setCurrentTier(tier);
                setLoadingTier(null);
            },
            (error) => {
                trackCheckoutStep("Purchase Failed", undefined, tier);
                const msg = error instanceof Error ? error.message : "Payment failed or was cancelled.";
                alert(msg);
                setLoadingTier(null);
            }
        );
    };

    return (
        <main className="min-h-screen font-jura bg-[#020205] text-white flex flex-col items-center py-24 relative overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_top,_#1a1a2e_0%,_#020205_60%)]" />
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.05] mix-blend-overlay pointer-events-none" />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="z-10 text-center mb-16 relative">
                <button onClick={() => router.push("/companion")} className="absolute -top-12 left-1/2 -translate-x-1/2 text-white/50 hover:text-white mb-8 text-sm uppercase tracking-widest flex items-center gap-2 transition-colors">
                    â† Back to Nexus
                </button>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6 backdrop-blur-sm text-indigo-400">
                    <span className="text-xs tracking-[0.2em] uppercase font-bold">Neural Link Upgrades</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-br from-white to-white/40">
                    Unlock True Empathy
                </h1>
                <p className="text-white/50 max-w-xl mx-auto text-lg leading-relaxed">
                    Evolve your AURAA companion with deeper emotion mapping, proactive intelligence, and high-fidelity avatars.
                </p>
            </motion.div>

            <div className="z-10 w-full max-w-6xl px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* FREE TIER */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="flex flex-col p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md relative"
                >
                    <h3 className="text-xl font-bold uppercase tracking-widest mb-2 text-white/80">Basic Sync</h3>
                    <div className="text-4xl font-black mb-6">â‚¹0<span className="text-lg text-white/40 font-normal">/mo</span></div>
                    
                    <ul className="flex-grow space-y-4 mb-8 text-sm text-white/60">
                        <li className="flex gap-3 items-center"><span className="text-emerald-500">âœ“</span> Basic Emotion Detection</li>
                        <li className="flex gap-3 items-center"><span className="text-emerald-500">âœ“</span> Classic Bot Avatar</li>
                        <li className="flex gap-3 items-center"><span className="text-emerald-500">âœ“</span> Text Chat Interface</li>
                        <li className="flex gap-3 items-center opacity-40"><span className="text-white/20">Ã—</span> Voice Synthesis</li>
                        <li className="flex gap-3 items-center opacity-40"><span className="text-white/20">Ã—</span> Proactive Content</li>
                    </ul>

                    <button 
                        disabled
                        className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white/50 font-bold uppercase tracking-widest text-sm"
                    >
                        {currentTier === "free" ? "Current Plan" : "Included"}
                    </button>
                </motion.div>

                {/* PRO TIER */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="flex flex-col p-8 rounded-[2rem] bg-gradient-to-b from-indigo-900/40 to-indigo-900/10 border border-indigo-500/30 backdrop-blur-md relative transform md:-translate-y-4 shadow-2xl shadow-indigo-500/10"
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white text-[10px] uppercase font-bold tracking-widest px-4 py-1 rounded-full shadow-lg">
                        Most Popular
                    </div>
                    <h3 className="text-xl font-bold uppercase tracking-widest mb-2 text-indigo-400">Pro Sync</h3>
                    <div className="text-4xl font-black mb-6">â‚¹19<span className="text-lg text-indigo-400/50 font-normal">/mo</span></div>
                    
                    <ul className="flex-grow space-y-4 mb-8 text-sm text-indigo-100/70">
                        <li className="flex gap-3 items-center"><span className="text-indigo-400">âœ“</span> Everything in Basic</li>
                        <li className="flex gap-3 items-center"><span className="text-indigo-400">âœ“</span> Advanced NextGen 3D Avatar</li>
                        <li className="flex gap-3 items-center"><span className="text-indigo-400">âœ“</span> Neural Voice Synthesis</li>
                        <li className="flex gap-3 items-center"><span className="text-indigo-400">âœ“</span> Detailed Emotion Smoothing</li>
                        <li className="flex gap-3 items-center opacity-40"><span className="text-white/20">Ã—</span> Proactive Content</li>
                    </ul>

                    {currentTier === "pro" || currentTier === "premium" ? (
                        <button disabled className="w-full py-4 rounded-xl bg-indigo-500/20 text-indigo-300 font-bold uppercase tracking-widest text-sm cursor-not-allowed">
                            {currentTier === "pro" ? "Current Plan" : "Included"}
                        </button>
                    ) : (
                        <button 
                            onClick={() => handleUpgrade("pro")}
                            disabled={loadingTier === "pro"}
                            className="w-full py-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all"
                        >
                            {loadingTier === "pro" ? "Wait..." : "Upgrade to Pro"}
                        </button>
                    )}
                </motion.div>

                {/* PREMIUM TIER */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="flex flex-col p-8 rounded-[2rem] bg-gradient-to-b from-purple-900/40 to-purple-900/10 border border-purple-500/30 backdrop-blur-md relative"
                >
                    <h3 className="text-xl font-bold uppercase tracking-widest mb-2 text-purple-400">Max Sync</h3>
                    <div className="text-4xl font-black mb-6">â‚¹39<span className="text-lg text-purple-400/50 font-normal">/mo</span></div>
                    
                    <ul className="flex-grow space-y-4 mb-8 text-sm text-purple-100/70">
                        <li className="flex gap-3 items-center"><span className="text-purple-400">âœ“</span> Everything in Pro</li>
                        <li className="flex gap-3 items-center"><span className="text-purple-400">âœ“</span> Proactive Companion Push</li>
                        <li className="flex gap-3 items-center"><span className="text-purple-400">âœ“</span> Content & Media Recommendations</li>
                        <li className="flex gap-3 items-center"><span className="text-purple-400">âœ“</span> Custom Memory Retention</li>
                    </ul>

                    {currentTier === "premium" ? (
                        <button disabled className="w-full py-4 rounded-xl bg-purple-500/20 text-purple-300 font-bold uppercase tracking-widest text-sm cursor-not-allowed">
                            Current Plan
                        </button>
                    ) : (
                        <button 
                            onClick={() => handleUpgrade("premium")}
                            disabled={loadingTier === "premium"}
                            className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all"
                        >
                            {loadingTier === "premium" ? "Wait..." : "Upgrade to Premium"}
                        </button>
                    )}
                </motion.div>
            </div>
        </main>
    );
}
