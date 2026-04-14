"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import { Download, RefreshCw, Zap } from "lucide-react";

export type CardTheme = "cyberpunk" | "glass";

export type ViralCardData = {
  mode: "CONFESSIONS" | "SHAPESHIFTER";
  targetImageSrc: string; // Base64 snapshot
  stats: { label: string; value: string | number; color?: string }[];
  title: string;
  subtitle: string;
  verdict: string;
};

interface SharedViralCardProps {
  data: ViralCardData;
  onClose: () => void;
}

export default function SharedViralCard({ data, onClose }: SharedViralCardProps) {
  const [theme, setTheme] = useState<CardTheme>("cyberpunk");
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
      const link = document.createElement("a");
      link.download = `AURA_${data.mode}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export card:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const isCyber = theme === "cyberpunk";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Theme Toggle */}
      <div className="relative z-10 flex gap-4 mb-8">
        <button
          onClick={() => setTheme("cyberpunk")}
          className={`px-4 py-2 rounded-lg font-orbitron text-sm transition-all ${
            isCyber
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
              : "bg-white/5 text-white/50 border border-white/10 hover:text-white"
          }`}
        >
          CYBERPUNK
        </button>
        <button
          onClick={() => setTheme("glass")}
          className={`px-4 py-2 rounded-lg font-jura text-sm transition-all ${
            !isCyber
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              : "bg-white/5 text-white/50 border border-white/10 hover:text-white"
          }`}
        >
          GLASSMORPHISM
        </button>
      </div>

      {/* The Printable Card Wrapper */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{ type: "spring", damping: 15 }}
        className="relative z-10"
      >
        <div
          ref={cardRef}
          className={`w-[350px] aspect-[3/4] relative overflow-hidden flex flex-col ${
            isCyber
              ? "bg-zinc-950 border-2 border-rose-500/50 rounded-none mix-blend-screen"
              : "bg-white/10 border border-white/20 rounded-3xl backdrop-blur-2xl"
          }`}
          style={{
            boxShadow: isCyber ? "0 0 40px rgba(244,63,94,0.2)" : "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          {/* Cyberpunk Glitch Lines / Glass Glows */}
          {isCyber ? (
            <>
              <div className="absolute top-0 right-4 w-[2px] h-32 bg-cyan-400/50" />
              <div className="absolute bottom-4 left-0 w-32 h-[2px] bg-rose-500/50" />
            </>
          ) : (
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-500/30 rounded-full blur-[60px]" />
          )}

          {/* Header */}
          <div className={`p-5 flex justify-between items-start z-10 ${isCyber ? "font-orbitron" : "font-jura"}`}>
            <div>
              <p className={`text-xs tracking-[0.3em] font-bold ${isCyber ? "text-cyan-400" : "text-white/60 uppercase"}`}>
                {data.subtitle}
              </p>
              <h2 className={`text-2xl font-bold uppercase ${isCyber ? "text-rose-500 tracking-wider" : "text-white"}`}>
                {data.title}
              </h2>
            </div>
            {isCyber && <Zap className="text-cyan-400" size={24} />}
          </div>

          {/* Image Snapshot Section */}
          <div className="w-full flex-1 px-5 relative z-10">
            <div
              className={`w-full h-full relative overflow-hidden ${
                isCyber ? "grayscale contrast-150 border border-cyan-500/30 filter sepia-[0.3] hue-rotate-[320deg]" : "rounded-2xl"
              }`}
            >
              {data.targetImageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.targetImageSrc}
                  alt="Snapshot"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-black/50 flex items-center justify-center">
                  <span className="text-white/20">NO SIGNAL</span>
                </div>
              )}
              
              {/* Scanline overlay for cyberpunk */}
              {isCyber && (
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: "linear-gradient(transparent 50%, rgba(0,0,0,0.5) 50%)",
                    backgroundSize: "100% 4px"
                  }}
                />
              )}
            </div>
          </div>

          {/* Stats & Verdict section */}
          <div className={`p-5 mb-2 z-10 ${isCyber ? "font-orbitron" : "font-jura"}`}>
            <div className={`grid grid-cols-2 gap-2 mb-4`}>
              {data.stats.map((stat, idx) => (
                <div
                  key={idx}
                  className={`p-2 ${
                    isCyber ? "bg-black/80 border border-white/10" : "bg-black/20 rounded-xl"
                  }`}
                >
                  <p className="text-[10px] text-white/50 tracking-wider">{stat.label}</p>
                  <p
                    className={`text-lg font-bold`}
                    style={{ color: stat.color || "white" }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div
              className={`w-full py-3 px-4 text-center ${
                isCyber
                  ? "bg-rose-500/10 border border-rose-500 text-cyan-400 font-bold uppercase tracking-widest text-sm"
                  : "bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-white font-medium text-sm tracking-wide"
              }`}
            >
              {data.verdict}
            </div>
          </div>

          {/* Branding */}
          <div className="absolute bottom-1 left-0 right-0 flex justify-center opacity-30 z-10">
             <span className={`text-[8px] tracking-[0.6em] ${isCyber ? "font-orbitron text-rose-500" : "font-jura text-white"}`}>AURAA AI NODE</span>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="relative z-10 mt-8 flex gap-4">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold font-jura tracking-widest rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {isExporting ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
          {isExporting ? "MINTING..." : "SAVE CARD"}
        </button>
        <button
          onClick={onClose}
          className="px-6 py-3 border border-white/20 text-white font-bold font-jura tracking-widest rounded-xl hover:bg-white/10 transition-colors"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
