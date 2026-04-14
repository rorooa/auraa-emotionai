"use client";

import React, { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

// Preload the default model
useGLTF.preload("/models/ai_avatar.glb");

// ─────────────────────────────────────────────────────────────────────────────
// 🧠 HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function findBone(group: THREE.Object3D, name: string): THREE.Bone | undefined {
    let found: THREE.Bone | undefined;
    group.traverse((obj) => {
        if (found) return;
        if ((obj as any).isBone && obj.name === name) {
            found = obj as THREE.Bone;
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
    const hasMorphTargets = useRef(false);

    // 1. Setup: hide junk geometry, cast shadows, detect morph targets
    useEffect(() => {
        hasMorphTargets.current = false;
        scene.traverse((child) => {
            const name = child.name.toLowerCase();
            if (name.includes("cube") || name.includes("box") || name.includes("bound")) {
                child.visible = false;
            }
            if ((child as any).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                // Check if this mesh has any morph targets
                const mesh = child as any;
                if (mesh.morphTargetDictionary && Object.keys(mesh.morphTargetDictionary).length > 0) {
                    hasMorphTargets.current = true;
                    console.log("[AIAvatar] Morph targets found:", Object.keys(mesh.morphTargetDictionary));
                }
            }
        });
        if (!hasMorphTargets.current) {
            console.log("[AIAvatar] No morph targets found — using bone-based lip sync.");
        }
    }, [scene]);

    // 2. Play baked animation if available (handles idle body motion)
    useEffect(() => {
        if (!actions || Object.keys(actions).length === 0) return;
        const firstActionName = Object.keys(actions)[0];
        const action = actions[firstActionName];
        if (action) {
            action.reset().fadeIn(0.5).play();
            action.setLoop(THREE.LoopRepeat, Infinity);
        }
        return () => { if (action) action.fadeOut(0.5); };
    }, [actions]);

    // 3. Main Frame Loop
    useFrame((state) => {
        if (!group.current) return;
        const t = state.clock.getElapsedTime();

        // --- A. POSITION & BREATHING ---
        group.current.position.y = -0.8 + Math.sin(t * 1.5) * 0.01;
        // Gentle body sway only if no baked animation
        if (!actions || Object.keys(actions).length === 0) {
            group.current.rotation.y = Math.sin(t * 0.5) * 0.03;
        }

        // --- B. FIX T-POSE: Lower arms naturally (ALWAYS runs) ---
        // Try all naming conventions: Blender, VRM J_Bip, and Mixamo
        const getNode = (names: string[]): THREE.Bone | undefined => {
            for (const name of names) {
                const bone = findBone(group.current!, name);
                if (bone) return bone;
            }
            return undefined;
        };

        const leftArm = getNode(["upper_arm.L", "J_Bip_L_UpperArm", "LeftArm"]);
        const rightArm = getNode(["upper_arm.R", "J_Bip_R_UpperArm", "RightArm"]);
        const leftForeArm = getNode(["lower_arm.L", "J_Bip_L_LowerArm", "LeftForeArm"]);
        const rightForeArm = getNode(["lower_arm.R", "J_Bip_R_LowerArm", "RightForeArm"]);

        if (leftArm) {
            leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, -1.2, 0.05);
            leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0.15, 0.05);
        }
        if (rightArm) {
            rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 1.2, 0.05);
            rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0.15, 0.05);
        }
        if (leftForeArm) {
            leftForeArm.rotation.z = THREE.MathUtils.lerp(leftForeArm.rotation.z, -0.3, 0.05);
        }
        if (rightForeArm) {
            rightForeArm.rotation.z = THREE.MathUtils.lerp(rightForeArm.rotation.z, 0.3, 0.05);
        }

        // --- C. LIP SYNC ---
        if (isSpeaking) {
            const cadence1 = Math.sin(t * 18); // Fast syllables
            const cadence2 = Math.sin(t * 7);  // Word pacing
            const rawJaw = (cadence1 * 0.4) + (cadence2 * 0.6);
            const jawOpen = THREE.MathUtils.clamp(rawJaw + 0.3, 0, 0.8);

            if (hasMorphTargets.current) {
                // Morph-target lip sync (ARKit + VRM conventions)
                const wideMouth = THREE.MathUtils.clamp(-rawJaw, 0, 0.5);
                const narrowMouth = THREE.MathUtils.clamp(cadence1, 0, 0.6);

                applyMorph(group.current, "jawOpen", jawOpen, 0.6);
                applyMorph(group.current, "Jaw_Open", jawOpen, 0.6);
                applyMorph(group.current, "mouthOpen", jawOpen * 0.8, 0.6);
                applyMorph(group.current, "Fcl_MTH_A", jawOpen * 0.8, 0.6);
                applyMorph(group.current, "mouthStretchLeft", wideMouth, 0.5);
                applyMorph(group.current, "mouthStretchRight", wideMouth, 0.5);
                applyMorph(group.current, "Fcl_MTH_E", wideMouth, 0.5);
                applyMorph(group.current, "mouthFunnel", narrowMouth * 0.5, 0.5);
                applyMorph(group.current, "Fcl_MTH_O", narrowMouth * 0.5, 0.5);
                applyMorph(group.current, "mouthPucker", narrowMouth * 0.3, 0.5);
                applyMorph(group.current, "Fcl_MTH_U", narrowMouth * 0.3, 0.5);
            } else {
                // BONE-BASED lip sync: rotate the Head bone slightly to simulate jaw
                const head = findBone(group.current, "Head");
                if (head) {
                    // Open jaw by rotating the head slightly forward (X axis)
                    const jawRotation = jawOpen * 0.12;
                    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, jawRotation, 0.3);
                }
            }
        } else {
            // Close mouth
            if (hasMorphTargets.current) {
                const mouthMorphs = [
                    "jawOpen", "Jaw_Open", "mouthOpen",
                    "mouthStretchLeft", "mouthStretchRight",
                    "mouthFunnel", "mouthPucker",
                    "Fcl_MTH_A", "Fcl_MTH_E", "Fcl_MTH_I", "Fcl_MTH_O", "Fcl_MTH_U"
                ];
                mouthMorphs.forEach(v => applyMorph(group.current!, v, 0, 0.2));
            } else {
                // Reset head bone rotation
                const head = findBone(group.current, "Head");
                if (head) {
                    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, 0, 0.15);
                }
            }
        }

        // --- D. BLINKING (bone-based: close eyes by scaling eye meshes) ---
        const blinkCycle = Math.sin(t * 2);
        const isBlinking = blinkCycle > 0.96;
        if (hasMorphTargets.current) {
            applyMorph(group.current, "eyeBlinkLeft", isBlinking ? 1 : 0, 0.4);
            applyMorph(group.current, "eyeBlinkRight", isBlinking ? 1 : 0, 0.4);
            applyMorph(group.current, "Fcl_EYE_Close", isBlinking ? 1 : 0, 0.4);
        }

        // --- E. EMOTION MAPPING ---
        if (hasMorphTargets.current) {
            const normalizedEmotion = emotion?.toLowerCase() || "neutral";
            const emotionMorphMap: Record<string, [string, number][]> = {
                happy: [["mouthSmileLeft", 0.6], ["mouthSmileRight", 0.6], ["cheekSquintLeft", 0.4], ["cheekSquintRight", 0.4], ["Fcl_ALL_Joy", 0.7]],
                sad: [["mouthFrownLeft", 0.5], ["mouthFrownRight", 0.5], ["browInnerUp", 0.6], ["Fcl_ALL_Sorrow", 0.7]],
                angry: [["browDownLeft", 0.7], ["browDownRight", 0.7], ["noseSneerLeft", 0.4], ["noseSneerRight", 0.4], ["Fcl_ALL_Angry", 0.7]],
                surprise: [["eyeWideLeft", 0.7], ["eyeWideRight", 0.7], ["browOuterUpLeft", 0.6], ["browOuterUpRight", 0.6], ["jawOpen", 0.4], ["Fcl_ALL_Surprised", 0.7]],
            };
            // Reset all
            const allMorphs = new Set<string>();
            Object.values(emotionMorphMap).forEach(pairs => pairs.forEach(([name]) => allMorphs.add(name)));
            allMorphs.forEach(morph => applyMorph(group.current!, morph, 0, 0.1));
            // Apply current
            const targetPairs = emotionMorphMap[normalizedEmotion];
            if (targetPairs) {
                targetPairs.forEach(([name, intensity]) => applyMorph(group.current!, name, intensity, 0.1));
            }
        }
    });

    return (
        <group ref={group} scale={1.2} dispose={null}>
            <primitive object={scene} />
        </group>
    );
};

export default AIAvatar;
