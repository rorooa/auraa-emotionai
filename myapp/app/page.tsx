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
        if (token) {
            setIsAuthenticated(true);
            const savedName = localStorage.getItem("userName");
            if (savedName) setUserName(savedName);
        } else {
            setUserName("Guest");
            setIsAuthenticated(false);
        }
    }, [router]);

    // Render the landing page for everyone
    if (userName === "") return null; 

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
                    <span className="text-[9px] uppercase tracking-[0.3em] text-white/40">
                        {isAuthenticated ? "Authenticated As" : "System Status"}
                    </span>
                    <span className="text-sm font-bold tracking-widest text-white/90">
                        {isAuthenticated ? userName : "Guest Mode Alpha"}
                    </span>
                </div>
                <div onClick={() => {
                        if (isAuthenticated) {
                            localStorage.removeItem("auraa_token");
                            localStorage.removeItem("userName");
                            window.location.reload();
                        } else {
                            router.push("/login");
                        }
                    }} 
                    className={`w-12 h-12 rounded-2xl bg-white/5 border flex items-center justify-center backdrop-blur-md cursor-pointer group transition-all ${
                        isAuthenticated 
                        ? "border-white/10 hover:border-rose-500/30 hover:bg-rose-500/10" 
                        : "border-indigo-500/30 hover:border-indigo-400/60 hover:bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                    }`}
                    title={isAuthenticated ? "Disconnect System" : "Initialize Session"}
                >
                    <User size={18} className={`${isAuthenticated ? "text-white/70 group-hover:text-rose-400" : "text-indigo-400"} transition-colors`} />
                </div>
            </motion.div>
        </main>
    );
}
