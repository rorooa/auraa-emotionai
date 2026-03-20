"use client";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useEffect } from "react";

export default function GlassPanel({ children, className = "", tilt = false }: { children: React.ReactNode, className?: string, tilt?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x, { stiffness: 100, damping: 30 });
    const mouseYSpring = useSpring(y, { stiffness: 100, damping: 30 });

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

    useEffect(() => {
        if (!tilt) return;
        const handleMouseMove = (e: MouseEvent) => {
            const rx = (e.clientX / window.innerWidth) - 0.5;
            const ry = (e.clientY / window.innerHeight) - 0.5;
            x.set(rx);
            y.set(ry);
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [tilt, x, y]);

    return (
        <motion.div
            ref={ref}
            style={tilt ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined}
            className={`bg-[#0a0a0f]/40 backdrop-blur-[40px] border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] rounded-[2rem] overflow-hidden relative ${className}`}
        >
            {/* Inner highlight for premium glass effect */}
            <div className="absolute inset-0 border border-white/5 rounded-[2rem] pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none fade-in duration-1000" />
            
            {children}
        </motion.div>
    );
}
