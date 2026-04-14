"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import MagneticButton from "./MagneticButton";
import { useRouter } from "next/navigation";

function FeatureTag({ children }: { children: string }) {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const tagRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!tagRef.current) return;
        const rect = tagRef.current.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    return (
        <div
            ref={tagRef}
            onMouseMove={handleMouseMove}
            className="relative px-6 py-2 rounded-full border border-white/10 bg-white/5 overflow-hidden group cursor-default"
        >
            <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                    background: `radial-gradient(circle 40px at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.15), transparent 100%)`
                }}
            />
            <span className="relative z-10 text-xs tracking-[0.3em] text-white/70 uppercase group-hover:text-white transition-colors">
                {children}
            </span>
        </div>
    );
}

export default function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });
    const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
    const router = useRouter();

    const titleVariants: any = {
        hidden: { opacity: 0, y: 40 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.15, duration: 1 }
        })
    };

    return (
        <div ref={containerRef} className="relative h-screen w-full overflow-hidden bg-[#020205] font-jura flex flex-col items-center justify-center">
            {/* Scroll-Linked Parallax Background */}
            <motion.div style={{ y, opacity }} className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#020205_100%)] z-10 opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020205]/50 to-[#020205] z-10" />
                
                {/* Simulated Mesh Gradient */}
                <div className="absolute inset-0 opacity-40 mix-blend-screen bg-[radial-gradient(circle_at_50%_50%,_rgba(50,50,150,0.4)_0%,_transparent_50%),radial-gradient(circle_at_80%_20%,_rgba(100,50,150,0.3)_0%,_transparent_40%),radial-gradient(circle_at_20%_80%,_rgba(50,150,150,0.3)_0%,_transparent_40%)]" />
                
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                >
                    <source src="/background.mp4" type="video/mp4" />
                </video>
                 {/* Glassmorphism Grain effect */}
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[url('/noise.svg')]" />
            </motion.div>

            <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full">
                <div className="overflow-hidden pb-2 sm:pb-4">
                    <motion.h1 
                        custom={0} initial="hidden" animate="visible" variants={titleVariants}
                        className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] xl:text-[12rem] 2xl:text-[14rem] font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/20 drop-shadow-2xl font-audiowide"
                    >
                        AURAA
                    </motion.h1>
                </div>
                
                {/* REVIEWS BADGE */}
                <motion.div
                    custom={0.5} initial="hidden" animate="visible" variants={titleVariants}
                    className="mb-6 xl:mb-10 cursor-pointer z-20"
                    onClick={() => router.push("/reviews")}
                >
                    <div className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md shadow-lg hover:shadow-indigo-500/20">
                        <span className="text-yellow-400 text-xs sm:text-sm">★★★★★</span>
                        <span className="text-white/80 text-[10px] sm:text-xs xl:text-sm font-medium tracking-wide">4.8 from 200+ users</span>
                    </div>
                </motion.div>
                
                <div className="overflow-hidden mb-8 md:mb-12">
                    <motion.p 
                        custom={1} initial="hidden" animate="visible" variants={titleVariants}
                        className="text-xs sm:text-sm md:text-xl lg:text-2xl xl:text-3xl tracking-[0.2em] sm:tracking-[0.4em] uppercase text-white/50"
                    >
                        Mindscape Protocol v1.0
                    </motion.p>
                </div>

                <motion.div 
                    custom={2} initial="hidden" animate="visible" variants={titleVariants}
                    className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-16 md:mb-24"
                >
                    <FeatureTag>Pulse</FeatureTag>
                    <FeatureTag>Synapse</FeatureTag>
                    <FeatureTag>Aura</FeatureTag>
                </motion.div>

                <motion.div custom={3} initial="hidden" animate="visible" variants={titleVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl px-4">
                    <MagneticButton 
                        onClick={() => router.push("/companion")}
                        className="group flex items-center justify-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-full backdrop-blur-xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                    >
                        <span className="text-xs font-bold tracking-[0.15em] uppercase text-white/90">Talk with AURAA</span>
                        <motion.span 
                            animate={{ x: [0, 5, 0] }} 
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className="text-white/50 group-hover:text-white transition-colors"
                        >
                            →
                        </motion.span>
                    </MagneticButton>

                    <MagneticButton 
                        onClick={() => router.push("/rooms")}
                        className="group flex items-center justify-center gap-3 px-6 py-4 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 rounded-full backdrop-blur-xl transition-all"
                    >
                        <span className="text-xs font-bold tracking-[0.15em] uppercase text-purple-300/90">Aura Rooms</span>
                        <motion.span 
                            animate={{ x: [0, 5, 0] }} 
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 }}
                            className="text-purple-400/50 group-hover:text-purple-300 transition-colors"
                        >
                            →
                        </motion.span>
                    </MagneticButton>

                    <MagneticButton 
                        onClick={() => router.push("/emotion-mirror")}
                        className="group flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-pink-500/10 to-orange-500/10 hover:from-pink-500/20 hover:to-orange-500/20 border border-pink-500/20 hover:border-pink-400/50 rounded-full backdrop-blur-xl transition-all"
                    >
                        <span className="text-xs font-bold tracking-[0.15em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-orange-300">Emotion Mirror 🧠</span>
                        <motion.span 
                            animate={{ x: [0, 5, 0] }} 
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 1 }}
                            className="text-pink-400/50 group-hover:text-pink-300 transition-colors"
                        >
                            →
                        </motion.span>
                    </MagneticButton>

                    <MagneticButton 
                        onClick={() => router.push("/confessions")}
                        className="group flex items-center justify-center gap-3 px-6 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 rounded-full backdrop-blur-xl transition-all"
                    >
                        <span className="text-xs font-bold tracking-[0.15em] uppercase text-red-400">Confessions 🕵️</span>
                        <motion.span 
                            animate={{ x: [0, 5, 0] }} 
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 1.5 }}
                            className="text-red-400/50 group-hover:text-red-300 transition-colors"
                        >
                            →
                        </motion.span>
                    </MagneticButton>

                    <MagneticButton 
                        onClick={() => router.push("/shapeshifter")}
                        className="group flex items-center justify-center gap-3 px-6 py-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/50 rounded-full backdrop-blur-xl transition-all"
                    >
                        <span className="text-xs font-bold tracking-[0.15em] uppercase text-cyan-400">Shapeshifter ⚡</span>
                        <motion.span 
                            animate={{ x: [0, 5, 0] }} 
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 2 }}
                            className="text-cyan-400/50 group-hover:text-cyan-300 transition-colors"
                        >
                            →
                        </motion.span>
                    </MagneticButton>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 1 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.4em] uppercase text-white/30"
                >
                    Click to Begin Synaptic Transfer
                </motion.div>
            </div>
            
            {/* Top Navigation Frame Elements */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="absolute top-8 left-8 z-20">
                <div className="w-12 h-12 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center shadow-lg">
                    <span className="font-audiowide text-xl text-white">A</span>
                </div>
            </motion.div>
        </div>
    );
}
