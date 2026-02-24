"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useFBX, useAnimations, Environment, Float, useGLTF } from "@react-three/drei";
import * as THREE from "three";

// -------------------------------------------------------------------------
// 🛠️ SHARED HOLOGRAPHIC MATERIALS
// -------------------------------------------------------------------------
const WireframeMaterial = {
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#00aaff") },
        uOpacity: { value: 0.6 },
    },
    vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
            vPosition = position;
            vNormal = normal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
            vec3 viewDirection = normalize(vec3(0.0, 0.0, 1.0));
            float fresnel = pow(1.2 - dot(vNormal, viewDirection), 3.0);
            float pulse = sin(uTime * 1.2) * 0.05 + 0.95;
            float grid = sin(vPosition.x * 60.0) * sin(vPosition.y * 60.0) * sin(vPosition.z * 60.0);
            grid = step(0.97, grid);
            float alpha = uOpacity * (fresnel + grid * 0.4) * pulse;
            gl_FragColor = vec4(uColor, alpha);
        }
    `
};

// -------------------------------------------------------------------------
// 🤖 AVATAR 1: CLAUDIA (FBX Wireframe)
// -------------------------------------------------------------------------
const ClaudiaAvatar = ({ emotion, isSpeaking }: { emotion: string; isSpeaking: boolean }) => {
    const group = useRef<THREE.Group>(null);
    const fbx = useFBX("/models/rp_claudia/rp_claudia_rigged_002_yup_a.fbx");
    const { actions, names } = useAnimations(fbx.animations, group);
    const holoColor = useMemo(() => new THREE.Color("#00aaff"), []);

    useEffect(() => {
        fbx.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).material = new THREE.ShaderMaterial({
                    ...WireframeMaterial,
                    transparent: true,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide,
                });
            }
        });
    }, [fbx]);

    useEffect(() => {
        if (actions && names.length > 0) {
            const clipName = names.find(n => n.toLowerCase().includes("idle") || n.toLowerCase().includes("gesture")) || names[0];
            actions[clipName]?.reset().fadeIn(0.5).play();
        }
    }, [actions, names]);

    useFrame((state) => {
        if (!group.current) return;
        const t = state.clock.getElapsedTime();
        fbx.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mat = (child as THREE.Mesh).material as THREE.ShaderMaterial;
                if (mat.uniforms) {
                    mat.uniforms.uTime.value = t;
                    mat.uniforms.uColor.value.lerp(holoColor, 0.1);
                    mat.uniforms.uOpacity.value = isSpeaking ? 0.8 + Math.sin(t * 20) * 0.1 : 0.6;
                }
            }
        });
        if (isSpeaking) {
            group.current.position.x = Math.sin(t * 80) * 0.002;
            group.current.scale.setScalar(0.012 + Math.sin(t * 15) * 0.0004);
        } else {
            group.current.position.x = 0;
            group.current.scale.setScalar(0.012);
        }
    });

    return (
        <group ref={group} scale={0.012} position={[0, -0.1, 0]}>
            <primitive object={fbx} />
        </group>
    );
};

// -------------------------------------------------------------------------
// 🤖 AVATAR 2: CLASSIC EMOTION BOT (The 1st Avatar)
// -------------------------------------------------------------------------
const ClassicAvatar = ({ emotion, isSpeaking }: { emotion: string; isSpeaking: boolean }) => {
    const headRef = useRef<THREE.Group>(null);
    const eyeLRef = useRef<THREE.Mesh>(null);
    const eyeRRef = useRef<THREE.Mesh>(null);
    const mouthRef = useRef<THREE.Mesh>(null);

    // Emotion Color Mapping
    const emotionColors = useMemo(() => ({
        neutral: "#00aaff",
        happy: "#00ffcc",
        sad: "#0044ff",
        angry: "#ff2222",
        fear: "#aa00ff"
    }), []);

    const currentColor = new THREE.Color(emotionColors[emotion as keyof typeof emotionColors] || emotionColors.neutral);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();

        // Subtle head movement
        if (headRef.current) {
            headRef.current.rotation.y = Math.sin(t * 0.5) * 0.2;
            headRef.current.rotation.x = Math.cos(t * 0.3) * 0.1;

            if (isSpeaking) {
                headRef.current.position.y = Math.sin(t * 20) * 0.02;
            } else {
                headRef.current.position.y = 0;
            }
        }

        // Color transitions for eyes and mouth
        [eyeLRef, eyeRRef, mouthRef].forEach(ref => {
            if (ref.current) {
                (ref.current.material as THREE.MeshStandardMaterial).emissive.lerp(currentColor, 0.1);
                (ref.current.material as THREE.MeshStandardMaterial).color.lerp(currentColor, 0.1);
            }
        });

        // Mouth animation when speaking
        if (mouthRef.current && isSpeaking) {
            mouthRef.current.scale.y = 0.5 + Math.sin(t * 30) * 0.5;
        } else if (mouthRef.current) {
            mouthRef.current.scale.y = 0.2;
        }
    });

    return (
        <group scale={0.6} position={[0, 0.5, 0]}>
            {/* The Body */}
            <mesh position={[0, -1.2, 0]}>
                <capsuleGeometry args={[0.6, 1.2, 4, 16]} />
                <meshStandardMaterial
                    color="#1e293b"
                    transparent
                    opacity={0.4}
                    wireframe
                />
            </mesh>

            {/* The Head Group */}
            <group ref={headRef}>
                {/* Round Face (Sphere) */}
                <mesh>
                    <sphereGeometry args={[0.8, 32, 32]} />
                    <meshStandardMaterial
                        color="#0f172a"
                        transparent
                        opacity={0.3}
                        roughness={0.1}
                        metalness={0.8}
                    />
                </mesh>

                {/* Holographic Outline */}
                <mesh scale={1.05}>
                    <sphereGeometry args={[0.8, 32, 32]} />
                    <meshBasicMaterial color="#00aaff" wireframe transparent opacity={0.1} />
                </mesh>

                {/* Left Eye */}
                <mesh ref={eyeLRef} position={[-0.3, 0.2, 0.65]}>
                    <sphereGeometry args={[0.1, 16, 16]} />
                    <meshStandardMaterial emissiveIntensity={2} />
                </mesh>

                {/* Right Eye */}
                <mesh ref={eyeRRef} position={[0.3, 0.2, 0.65]}>
                    <sphereGeometry args={[0.1, 16, 16]} />
                    <meshStandardMaterial emissiveIntensity={2} />
                </mesh>

                {/* Mouth */}
                <mesh ref={mouthRef} position={[0, -0.2, 0.7]} rotation={[0, 0, 0]}>
                    <boxGeometry args={[0.3, 0.1, 0.05]} />
                    <meshStandardMaterial emissiveIntensity={2} />
                </mesh>
            </group>
        </group>
    );
};

// -------------------------------------------------------------------------
// 🛸 PROJECTOR BASE
// -------------------------------------------------------------------------
const ProjectorBase = ({ color }: { color: THREE.Color }) => (
    <group position={[0, -0.4, 0]} scale={0.4}>
        <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.9, 1.0, 64]} />
            <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
    </group>
);

interface AvatarSceneProps {
    emotion: string;
    isSpeaking: boolean;
    avatarId?: string;
}

export default function AvatarScene({ emotion, isSpeaking, avatarId = "avatar1" }: AvatarSceneProps) {
    const holoColor = useMemo(() => new THREE.Color("#00aaff"), []);

    return (
        <div className="w-full h-full min-h-[600px] cursor-default">
            <Canvas camera={{ position: [0, 0, 5], fov: 30 }}>
                <color attach="background" args={['#020617']} />
                <ambientLight intensity={0.9} />
                <pointLight position={[10, 10, 10]} intensity={3} color="#00aaff" />
                <Environment preset="night" />

                <group position={[-0.8, -0.8, 0]}>
                    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                        {avatarId === "avatar1" ? (
                            <ClaudiaAvatar emotion={emotion} isSpeaking={isSpeaking} />
                        ) : (
                            <ClassicAvatar emotion={emotion} isSpeaking={isSpeaking} />
                        )}
                    </Float>
                    <ProjectorBase color={holoColor} />
                </group>
            </Canvas>
        </div>
    );
}
