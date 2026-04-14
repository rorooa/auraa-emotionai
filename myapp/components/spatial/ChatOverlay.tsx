"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Mic, History, Loader2, ExternalLink, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProactiveContent {
    type: string;
    title: string;
    url: string;
    source: string;
    thumbnail?: string;
}

interface ProactivePayload {
    message: string;
    content: ProactiveContent;
}

interface ChatOverlayProps {
    onChat: (messages: { role: string; content: string }[]) => Promise<any>;
    initialHistory?: { role: 'user' | 'ai'; text: string }[];
    proactiveEmotion?: string | null;
    onProactiveHandled?: () => void;
    onLoadHistory?: () => Promise<any>;
    proactiveContent?: ProactivePayload | null;
    onProactiveContentHandled?: () => void;
    onTyping?: (isTyping: boolean) => void;
}

export default function ChatOverlay({ onChat, initialHistory = [], proactiveEmotion, onProactiveHandled, onLoadHistory, proactiveContent, onProactiveContentHandled, onTyping }: ChatOverlayProps) {
    const [history, setHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>(initialHistory);
    const [inputValue, setInputValue] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialHistory.length > 0 && history.length === 0) {
            setHistory(initialHistory);
        } else if (history.length === 0) {
            setHistory([{ role: 'ai', text: `Neural link established. How can I assist you?` }]);
        }
    }, [initialHistory, history.length]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth"
            });
        }
    }, [history, isThinking]);

    // Handle proactive content from companion system
    useEffect(() => {
        if (proactiveContent && onProactiveContentHandled) {
            const { message, content } = proactiveContent;
            
            // Immediately signal handle to prevent re-triggering
            onProactiveContentHandled();
            
            // Procedural human-like delay (roughly 40ms per character, capped)
            setIsThinking(true);
            const typingDelay = Math.min(Math.max(message.length * 40, 1500), 5000);
            
            // Wait for typing delay, then push message
            setTimeout(() => {
                setIsThinking(false);
                setHistory(current => [
                    ...current,
                    { role: 'ai' as const, text: message, contentCard: content }
                ]);
            }, typingDelay);
        }
    }, [proactiveContent]);

    const handleProactiveChat = async (emotion: string) => {
        if (onProactiveHandled) onProactiveHandled();

        const contextMessage = `(System: The user appears to be feeling ${emotion}. Please initiate a comforting conversation or ask if they want music.)`;
        
        setIsThinking(true);
        const apiMessages = history.map(msg => ({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.text
        }));

        apiMessages.push({ role: 'user', content: contextMessage });

        try {
            const response = await onChat(apiMessages);
            setHistory(current => [...current, { role: 'ai', text: response.reply || response }]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsThinking(false);
            if(scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim()) return;
        const text = inputValue;
        setInputValue("");
        
        const newHistory = [...history, { role: 'user' as const, text }];
        setHistory(newHistory);
        
        setIsThinking(true);
        const apiMessages = newHistory.map(msg => ({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.text
        }));

        try {
            const response = await onChat(apiMessages);
            setHistory(current => [...current, { role: 'ai', text: response.reply || response }]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsThinking(false);
            if(scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
    };

    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.start();

        setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;
            
            const newHistory = [...history, { role: 'user' as const, text: transcript }];
            setHistory(newHistory);
            
            setIsThinking(true);
            const apiMessages = newHistory.map(msg => ({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.text
            }));

            try {
                const response = await onChat(apiMessages);
                setHistory(current => [...current, { role: 'ai', text: response.reply || response }]);
            } catch (e) {
                console.error(e);
            } finally {
                setIsThinking(false);
                if(scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
            }
        };
    };

    return (
        <div className="flex flex-col h-full w-full font-sans relative z-50">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10 font-jura">
                <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/50">Synaptic Log</h4>
                <div className="flex items-center gap-3">
                    {/* Load History Button */}
                    {onLoadHistory && !historyLoaded && (
                        <button
                            onClick={async () => {
                                setIsHistoryLoading(true);
                                try {
                                    const loaded = await onLoadHistory();
                                    if (loaded && loaded.length > 0) {
                                        setHistory(prev => {
                                            // Only prepend if current history is default welcome
                                            if (prev.length <= 1) return [...loaded, ...prev];
                                            return [...loaded, ...prev];
                                        });
                                    }
                                    setHistoryLoaded(true);
                                } catch (e) { console.error(e); }
                                setIsHistoryLoading(false);
                            }}
                            disabled={isHistoryLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-[9px] uppercase tracking-widest text-white/50 hover:text-white/80 disabled:opacity-50"
                        >
                            {isHistoryLoading ? <Loader2 size={10} className="animate-spin" /> : <History size={10} />}
                            <span>{isHistoryLoading ? "Loading..." : "History"}</span>
                        </button>
                    )}
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-emerald-400">Live</span>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto mb-6 custom-scrollbar pr-4 space-y-6">
                <AnimatePresence>
                    {history.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`p-4 sm:p-5 rounded-[1.5rem] max-w-[90%] sm:max-w-[85%] text-[14px] sm:text-[15px] tracking-wide leading-relaxed shadow-lg backdrop-blur-md ${
                                msg.role === 'user' 
                                    ? 'bg-white/15 border border-white/20 text-white rounded-tr-sm' 
                                    : 'bg-[#050508]/60 border border-white/10 text-white/90 rounded-tl-sm'
                            }`}>
                                {msg.text}
                                {/* Proactive Content Card */}
                                {(msg as any).contentCard && (
                                    <div className="mt-4 block group">
                                        <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 rounded-2xl p-4 transition-all duration-300">
                                            
                                            {/* Render YouTube Iframe if it's a Youtube Link */}
                                            {typeof (msg as any).contentCard.url === 'string' && (msg as any).contentCard.url.includes('youtube.com/watch') || (msg as any).contentCard.url.includes('youtu.be') ? (
                                                <div className="w-full aspect-video rounded-xl overflow-hidden mb-3 border border-white/10">
                                                    <iframe 
                                                        width="100%" 
                                                        height="100%" 
                                                        src={(msg as any).contentCard.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} 
                                                        title="YouTube video player" 
                                                        frameBorder="0" 
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                        allowFullScreen
                                                    ></iframe>
                                                </div>
                                            ) : null}

                                            <a href={(msg as any).contentCard.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3">
                                                <div className="p-2 bg-indigo-500/10 rounded-xl shrink-0 mt-0.5">
                                                    <Sparkles size={14} className="text-indigo-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] text-white/80 font-medium leading-snug line-clamp-2">
                                                        {(msg as any).contentCard.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-[8px] uppercase tracking-widest text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                                                            {(msg as any).contentCard.source}
                                                        </span>
                                                        <span className="text-[8px] uppercase tracking-widest text-indigo-400/80 flex items-center gap-1 group-hover:text-indigo-300 transition-colors">
                                                            {(msg as any).contentCard.type === 'news' ? 'Read Now' : 'Open Link'}
                                                            <ExternalLink size={8} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                    {isThinking && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="flex justify-start"
                        >
                             <div className="p-4 sm:p-5 rounded-[1.5rem] bg-[#050508]/60 border border-white/10 text-white/50 text-xs uppercase tracking-widest flex items-center gap-3 rounded-tl-sm shadow-inner">
                                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Input */}
            <div className="relative mt-auto font-jura flex items-center">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        if (onTyping) onTyping(e.target.value.length > 0);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleSend();
                            if (onTyping) onTyping(false);
                        }
                    }}
                    placeholder="Transmit thought..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-6 pr-24 text-white text-sm focus:outline-none focus:border-white/30 transition-all placeholder:text-white/30 shadow-inner backdrop-blur-xl"
                />
                <button
                    onClick={startListening}
                    className={`absolute right-14 p-2 transition-all ${isListening ? 'text-rose-400 animate-pulse' : 'text-white/30 hover:text-white/80'}`}
                >
                    <Mic size={18} />
                </button>
                <button
                    onClick={handleSend}
                    disabled={isThinking || !inputValue.trim()}
                    className="absolute right-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all disabled:opacity-50 disabled:hover:bg-white/5 shadow-md"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
