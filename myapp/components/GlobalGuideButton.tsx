"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Info, X, BookOpen, ChevronRight, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type GuideData = {
  title: string;
  description: string;
  steps: string[];
};

const guideConfig: Record<string, GuideData> = {
  "/": {
    title: "AURAA Core Matrix",
    description: "Welcome to the AURAA Central Dashboard. This is your command center for accessing AI features.",
    steps: [
      "Select a module from the holographic orbs in the hero section.",
      "View your authentication status in the top right corner.",
      "Explore the different diagnostic and interactive AI modes from this central hub."
    ]
  },
  "/login": {
    title: "System Access",
    description: "Authenticate to access the AURAA advanced emotion intelligence network.",
    steps: [
      "Enter your credentials securely.",
      "For a demonstration, you can also use social logins or test credentials.",
      "Once verified, you will be redirected to the Core Matrix."
    ]
  },
  "/companion": {
    title: "Neural Pulse Companion",
    description: "Engage with your proactive Emotion AI companion.",
    steps: [
      "Activate the Face Scanner so the AI can read your baseline emotions.",
      "Click 'Trigger Neural Pulse' to manually simulate a proactive check-in.",
      "Interact with the generated recommendations based on your current emotional state."
    ]
  },
  "/emotion-mirror": {
    title: "Emotion Mirror Mode",
    description: "Compare your spoken words against your actual emotional state.",
    steps: [
      "Allow camera and microphone permissions.",
      "Read out a statement while holding a contrasting facial expression.",
      "Analyze your Contradiction Score when the AI processes the results."
    ]
  },
  "/rooms": {
    title: "Aura Sync Rooms",
    description: "Connect with others in an emotion-aware multi-user environment.",
    steps: [
      "Create a new room or join an existing one using an Access Code.",
      "Observe the real-time emotional synchronicity across participants.",
      "The AI will mediate the session based on the average emotional climate of the room."
    ]
  },
  "/confessions": {
    title: "AURA Confessions",
    description: "The AI Emotion Polygraph. Test yourself or a partner.",
    steps: [
      "Read the provocative prompt on screen.",
      "Have the target answer the prompt naturally.",
      "AURAA will scan for micro-expressions and generate a Verdict Card.",
      "Download and share your Verdict Card to social media!"
    ]
  },
  "/shapeshifter": {
    title: "AURA Shapeshifter",
    description: "Rapid Facial Gymnastics Speedrun.",
    steps: [
      "A sequence of extreme emotions will appear.",
      "You have 10 seconds to perfectly mimic the sequence using your face.",
      "Complete the sequence as fast as possible to earn a high rank.",
      "Export your Shapeshifter Card to share your agility score."
    ]
  }
};

const defaultGuide: GuideData = {
  title: "AURAA Interface",
  description: "Navigate the intuitive interface to interact with advanced sensory AI features.",
  steps: [
    "Explore the on-screen options.",
    "Ensure camera permissions are enabled for modules that require Face Scanning.",
    "Click anywhere outside dialogs to close them."
  ]
};

export default function GlobalGuideButton() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentGuide = guideConfig[pathname] || defaultGuide;

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/20 backdrop-blur-md rounded-full shadow-[0_0_15px_rgba(99,102,241,0.2)] flex items-center justify-center text-white/70 hover:text-white transition-all group"
        title="View Page Guide"
      >
        <BookOpen size={20} className="group-hover:text-indigo-400 transition-colors" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-jura">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                      <Zap className="text-indigo-400" size={20} />
                    </div>
                    <h2 className="text-2xl font-bold font-orbitron tracking-wider text-white">
                      {currentGuide.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="text-white/60 text-sm mt-4">
                  {currentGuide.description}
                </p>
              </div>

              {/* Body */}
              <div className="p-6">
                <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">
                  Operation Protocol
                </h3>
                <ul className="space-y-4">
                  {currentGuide.steps.map((step, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="mt-1 min-w-5 flex justify-center">
                        <ChevronRight size={16} className="text-indigo-400" />
                      </div>
                      <span className="text-white/80 text-sm leading-relaxed">
                        {step}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="p-4 bg-black/40 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm tracking-widest text-white/80 transition-colors"
                >
                  ACKNOWLEDGE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
