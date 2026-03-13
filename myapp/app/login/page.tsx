"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const endpoint = isLogin ? "/login" : "/register";
            const body = isLogin 
                ? { username: formData.username, password: formData.password }
                : formData;

            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
            const res = await fetch(`${backendUrl}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const text = await res.text();
                let errorMessage = "Authentication failed";
                try {
                    const data = JSON.parse(text);
                    errorMessage = data.detail || errorMessage;
                } catch (e) {
                    errorMessage = "Server is starting up... Please try again in 30 seconds.";
                }
                throw new Error(errorMessage);
            }

            const data = await res.json();
            localStorage.setItem("auraa_token", data.access_token);
            localStorage.setItem("userName", formData.username);
            
            router.push("/");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative h-screen w-screen overflow-hidden bg-black font-jura text-white flex items-center justify-center">
            {/* Background elements */}
            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-indigo-500/20 blur-[150px] rounded-full" />
                <div className="absolute bottom-[20%] right-[20%] w-[500px] h-[500px] bg-purple-500/20 blur-[150px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="z-10 w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative"
            >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                    <div className="h-24 w-24 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl rotate-45 flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-white/20">
                        <span className="text-4xl font-bold font-michroma -rotate-45 block text-white drop-shadow-md">A</span>
                    </div>
                </div>

                <div className="mt-12 text-center mb-8">
                    <h1 className="text-3xl font-bold tracking-widest uppercase mb-2">
                        {isLogin ? "Synapse Access" : "Create Profile"}
                    </h1>
                    <p className="text-xs text-white/50 tracking-[0.2em] uppercase">
                        {isLogin ? "Enter your credentials to link" : "Initialize your neural connection"}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                        <input 
                            required
                            type="text" 
                            placeholder="Username" 
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-indigo-500 transition-colors"
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                        />
                    </div>
                    
                    {!isLogin && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }}
                            className="relative"
                        >
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                            <input 
                                required
                                type="email" 
                                placeholder="Email Address" 
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-indigo-500 transition-colors"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                        </motion.div>
                    )}

                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                        <input 
                            required
                            type="password" 
                            placeholder="Password" 
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-indigo-500 transition-colors"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-4 mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 group transition-all"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                {isLogin ? "Initialize Link" : "Register Connect"}
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-white/50">
                    {isLogin ? "Don't have an access key?" : "Already initialized?"}{" "}
                    <button 
                        type="button" 
                        onClick={() => { setIsLogin(!isLogin); setError(""); }}
                        className="text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider ml-2 underline underline-offset-4"
                    >
                        {isLogin ? "Register Data" : "Return to Log In"}
                    </button>
                </div>
            </motion.div>
        </main>
    )
}
