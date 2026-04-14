import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "@/lib/analytics";

const EMOTION_TAGS = ["calming", "understood", "helpful", "empathetic", "fun", "insightful"];

export default function FeedbackModal({ 
    isOpen, 
    onClose, 
    sessionEmotion = "Neutral" 
}: { 
    isOpen: boolean; 
    onClose: () => void;
    sessionEmotion?: string;
}) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [comment, setComment] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleSubmit = async () => {
        if (rating === 0) return;
        setIsSubmitting(true);
        
        // Timeout Controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const user_id = localStorage.getItem("auraa_token") ? "user-id-placeholder" : null; 
            const username = localStorage.getItem("userName") || null;

            const res = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rating,
                    emotion_tags: selectedTags,
                    comment,
                    session_emotion: sessionEmotion,
                    is_anonymous: isAnonymous,
                    user_id,
                    username
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (res.ok) {
                trackEvent("Feedback Submitted", { rating, numTags: selectedTags.length });
                setIsSuccess(true);
                setTimeout(() => {
                    setIsSuccess(false);
                    onClose();
                }, 2500);
            } else {
                alert("The neural core is busy. Please try again in a moment.");
                console.error("Failed to submit review");
            }
        } catch (e: any) {
            if (e.name === 'AbortError') {
                alert("Submission timed out. Please check if your backend is running.");
            } else {
                alert("Connection failed. Ensure the server on port 8000 is active.");
            }
            console.error("Error submitting review:", e);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-lg bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl font-jura text-white overflow-hidden"
                >
                    {isSuccess ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <motion.div 
                                initial={{ scale: 0 }} animate={{ scale: 1 }} 
                                className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6"
                            >
                                <span className="text-4xl">✨</span>
                            </motion.div>
                            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
                            <p className="text-white/60 text-center">Your feedback helps AURAA grow more emotionally intelligent.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8 text-center">
                                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                                    Rate Your Experience
                                </h2>
                                <p className="text-white/50 text-sm">How did your session with AURAA feel?</p>
                            </div>

                            {/* STAR RATING */}
                            <div className="flex justify-center gap-2 mb-8">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setRating(star)}
                                        className="relative p-1 transition-transform hover:scale-110 focus:outline-none"
                                    >
                                        <span className={`text-4xl transition-colors ${
                                            (hoverRating || rating) >= star 
                                                ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]' 
                                                : 'text-white/10'
                                        }`}>
                                            ★
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* EMOTION TAGS */}
                            <div className="mb-6">
                                <label className="block text-xs uppercase tracking-widest text-white/40 mb-3">What did you feel?</label>
                                <div className="flex flex-wrap gap-2">
                                    {EMOTION_TAGS.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                                                selectedTags.includes(tag)
                                                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                                    : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
                                            }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* COMMENT */}
                            <div className="mb-6">
                                <label className="block text-xs uppercase tracking-widest text-white/40 mb-3">Additional Thoughts</label>
                                <textarea 
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    maxLength={500}
                                    placeholder="Tell us what you loved or what could be better..."
                                    className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 resize-none transition-colors"
                                />
                                <div className="text-right text-[10px] text-white/30 mt-1">{comment.length}/500</div>
                            </div>

                            {/* ANONYMOUS TOGGLE & SUBMIT */}
                            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-10 h-6 rounded-full transition-colors relative ${isAnonymous ? 'bg-indigo-500' : 'bg-white/10'}`}>
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isAnonymous ? 'left-5' : 'left-1'}`} />
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={isAnonymous}
                                        onChange={(e) => setIsAnonymous(e.target.checked)}
                                    />
                                    <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors">Post Anonymously</span>
                                </label>

                                <button
                                    onClick={handleSubmit}
                                    disabled={rating === 0 || isSubmitting}
                                    className="px-6 py-3 bg-white text-black font-bold text-sm tracking-widest uppercase rounded-full hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isSubmitting ? 'Sending...' : 'Submit'}
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
