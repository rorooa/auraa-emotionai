"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Github, Mail, Link as LinkIcon, User, Zap } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState("Luffy");
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("userName");
    if (savedName) setUserName(savedName);
  }, []);

  const handleSaveName = (newName: string) => {
    setUserName(newName);
    localStorage.setItem("userName", newName);
    setIsEditingName(false);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black font-jura text-white selection:bg-indigo-500/30">
      {/* VIDEO BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        >
          <source src="/background.mp4" type="video/mp4" />
        </video>
        {/* Gradient Overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

        {/* Glassmorphism Grain effect */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* INTERACTIVE BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-purple-500/10 blur-[120px] rounded-full animate-pulse delay-700" />

        {/* ENHANCED SYMBOL: Stylistic 'A' in Michroma */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="absolute left-[35px] top-[45px] z-20"
        >
          <div className="relative">
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-indigo-500 blur-xl rounded-full"
            />
            <div className="relative h-12 w-12 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center">
              <span className="text-white text-3xl font-michroma font-bold select-none">A</span>
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 border border-indigo-400/50 rounded-xl"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* TOP LEFT: LOGO & TAGLINE */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute left-[105px] top-[32px] z-10"
      >
        <motion.h1
          whileHover={{ scale: 1.05, filter: "brightness(1.5)" }}
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="text-8xl font-bold tracking-tighter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] cursor-default select-none bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-gray-400 font-audiowide"
        >
          AURAA
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-4 space-y-1"
        >
          <p className="text-xl font-bold opacity-90 tracking-widest uppercase">An AI That Understands You</p>
          <p className="text-lg font-medium opacity-60 italic">— Beyond Words —</p>
          <div className="flex gap-4 mt-2">
            {["Detect", "Understand", "Support"].map((word, i) => (
              <span key={word} className="text-xs tracking-[0.3em] uppercase px-2 py-1 border border-white/10 rounded-md bg-white/5 backdrop-blur-sm">
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
              className="bg-white/5 border border-white/20 rounded-xl px-4 py-2 outline-none text-3xl font-bold text-right backdrop-blur-md focus:border-indigo-500 transition-all font-jura"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onBlur={() => handleSaveName(userName)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName(userName)}
            />
          ) : (
            <motion.button
              whileHover={{ x: -5 }}
              onClick={() => setIsEditingName(true)}
              className="text-4xl font-bold hover:text-indigo-400 transition-colors cursor-pointer group flex items-center gap-4 justify-end"
            >
              <span>{userName}</span>
              <User className="opacity-40 group-hover:opacity-100 group-hover:text-indigo-400 transition-all" size={28} />
            </motion.button>
          )}
        </div>
        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/20 shadow-2xl skew-x-3 transition-transform hover:skew-x-0 cursor-pointer">
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
                →
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
