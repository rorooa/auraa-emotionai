"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                // Fetch stats
                const statsRes = await fetch("/api/reviews/stats");
                if (statsRes.ok) {
                    setStats(await statsRes.json());
                }

                // Fetch reviews
                const res = await fetch("/api/reviews");
                if (res.ok) {
                    const data = await res.json();
                    setReviews(data.reviews);
                }
            } catch (error) {
                console.error("Failed to load reviews:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, []);

    const getEmotionColor = (emotion: string) => {
        const lower = (emotion || "").toLowerCase();
        if (["happy", "joy"].includes(lower)) return "from-yellow-500/20 to-orange-500/5";
        if (["sad", "sadness", "sorrow"].includes(lower)) return "from-blue-500/20 to-indigo-500/5";
        if (["angry", "anger"].includes(lower)) return "from-red-500/20 to-rose-500/5";
        if (["calm", "neutral"].includes(lower)) return "from-emerald-500/20 to-teal-500/5";
        return "from-white/10 to-white/0";
    };

    return (
        <main className="min-h-screen bg-[#020205] text-white font-jura relative overflow-hidden flex flex-col items-center">
            {/* Background elements */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_top,_#1a1a2e_0%,_#020205_60%)]" />
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.05] mix-blend-overlay pointer-events-none" />

            <div className="z-10 w-full max-w-6xl px-6 py-24 flex flex-col items-center">
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <button 
                        onClick={() => router.push("/")}
                        className="absolute top-8 left-8 sm:top-12 sm:left-12 p-3 text-white/50 hover:text-white border border-white/10 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 z-50"
                    >
                        <span className="text-xl">←</span> <span className="text-sm font-bold tracking-widest uppercase hidden sm:inline">Back</span>
                    </button>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm">
                        <span className="text-yellow-400">★</span>
                        <span className="text-xs tracking-[0.2em] uppercase">User Stories</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white to-white/40">
                        Impact & Experiences
                    </h1>
                    
                    {stats && (
                        <div className="flex items-center justify-center gap-8 mt-8 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-white mb-1">{stats.average_rating}<span className="text-xl text-white/50">/5</span></div>
                                <div className="text-xs uppercase tracking-widest text-white/40">Avg Rating</div>
                            </div>
                            <div className="w-px h-12 bg-white/10" />
                            <div className="text-center">
                                <div className="text-4xl font-bold text-white mb-1">{stats.total_reviews}</div>
                                <div className="text-xs uppercase tracking-widest text-white/40">Total Sessions</div>
                            </div>
                        </div>
                    )}
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    {loading ? (
                        [1,2,3,4,5,6].map(i => (
                            <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
                        ))
                    ) : reviews.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-white/40">No reviews yet. Be the first to share your experience!</div>
                    ) : (
                        reviews.map((review, i) => (
                            <motion.div
                                key={review.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`relative p-8 rounded-3xl border border-white/10 bg-gradient-to-br ${getEmotionColor(review.session_emotion)} backdrop-blur-sm overflow-hidden group`}
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-5xl">
                                    "
                                </div>
                                
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex gap-1">
                                        {[1,2,3,4,5].map(star => (
                                            <span key={star} className={`text-sm ${star <= review.rating ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-white/10'}`}>★</span>
                                        ))}
                                    </div>
                                    <div className="text-[10px] tracking-widest uppercase text-white/30">
                                        {new Date(review.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                <p className="text-white/80 text-sm leading-relaxed mb-6 flex-grow min-h-[80px]">
                                    {review.comment || "No detailed feedback provided."}
                                </p>

                                <div className="flex flex-wrap gap-2 mb-6">
                                    {(review.emotion_tags || []).map((tag: string) => (
                                        <span key={tag} className="px-3 py-1 text-[10px] uppercase tracking-wider rounded-full bg-white/5 border border-white/10 text-white/60">
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs shadow-inner">
                                        {review.username ? review.username.charAt(0).toUpperCase() : "A"}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white/90">{review.username}</div>
                                        <div className="text-[10px] uppercase tracking-widest text-white/40">Verified Session</div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    className="mt-20"
                >
                    <button 
                        onClick={() => router.push("/companion")}
                        className="px-10 py-5 bg-white text-black rounded-full font-bold tracking-[0.2em] uppercase text-sm hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                        Try AURAA Now
                    </button>
                </motion.div>
            </div>
        </main>
    );
}
