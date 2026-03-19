"use client";

import React, { useEffect, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, Environment, Float, useGLTF, ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import AIAvatar from "./AIAvatar";

// ─────────────────────────────────────────────────────────────────────────────
// 🧠 SHARED MOUSE TRACKING
// ─────────────────────────────────────────────────────────────────────────────
function useMouse() {
    const mouse = useRef({ x: 0, y: 0 });
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            mouse.current = {
                x: (e.clientX / window.innerWidth - 0.5) * 2,
                y: (e.clientY / window.innerHeight - 0.5) * -2,
            };
        };
        window.addEventListener("mousemove", onMove);
        return () => window.removeEventListener("mousemove", onMove);
    }, []);
    return mouse;
}

function findByName(group: THREE.Object3D, ...keywords: string[]): THREE.Object3D | undefined {
    let found: THREE.Object3D | undefined;
    group.traverse((obj) => {
        if (found) return;
        const name = obj.name.toLowerCase();
        if (keywords.every(k => name.includes(k.toLowerCase()))) found = obj;
    });
    return found;
}

function applyMorph(group: THREE.Object3D, morphName: string, targetValue: number, lerpFactor = 0.15) {
    group.traverse((child) => {
        const mesh = child as any;
        if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
            const idx = mesh.morphTargetDictionary[morphName];
            if (idx !== undefined) {
                mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[idx], targetValue, lerpFactor);
            }
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 🤖 CLASSIC BOT
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// 🤖 EXPRESSIVE CLASSIC BOT
// ─────────────────────────────────────────────────────────────────────────────
const ClassicAvatar = ({ emotion, isSpeaking }: { emotion: string; isSpeaking: boolean }) => {
    const headRef = useRef<THREE.Group>(null);
    const eyeLRef = useRef<THREE.Group>(null);
    const eyeRRef = useRef<THREE.Group>(null);
    const mouthRef = useRef<THREE.Mesh>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const mouse = useMouse();
    
    // Emotion-specific config: color, eye rotation (Z), mouth rotation (Z), mouth scale
    const emotionConfig = {
        neutral: { color: "#00aaff", eyeRot: 0, mouthRot: Math.PI, mouthScale: [1, 0.1, 1], eyeScale: [1, 0.8, 1] },
        happy:   { color: "#00ffcc", eyeRot: 0, mouthRot: Math.PI, mouthScale: [1.2, 0.8, 1], eyeScale: [1, 0.5, 1] },
        sad:     { color: "#0044ff", eyeRot: Math.PI, mouthRot: 0, mouthScale: [1.0, 0.6, 1], eyeScale: [1, 0.5, 1] },
        angry:   { color: "#ff2222", eyeRot: 0.5, mouthRot: 0, mouthScale: [1.4, 0.1, 1], eyeScale: [1, 0.3, 1] },
        fear:    { color: "#ffcc00", eyeRot: 0, mouthRot: Math.PI, mouthScale: [0.5, 1.2, 1], eyeScale: [0.5, 1.2, 1] },
        disgust: { color: "#88ff00", eyeRot: -0.2, mouthRot: 0, mouthScale: [1.2, 0.4, 1], eyeScale: [1, 0.2, 1] },
        surprise:{ color: "#ffffff", eyeRot: 0, mouthRot: Math.PI, mouthScale: [1.0, 1.4, 1], eyeScale: [1.4, 1.5, 1] },
    } as any;

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        // Normalize emotion and default to neutral
        const currentEmotion = emotion?.toLowerCase() || "neutral";
        const config = emotionConfig[currentEmotion] || emotionConfig.neutral;

        if (headRef.current) {
            // Direct X tracking (Look Right when mouse is Right)
            // Inverted Y tracking (Look Up when mouse is Top)
            headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, mouse.current.x * 0.4, 0.1);
            headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -mouse.current.y * 0.2, 0.1);
            headRef.current.position.y = Math.sin(t * 2) * 0.05; // Gentle float
        }
        
        const targetColor = new THREE.Color(config.color);
        
        // Handle Eyes
        [eyeLRef, eyeRRef].forEach(ref => {
            if (ref.current) {
                ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, config.eyeRot, 0.1);
                ref.current.scale.x = THREE.MathUtils.lerp(ref.current.scale.x, config.eyeScale?.[0] || 1, 0.1);
                ref.current.scale.y = THREE.MathUtils.lerp(ref.current.scale.y, config.eyeScale?.[1] || 1, 0.1);
                ref.current.traverse((child: any) => {
                    if (child.isMesh) {
                        child.material.emissive.lerp(targetColor, 0.1);
                        child.material.color.lerp(targetColor, 0.1);
                    }
                });
            }
        });

        // Handle Mouth
        if (mouthRef.current) {
            const mouthSpeakScale = isSpeaking ? 1.5 + Math.sin(t * 25) * 0.5 : 1.0;
            mouthRef.current.rotation.z = THREE.MathUtils.lerp(mouthRef.current.rotation.z, config.mouthRot, 0.1);
            mouthRef.current.scale.x = THREE.MathUtils.lerp(mouthRef.current.scale.x, config.mouthScale[0], 0.1);
            mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, config.mouthScale[1] * mouthSpeakScale, 0.1);
            (mouthRef.current.material as THREE.MeshStandardMaterial).emissive.lerp(targetColor, 0.1);
            (mouthRef.current.material as THREE.MeshStandardMaterial).color.lerp(targetColor, 0.1);
        }

        // Handle Core
        if (coreRef.current) {
            coreRef.current.scale.setScalar(0.8 + Math.sin(t * 4) * 0.2);
            (coreRef.current.material as THREE.MeshStandardMaterial).emissive.lerp(targetColor, 0.1);
            (coreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 2 + Math.sin(t * 3) * 1;
        }
    });

    return (
        <group scale={0.4} position={[0, 1.1, 0]}>
            <group ref={headRef}>
                {/* Glass Outer Shell */}
                <mesh>
                    <sphereGeometry args={[0.9, 32, 32]} />
                    <meshStandardMaterial color="#0f172a" transparent opacity={0.2} metalness={0.9} roughness={0.1} />
                </mesh>

                {/* Neural Core */}
                <mesh ref={coreRef}>
                    <octahedronGeometry args={[0.4, 2]} />
                    <meshStandardMaterial emissiveIntensity={5} transparent opacity={0.8} />
                </mesh>

                {/* Expressive Eyes */}
                <group position={[-0.35, 0.2, 0.7]} ref={eyeLRef}>
                    <mesh rotation={[Math.PI/2, 0, 0]}>
                        <torusGeometry args={[0.15, 0.05, 16, 32, Math.PI]} />
                        <meshStandardMaterial emissiveIntensity={3} />
                    </mesh>
                </group>
                <group position={[0.35, 0.2, 0.7]} ref={eyeRRef}>
                    <mesh rotation={[Math.PI/2, 0, 0]}>
                        <torusGeometry args={[0.15, 0.05, 16, 32, Math.PI]} />
                        <meshStandardMaterial emissiveIntensity={3} />
                    </mesh>
                </group>

                {/* Expressive Mouth */}
                <mesh position={[0, -0.3, 0.75]} ref={mouthRef}>
                    <torusGeometry args={[0.2, 0.04, 16, 32, Math.PI]} />
                    <meshStandardMaterial emissiveIntensity={3} />
                </mesh>
            </group>
        </group>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// 🚀 MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function AvatarScene({ emotion, isSpeaking, avatarId = "female" }: { emotion: string; isSpeaking: boolean; avatarId?: string }) {
    return (
        <div className="w-full h-full"> 
            <Canvas camera={{ position: [0, 1.4, 2.0], fov: 35 }} gl={{ antialias: true, alpha: true }}>
                <ambientLight intensity={5.0} />
                <directionalLight position={[0, 5, 5]} intensity={6.0} color="#ffffff" castShadow />
                <directionalLight position={[-5, 2, 2]} intensity={3.5} color="#ffffff" />
                <Environment preset="studio" />
                
                {/* Camera Control: Locks the camera onto the upper body */}
                <OrbitControls 
                    target={[0, 1.1, 0]} 
                    enablePan={false} 
                    enableZoom={false}
                    minPolarAngle={Math.PI / 2 - 0.2}
                    maxPolarAngle={Math.PI / 2 + 0.1}
                />

                {/* Stage Position: Centered in its 40% container */}
                <group position={[0, 0, 0]}>
                    <Suspense fallback={null}>
                        {avatarId === "ai" && <AIAvatar modelPath="/models/ai_avatar.glb" emotion={emotion} isSpeaking={isSpeaking} />}
                        {avatarId === "classic" && <ClassicAvatar emotion={emotion} isSpeaking={isSpeaking} />}
                    </Suspense>
                </group>
            </Canvas>
        </div>
    );
}
