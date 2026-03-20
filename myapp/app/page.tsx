"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HeroSection from "@/components/spatial/HeroSection";
import { motion } from "framer-motion";
import { User } from "lucide-react";

export default function LandingPage() {
    const router = useRouter();
    const [userName, setUserName] = useState("User");
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("auraa_token");
        if (!token) {
            router.push("/login");
            return;
        }
        setIsAuthenticated(true);
        const savedName = localStorage.getItem("userName");
        if (savedName) setUserName(savedName);
    }, [router]);

    if (!isAuthenticated) return null; // Wait for redirect check

    return (
        <main className="relative bg-[#020205] min-h-screen font-jura selection:bg-indigo-500/30">
            <HeroSection />
            
            {/* Top Right User Info overlay over the Hero */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 1 }}
                className="absolute top-8 right-8 z-50 flex items-center gap-4 cursor-default"
            >
                <div className="flex flex-col items-end">
                    <span className="text-[9px] uppercase tracking-[0.3em] text-white/40">Authenticated As</span>
                    <span className="text-sm font-bold tracking-widest text-white/90">{userName}</span>
                </div>
                <div onClick={() => {
                        localStorage.removeItem("auraa_token");
                        localStorage.removeItem("userName");
                        router.push("/login");
                    }} 
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors flex items-center justify-center backdrop-blur-md cursor-pointer group"
                    title="Disconnect System"
                >
                    <User size={18} className="text-white/70 group-hover:text-rose-400 transition-colors" />
                </div>
            </motion.div>
        </main>
    );
}
