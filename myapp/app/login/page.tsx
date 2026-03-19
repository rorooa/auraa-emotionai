"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase";
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithPopup,
    GoogleAuthProvider
} from "firebase/auth";

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

    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [particles, setParticles] = useState<{top: string, left: string}[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Generate random particles only on the client to avoid hydration mismatch
        const newParticles = [...Array(6)].map(() => ({
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
        }));
        setParticles(newParticles);

        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({
                x: (e.clientX / window.innerWidth - 0.5) * 30,
                y: (e.clientY / window.innerHeight - 0.5) * 30,
            });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            let userCredential;
            if (isLogin) {
                userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
            } else {
                userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                if (formData.username) {
                    await updateProfile(userCredential.user, { displayName: formData.username });
                }
            }
            await loginWithToken(userCredential);
        } catch (err: any) {
            console.error("Auth error:", err);
            const code = err.code || "";
            const friendlyErrors: Record<string, string> = {
                "auth/invalid-api-key":       "Firebase not configured. Check lib/firebase.ts.",
                "auth/user-not-found":         "No account found with this email.",
                "auth/wrong-password":         "Incorrect password.",
                "auth/email-already-in-use":   "This email is already registered. Try logging in.",
                "auth/weak-password":          "Password must be at least 6 characters.",
                "auth/invalid-email":          "Please enter a valid email address.",
                "auth/network-request-failed": "Network error. Check your connection.",
            };
            setError(friendlyErrors[code] || err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError("");
        try {
            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);
            await loginWithToken(userCredential);
        } catch (err: any) {
            console.error("Google auth error:", err);
            if (err.code !== "auth/popup-closed-by-user") {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const loginWithToken = async (userCredential: any) => {
        const idToken = await userCredential.user.getIdToken();
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const res = await fetch(`${backendUrl}/firebase-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: idToken })
        });
        if (!res.ok) {
            let errMsg = "Backend verification failed";
            try { const d = await res.json(); errMsg = d.detail || errMsg; } catch {}
            throw new Error(errMsg);
        }
        const data = await res.json();
        localStorage.setItem("auraa_token", data.access_token);
        const displayName = userCredential.user.displayName || formData.username || formData.email.split("@")[0];
        localStorage.setItem("userName", displayName);
        router.push("/");
    };

    return (
        <main className="relative h-screen w-screen overflow-hidden bg-[#020617] font-jura text-white flex items-center justify-center perspective-[1000px]">
            {/* Background Parallax Layers (Only on Client) */}
            {isMounted && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    {/* 1. Deepest Layer: Large AURAA Text (Slow) */}
                    <motion.div 
                        animate={{ 
                            x: mousePosition.x * -0.5, 
                            y: mousePosition.y * -0.5,
                            opacity: [0.03, 0.05, 0.03]
                        }}
                        transition={{ opacity: { duration: 4, repeat: Infinity } }}
                        className="absolute inset-0 flex items-center justify-center select-none"
                    >
                        <h1 className="text-[25vw] font-black tracking-[-0.05em] text-white uppercase leading-none filter blur-sm">
                            AURAA
                        </h1>
                    </motion.div>

                    {/* 2. Middle Layer: Neural Blobs (Medium) */}
                    <motion.div 
                        animate={{ x: mousePosition.x * -1.2, y: mousePosition.y * -1.2 }}
                        className="absolute top-[10%] left-[15%] w-[600px] h-[600px] bg-indigo-600/20 blur-[180px] rounded-full" 
                    />
                    <motion.div 
                        animate={{ x: mousePosition.x * 1.8, y: mousePosition.y * 1.8 }}
                        className="absolute bottom-[5%] right-[10%] w-[700px] h-[700px] bg-purple-600/15 blur-[200px] rounded-full" 
                    />

                    {/* 3. Floating Particles (Fast) */}
                    {particles.map((p, i) => (
                        <motion.div
                            key={i}
                            animate={{ 
                                x: mousePosition.x * (2 + i), 
                                y: mousePosition.y * (2 + i),
                                opacity: [0.1, 0.3, 0.1]
                            }}
                            transition={{ opacity: { duration: 2 + i, repeat: Infinity } }}
                            className="absolute w-1 h-1 bg-white rounded-full blur-[1px]"
                            style={{
                                top: p.top,
                                left: p.left,
                            }}
                        />
                    ))}

                    {/* Noise Overlay */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.08] mix-blend-overlay" />
                </div>
            )}

            {/* Login Card (Foreground Parallax) */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    x: mousePosition.x * 0.3,
                    y: mousePosition.y * 0.3,
                    rotateX: -mousePosition.y * 0.05,
                    rotateY: mousePosition.x * 0.05,
                }}
                transition={{ 
                    type: "spring", 
                    damping: 25, 
                    stiffness: 120 
                }}
                className="z-10 w-full max-w-md p-8 bg-slate-900/40 backdrop-blur-[40px] border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group"
            >
                {/* Card Border Glow */}
                <div className="absolute inset-0 border border-white/20 rounded-[2.5rem] pointer-events-none group-hover:border-indigo-500/50 transition-colors duration-500" />
                
                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                    <div className="h-24 w-24 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl rotate-45 flex items-center justify-center shadow-2xl shadow-indigo-500/40 border border-white/30 animate-pulse">
                        <span className="text-4xl font-bold font-michroma -rotate-45 block text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">A</span>
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

                    {/* Google Sign-In Button */}
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full py-4 flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 rounded-xl font-bold tracking-wide text-sm transition-all group"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        <span className="group-hover:text-white transition-colors">Continue with Google</span>
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-white/30 text-xs uppercase tracking-widest">or</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Username only shown during Registration */}
                    {!isLogin && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="relative"
                        >
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                            <input 
                                type="text" 
                                placeholder="Username (optional)"
                                suppressHydrationWarning
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-indigo-500 transition-colors"
                                value={formData.username}
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                            />
                        </motion.div>
                    )}

                    {/* Email — always shown */}
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                        <input 
                            required
                            type="email" 
                            placeholder="Email Address"
                            suppressHydrationWarning
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-indigo-500 transition-colors"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    
                    {/* Password */}

                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                        <input 
                            required
                            type="password" 
                            placeholder="Password" 
                            suppressHydrationWarning
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
