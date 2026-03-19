"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Github, Mail, Link as LinkIcon, User, Zap } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState("Luffy");
  const [isEditingName, setIsEditingName] = useState(false);

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("auraa_token");
    if (!token) {
      router.push("/login");
      return;
    }
    
    const savedName = localStorage.getItem("userName");
    if (savedName) setUserName(savedName);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("auraa_token");
    localStorage.removeItem("userName");
    router.push("/login");
  };

  const handleSaveName = (newName: string) => {
    setUserName(newName);
    localStorage.setItem("userName", newName);
    setIsEditingName(false);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#020205] font-jura text-white selection:bg-indigo-500/30">
      {/* SCANLINE OVERLAY */}
      <div className="absolute inset-0 z-[100] pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

      {/* GRID BACKGROUND */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: `linear-gradient(to right, #1e1b4b 1px, transparent 1px), linear-gradient(to bottom, #1e1b4b 1px, transparent 1px)`,
             backgroundSize: '40px 40px',
             transform: `perspective(1000px) rotateX(60deg) translateY(${mousePosition.y * 0.5}px) scale(2)`,
             transformOrigin: 'center center'
           }} 
      />

      {/* VIDEO BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.div
          animate={{ x: mousePosition.x * -0.5, y: mousePosition.y * -0.5 }}
          className="absolute inset-0 w-full h-full"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-50 scale-110"
          >
            <source src="/background.mp4" type="video/mp4" />
          </video>
        </motion.div>
        {/* Gradient Overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020205]/100 via-transparent to-[#020205]/100" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020205]/80 via-transparent to-[#020205]/80" />

        {/* Glassmorphism Grain effect */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* INTERACTIVE BACKGROUND ELEMENTS (PARALLAX) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div 
          animate={{ x: mousePosition.x * 2, y: mousePosition.y * 2 }}
          className="absolute top-[5%] left-[15%] w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse" 
        />
        <motion.div 
          animate={{ x: mousePosition.x * -3, y: mousePosition.y * -3 }}
          className="absolute bottom-[5%] right-[15%] w-[500px] h-[500px] bg-cyan-500/10 blur-[130px] rounded-full animate-pulse delay-1000" 
        />
        
        {/* Floating Futuristic Particles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.1, 0.4, 0.1], 
              x: [Math.random() * 1000, Math.random() * 1000],
              y: [Math.random() * 800, Math.random() * 800],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{ duration: 10 + Math.random() * 10, repeat: Infinity }}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_10px_cyan]"
          />
        ))}
      </div>

      {/* ENHANCED SYMBOL: Stylistic 'A' in Michroma */}
      <motion.div
        animate={{ 
          x: mousePosition.x * 1.5, 
          y: mousePosition.y * 1.5,
          rotateY: mousePosition.x * 0.5,
          rotateX: mousePosition.y * -0.5
        }}
        className="absolute left-[35px] top-[45px] z-20"
      >
        <div className="relative">
          <motion.div
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-cyan-500 blur-2xl rounded-full"
          />
          <div className="relative h-14 w-14 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 shadow-[0_0_30px_rgba(34,211,238,0.4)] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20" />
            <span className="text-white text-4xl font-michroma font-bold select-none relative z-10">A</span>
            <motion.div
              animate={{ y: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 left-0 w-full h-1/2 bg-white/10 blur-sm pointer-events-none"
            />
          </div>
        </div>
      </motion.div>

      {/* TOP LEFT: LOGO & TAGLINE */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute left-[105px] top-[32px] z-10"
      >
        <motion.div
          animate={{ rotateX: mousePosition.y * -0.2, rotateY: mousePosition.x * 0.2 }}
          style={{ perspective: 1000 }}
        >
          <motion.h1
            whileHover={{ scale: 1.05, filter: "brightness(1.5)" }}
            className="text-9xl font-bold tracking-tighter cursor-default select-none bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-cyan-400 font-audiowide drop-shadow-[0_10px_30px_rgba(99,102,241,0.3)]"
          >
            AURAA
          </motion.h1>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-6 space-y-2 border-l border-indigo-500/50 pl-6"
        >
          <p className="text-2xl font-bold opacity-90 tracking-[0.2em] uppercase text-indigo-100 font-michroma">Mindscape Protocol v1.0</p>
          <p className="text-lg font-medium opacity-60 italic text-cyan-200">— Bridging Emotion & Intelligence —</p>
          <div className="flex gap-3 mt-4">
            {["Pulse", "Synapse", "Aura"].map((word, i) => (
              <span key={word} className="text-[10px] tracking-[0.4em] uppercase px-3 py-1 border border-cyan-500/30 rounded-full bg-cyan-500/5 backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                {word}
              </span>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* TOP RIGHT: USER NAME */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="absolute right-[67px] top-[35px] z-10 flex items-center gap-6"
      >
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.4em] opacity-40 mb-1">Authenticated As</p>
          {isEditingName ? (
            <input
              autoFocus
              className="bg-white/5 border border-white/20 rounded-xl px-4 py-2 outline-none text-3xl font-bold text-right backdrop-blur-md focus:border-indigo-500 transition-all font-jura w-48"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onBlur={() => handleSaveName(userName)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName(userName)}
            />
          ) : (
            <motion.button
              whileHover={{ x: -5 }}
              onClick={() => setIsEditingName(true)}
              className="text-4xl font-bold hover:text-indigo-400 transition-colors cursor-pointer group flex items-center gap-4 justify-end w-48 overflow-hidden text-ellipsis whitespace-nowrap"
            >
              <span className="truncate">{userName}</span>
              <User className="opacity-40 group-hover:opacity-100 group-hover:text-indigo-400 transition-all shrink-0" size={28} />
            </motion.button>
          )}
          <button onClick={handleLogout} className="text-[10px] mt-2 text-rose-400 hover:text-rose-300 uppercase tracking-widest font-bold border-b border-rose-500/30">
            Disconnect System
          </button>
        </div>
        <div className="w-16 h-16 shrink-0 rounded-2xl overflow-hidden border border-white/20 shadow-2xl skew-x-3 transition-transform hover:skew-x-0 cursor-pointer">
          <div className="w-full h-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 animate-gradient-xy flex items-center justify-center">
            <User size={32} />
          </div>
        </div>
      </motion.div>

      {/* BOTTOM MIDDLE: MAIN BUTTON */}
      <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 z-10">
        <div className="relative group">
          {/* Ring animation */}
          <div className="absolute inset-0 bg-indigo-500 blur-[30px] opacity-0 group-hover:opacity-40 transition-opacity duration-500 rounded-full" />

          <motion.button
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/companion")}
            className="relative w-[340px] h-[90px] bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full flex items-center justify-center overflow-hidden transition-all shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="text-2xl font-bold tracking-widest uppercase flex items-center gap-3">
              Talk with AURAA
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                {"→"}
              </motion.div>
            </span>
          </motion.button>
        </div>
        <p className="text-center mt-4 text-[10px] uppercase tracking-[0.5em] opacity-30 animate-pulse">
          Click to Begin Synaptic Transfer
        </p>
      </div>

      {/* BOTTOM LEFT: CONTACTS */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute left-[50px] bottom-[50px] z-10 space-y-6"
      >
        {[
          { icon: <Github size={22} />, label: "Development Hub" },
          { icon: <Mail size={22} />, label: "Direct Transmission" },
          { icon: <LinkIcon size={22} />, label: "Encrypted Uplink" }
        ].map((item, i) => (
          <motion.div
            key={i}
            whileHover={{ x: 10, color: "#818cf8" }}
            className="flex items-center gap-4 group cursor-pointer text-white/50 transition-all"
          >
            <div className="p-2 rounded-lg bg-white/5 border border-white/10 group-hover:border-indigo-500/50">
              {item.icon}
            </div>
            <span className="text-sm font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0">
              {item.label}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* BOTTOM RIGHT: ABOUT US */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute right-[50px] bottom-[50px] z-10"
      >
        <motion.button
          whileHover={{ scale: 1.1, rotate: -2 }}
          onClick={() => router.push("/about")}
          className="relative group p-4"
        >
          <div className="absolute inset-0 bg-white/5 rounded-2xl rotate-3 group-hover:rotate-0 transition-transform" />
          <span className="relative text-xl font-bold tracking-widest uppercase text-white/70 group-hover:text-white transition-colors">
            about us
          </span>
        </motion.button>
      </motion.div>

      {/* SYSTME INFO OVERLAY (Subtle UX detail) */}
      <div className="absolute top-1/2 right-12 -translate-y-1/2 z-10 writing-vertical text-[10px] uppercase tracking-[0.6em] opacity-20 pointer-events-none hidden lg:block">
        AURAA_v0.1.0 // EMOTION_SYNAPSE_ACTIVE // CONNECTIVITY_OPTIMAL
      </div>
    </main>
  );
}
