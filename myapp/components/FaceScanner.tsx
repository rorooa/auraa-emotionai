"use client";

import { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import { Thermometer, Lightbulb, Moon, Battery, Loader2 } from "lucide-react";

interface FaceScannerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isConnected: boolean;
    emotionCount?: number;
}

export default function FaceScanner({ videoRef, isConnected, emotionCount }: FaceScannerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);

    useEffect(() => {
        if (!isConnected) {
            setScanProgress(0);
            return;
        }
        
        // 8 second visual timer loop
        setScanProgress(0);
        const interval = setInterval(() => {
            setScanProgress(prev => {
                if (prev >= 100) return 0;
                return prev + (100 / 80); // 80 ticks of 100ms = 8000ms
            });
        }, 100);

        return () => clearInterval(interval);
    }, [isConnected]);

    useEffect(() => {
        const loadModels = async () => {
            try {
                // Using a CDN for the required face-api models to avoid needing to handle static assets
                const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (err) {
                console.error("Failed to load face-api models:", err);
            }
        };
        
        loadModels();
    }, []);

    useEffect(() => {
        if (!videoRef.current || !canvasRef.current || !isConnected || !modelsLoaded) return;

        const videoElement = videoRef.current;
        const canvasElement = canvasRef.current;
        const canvasCtx = canvasElement.getContext("2d");

        let animationFrameId: number;
        let isActive = true;

        const processFrame = async () => {
            if (!isActive || !videoElement || videoElement.readyState < 2 || !canvasCtx) return;
            
            try {
                // Resize the canvas to precisely match the video dimensions for accurate drawing
                const displaySize = { width: videoElement.videoWidth, height: videoElement.videoHeight };
                if (canvasElement.width !== displaySize.width || canvasElement.height !== displaySize.height) {
                    canvasElement.width = displaySize.width;
                    canvasElement.height = displaySize.height;
                }
                
                // Draw Video Frame as background matching the canvas aspect ratio
                canvasCtx.save();
                canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
                canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

                // Detect face landmarks
                const detections = await faceapi.detectSingleFace(
                    videoElement,
                    new faceapi.TinyFaceDetectorOptions()
                ).withFaceLandmarks();

                if (detections) {
                    // Adjust detections to canvas size
                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    const positions = resizedDetections.landmarks.positions;
                    
                    // Create sparse points for the geometric mesh
                    const p = [
                        positions[19], // 0: left brow
                        positions[27], // 1: nose root
                        positions[24], // 2: right brow
                        positions[2],  // 3: left cheek
                        positions[30], // 4: nose tip
                        positions[14], // 5: right cheek
                        positions[48], // 6: mouth left
                        positions[54], // 7: mouth right
                        positions[4],  // 8: jaw left
                        positions[8],  // 9: chin
                        positions[12], // 10: jaw right
                    ];

                    const lines = [
                        [0,1], [1,2], // brow line
                        [0,3], [3,8], [8,9], // left contour
                        [2,5], [5,10], [10,9], // right contour
                        [1,4], // nose bridge
                        [0,4], [2,4], // brows to nose
                        [3,4], [5,4], // cheeks to nose
                        [3,6], [5,7], // cheeks to mouth
                        [4,6], [4,7], // nose to mouth
                        [6,8], [7,10], // mouth to jaw
                        [6,9], [7,9], // mouth to chin
                    ];

                    canvasCtx.save();
                    
                    // Draw lines
                    canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.7)";
                    canvasCtx.lineWidth = 1;
                    lines.forEach(([i, j]) => {
                        if (!p[i] || !p[j]) return;
                        canvasCtx.beginPath();
                        canvasCtx.moveTo(p[i].x, p[i].y);
                        canvasCtx.lineTo(p[j].x, p[j].y);
                        canvasCtx.stroke();
                    });

                    // Draw points
                    canvasCtx.fillStyle = "rgba(255, 255, 255, 1)";
                    p.forEach((pt) => {
                        if (!pt) return;
                        canvasCtx.beginPath();
                        canvasCtx.arc(pt.x, pt.y, 2.5, 0, 2 * Math.PI);
                        canvasCtx.fill();
                    });
                    
                    canvasCtx.restore();
                }
                canvasCtx.restore();
                
            } catch (e) {
                // Ignore silent errors
            }
            
            if (isActive) {
                // Slightly throttle the frame rate to avoid locking up the UI thread completely
                setTimeout(() => {
                    if (isActive) {
                         animationFrameId = requestAnimationFrame(processFrame);
                    }
                }, 100); 
            }
        };

        const startCamera = () => {
             if (videoElement.srcObject && isActive) {
                 processFrame();
             }
        }

        if (videoElement.readyState >= 2) {
             startCamera();
        } else {
             videoElement.addEventListener('loadeddata', startCamera);
        }

        return () => {
            isActive = false;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            videoElement.removeEventListener('loadeddata', startCamera);
        };
    }, [videoRef, isConnected, modelsLoaded]);

    if (!isConnected) return null;

    return (
        <div className="relative w-32 flex flex-col items-center gap-1 font-mono pointer-events-auto filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
            <style>{`
                .stripes {
                    background-image: repeating-linear-gradient(
                        -45deg,
                        transparent,
                        transparent 4px,
                        rgba(255,255,255,0.4) 4px,
                        rgba(255,255,255,0.4) 8px
                    );
                }
            `}</style>
            
            {/* Top HUD Header */}
            <div className="w-full flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/90 pl-1">
                    Scanning
                </span>
                <div className="flex items-center gap-2 w-full">
                    <Loader2 size={16} className="animate-spin text-white/80 shrink-0" />
                    <div className="flex-1 h-5 border border-white/60 skew-x-[-30deg] relative overflow-hidden flex items-center bg-black/20">
                        <div 
                            className="absolute inset-y-0 left-0 h-full stripes bg-indigo-500/50 transition-all duration-100 ease-linear" 
                            style={{ width: `${scanProgress}%` }}
                        />
                        <span className="skew-x-[30deg] text-[10px] font-bold text-white w-full text-center tracking-widest z-10 drop-shadow-md">
                            {Math.round(scanProgress)}%
                        </span>
                    </div>
                </div>
                
                {/* 3 Count Trigger Indicators */}
                <div className="flex items-center justify-between w-full px-2 mt-1">
                    <span className="text-[8px] uppercase tracking-widest text-slate-400">Trigger</span>
                    <div className="flex gap-1">
                        {[1, 2].map((step) => (
                            <div 
                                key={step} 
                                className={`w-2 h-2 rounded-full border border-white/50 transition-colors ${
                                    (emotionCount || 0) >= step ? 'bg-indigo-400 shadow-[0_0_5px_#818cf8]' : 'bg-transparent'
                                }`} 
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Video Frame */}
            <div className="relative w-full aspect-square border border-white/70 overflow-hidden bg-black/40 flex items-center justify-center">
                {modelsLoaded ? (
                    <canvas ref={canvasRef} className="w-full h-full object-cover transform -scale-x-100" />
                ) : (
                    <div className="text-[10px] text-white/60 font-bold uppercase tracking-widest animate-pulse">
                        Loading Models...
                    </div>
                )}
            </div>


        </div>
    );
}
