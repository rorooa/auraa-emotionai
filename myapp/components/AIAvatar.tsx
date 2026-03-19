"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

// Preload the model
useGLTF.preload("/models/ai_avatar.glb");

// ─────────────────────────────────────────────────────────────────────────────
// 🧠 HELPER FUNCTIONS
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
        // VRM models sometimes hide bones in a slightly different type or naming convention
        const isLikelyBone = (obj as any).isBone || obj.type === "Bone" || name.includes("bip");
        if (keywords.some((k) => name.includes(k.toLowerCase()))) {
            if (isLikelyBone || keywords.includes("neck") || keywords.includes("head")) {
                found = obj;
            }
        }
    });
    return found;
}

function applyMorph(group: THREE.Object3D, morphName: string, targetValue: number, lerpFactor = 0.15) {
    group.traverse((child) => {
        const mesh = child as any;
        if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
            const idx = mesh.morphTargetDictionary[morphName];
            if (idx !== undefined) {
                mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
                    mesh.morphTargetInfluences[idx],
                    targetValue,
                    lerpFactor
                );
            }
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎌 AI AVATAR
// ─────────────────────────────────────────────────────────────────────────────
interface AIAvatarProps {
    modelPath: string;
    emotion: string;
    isSpeaking: boolean;
}

const AIAvatar = ({ modelPath, emotion, isSpeaking }: AIAvatarProps) => {
    const group = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF(modelPath);
    const { actions } = useAnimations(animations, group);
    const mouse = useMouse();

    // 1. Hide unwanted geometry and setup shadows
    useEffect(() => {
        scene.traverse((child) => {
            const name = child.name.toLowerCase();
            if (name.includes("cube") || name.includes("box") || name.includes("bound")) {
                child.visible = false;
            }
            if ((child as any).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }, [scene]);

    // Track active viseme timer
    const visemeClock = useRef({ lastSwitch: 0, currentViseme: "" });
    const ALL_VISEMES = ["Fcl_MTH_A", "Fcl_MTH_E", "Fcl_MTH_I", "Fcl_MTH_O", "Fcl_MTH_U"];

    // 2. Play Idle Animation if any exists in the GLB
    useEffect(() => {
        // We are disabling baked animations to prevent them from locking bones in T-pose
        /*
        if (!actions) return;
        ...
        */
        return () => {};
    }, [actions]);

    // 3. Main Frame Loop
    useFrame((state) => {
        if (!group.current) return;
        
        const t = state.clock.getElapsedTime();

        // --- A. HEAD / CURSOR TRACKING ---
        const head = findByName(group.current, "head") || findByName(group.current, "neck");
        if (head) {
            // Target limits map max look angle
            const maxLookX = 0.5;
            const maxLookY = 0.3;
            // Smoothly look at cursor
            // Smoothly look at cursor (Direct X, Inverted Y for natural look)
            const targetY = THREE.MathUtils.clamp((mouse.current?.x || 0) * 0.5, -maxLookX, maxLookX);
            const targetX = THREE.MathUtils.clamp(-(mouse.current?.y || 0) * 0.3, -maxLookY, maxLookY);
            
            head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetY, 0.1);
            head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetX, 0.1);
        }

        // --- B. IDLE ANIMATION & T-POSE FIX ---
        // Breathing effect: slight up/down movement of chest + gentle body sway
        group.current.position.y = -1.4 + Math.sin(t * 1.5) * 0.015; 
        group.current.rotation.y = Math.sin(t * 0.5) * 0.05;

        // Procedural Arm Movements (T-Pose Fix and Hand Idling)
        const leftArm = findByName(group.current, "j_bip_l_upperarm", "l_upperarm", "upperarm_l", "arm_l", "leftarm") || group.current.getObjectByName("upper_arm.L");
        const rightArm = findByName(group.current, "j_bip_r_upperarm", "r_upperarm", "upperarm_r", "arm_r", "rightarm") || group.current.getObjectByName("upper_arm.R");
        const leftForeArm = findByName(group.current, "j_bip_l_lowerarm", "l_lowerarm", "lowerarm_l", "forearm_l", "leftforearm") || group.current.getObjectByName("lower_arm.L");
        const rightForeArm = findByName(group.current, "j_bip_r_lowerarm", "r_lowerarm", "lowerarm_r", "forearm_r", "rightforearm") || group.current.getObjectByName("lower_arm.R");
        
        if (leftArm && rightArm) {
            // Updated: Removed hand movement during speaking as per user request.
            // Arms now stay relaxed at the sides in all states.
            leftArm.rotation.set(-0.1, 0, -1.4, "XYZ"); 
            rightArm.rotation.set(-0.1, 0, 1.4, "XYZ");

            if (leftForeArm) leftForeArm.rotation.set(-0.2, 0, 0, "XYZ");
            if (rightForeArm) rightForeArm.rotation.set(-0.2, 0, 0, "XYZ");
        }

        // --- C. BLINKING SYSTEM ---
        // Natural blinking every 2-5 seconds
        const blinkCycle = Math.sin(t * 2);
        // If blinkCycle is very high, it"s a blink. We make it snappy.
        const isBlinking = blinkCycle > 0.96; 
        applyMorph(group.current, "Fcl_EYE_Close", isBlinking ? 1 : 0, 0.4);

        // --- D. EMOTION MAPPING ---
        const normalizedEmotion = emotion?.toLowerCase() || "neutral";
        
        const activeEmotions = {
            happy: "Fcl_ALL_Joy",
            sad: "Fcl_ALL_Sorrow",
            angry: "Fcl_ALL_Angry",
            surprised: "Fcl_ALL_Surprised",
            surprise: "Fcl_ALL_Surprised",
            fear: "Fcl_ALL_Surprised", // Fallback for fear
            disgust: "Fcl_ALL_Angry"   // Fallback for disgust
        };
        
        // Reset non-active emotions
        Object.values(activeEmotions).forEach((morph) => {
            if (activeEmotions[normalizedEmotion as keyof typeof activeEmotions] !== morph) {
                applyMorph(group.current!, morph, 0, 0.1);
            }
        });
        
        // Apply target emotion
        const targetMorph = activeEmotions[normalizedEmotion as keyof typeof activeEmotions];
        if (targetMorph) {
            applyMorph(group.current, targetMorph, 0.8, 0.1);
        }

        // --- E. LIP SYNC SYTEM ---
        if (isSpeaking) {
            // Switch viseme every 50-150ms
            if (t - visemeClock.current.lastSwitch > 0.05 + Math.random() * 0.1) {
                visemeClock.current.lastSwitch = t;
                // Pick random viseme, weighted a bit
                const v = ALL_VISEMES[Math.floor(Math.random() * ALL_VISEMES.length)];
                visemeClock.current.currentViseme = v;
            }
            // Lerp active viseme up, others down
            ALL_VISEMES.forEach((v) => {
                const targetIntensity = (v === visemeClock.current.currentViseme) ? 0.7 + Math.random() * 0.3 : 0;
                applyMorph(group.current!, v, targetIntensity, 0.3);
            });
            // Also add slight jaw opening procedurally
            applyMorph(group.current, "Jaw_Open", 0.2 + Math.random() * 0.2, 0.3);
        } else {
            // Close mouth
            ALL_VISEMES.forEach((v) => {
                applyMorph(group.current!, v, 0, 0.2);
            });
            applyMorph(group.current, "Jaw_Open", 0, 0.2);
        }
    });

    return (
        <group ref={group} scale={1.5} position={[0, 8.2, 0]} dispose={null}>
            <primitive object={scene} />
        </group>
    );
};

export default AIAvatar;
