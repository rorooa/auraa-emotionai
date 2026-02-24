"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, School, Lightbulb } from "lucide-react";

export default function AboutUs() {
    const router = useRouter();

    const sections = [
        {
            title: "Our Team",
            icon: <Users className="text-indigo-400" size={32} />,
            content: "We are a group of passionate developers and researchers dedicated to bridging the gap between human emotions and artificial intelligence. Our team combines expertise in Machine Learning, Frontend Engineering, and Emotional Intelligence to create AURAA."
        },
        {
            title: "Our College",
            icon: <School className="text-purple-400" size={32} />,
            content: "Developed as a flagship project within our institution, AURAA represents the pinnacle of our technical curriculum and the innovative spirit of our academic community. We take pride in representing our college's commitment to cutting-edge technology."
        },
        {
            title: "The Project",
            icon: <Lightbulb className="text-teal-400" size={32} />,
            content: "AURAA (Emotion AI) is designed to detect, understand, and provide support based on human emotional states. By using advanced facial recognition and sentimental analysis, it creates a unique companion experience that truly lives up to its motto: 'An AI That Understands You — Beyond Words'."
        }
    ];

    return (
        <main className="min-h-screen w-full bg-black font-jura text-white p-8 md:p-16 relative overflow-hidden">
            {/* VIDEO BACKGROUND (Subtle) */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-10"
                >
                    <source src="/background.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            </div>

            {/* Background Glows */}
            <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Back Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => router.back()}
                className="mb-12 flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
            >
                <ArrowLeft size={24} />
                <span className="text-xl font-bold">Back to Dashboard</span>
            </motion.button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto"
            >
                <h1 className="text-6xl font-bold mb-4 tracking-tighter">About Us</h1>
                <p className="text-xl text-gray-400 mb-16 max-w-2xl">
                    Discover the story behind AURAA and the visionaries who brought this Emotion AI to life.
                </p>

                <div className="grid gap-8">
                    {sections.map((section, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ scale: 1.02, y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}
                            transition={{ delay: index * 0.2 }}
                            className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-all group relative z-10"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                {section.icon}
                                <h2 className="text-2xl font-bold">{section.title}</h2>
                            </div>
                            <p className="text-lg text-gray-300 leading-relaxed">
                                {section.content}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Bottom Credits */}
            <div className="mt-24 text-center opacity-30 text-sm">
                © 2026 AURAA Project Team. All Rights Reserved.
            </div>
        </main>
    );
}
