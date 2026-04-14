"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface ProactiveContent {
    type: string;
    title: string;
    url: string;
    source: string;
    thumbnail?: string;
}

interface ProactivePayload {
    message: string;
    content: ProactiveContent;
    reason: string;
}

interface ProactiveState {
    message: string;
    content: ProactiveContent;
}

/**
 * useProactiveCompanion — Listens for server-pushed proactive content,
 * adds a human-like delay, and provides the state to ChatOverlay.
 */
export function useProactiveCompanion(socketRef: React.MutableRefObject<any>) {
    const [proactiveMessage, setProactiveMessage] = useState<ProactiveState | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleProactive = (data: ProactivePayload) => {
            // Human-like delay (0.5s to 2s) before showing
            const delay = 500 + Math.random() * 1500;

            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            timeoutRef.current = setTimeout(() => {
                setProactiveMessage({
                    message: data.message,
                    content: data.content,
                });
            }, delay);
        };

        socket.on("proactive_content", handleProactive);

        return () => {
            socket.off("proactive_content", handleProactive);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [socketRef.current]);

    const clearProactiveMessage = useCallback(() => {
        setProactiveMessage(null);
    }, []);

    // Emit activity signal to backend
    const recordActivity = useCallback(() => {
        const socket = socketRef.current;
        if (socket?.connected) {
            socket.emit("user_activity", {});
        }
    }, [socketRef]);

    // Emit typing state to backend
    const setTyping = useCallback((isTyping: boolean) => {
        const socket = socketRef.current;
        if (socket?.connected) {
            socket.emit("user_typing", { typing: isTyping });
        }
    }, [socketRef]);

    // Emit speaking state to backend
    const setSpeaking = useCallback((isSpeaking: boolean) => {
        const socket = socketRef.current;
        if (socket?.connected) {
            socket.emit("speaking_state", { speaking: isSpeaking });
        }
    }, [socketRef]);

    return {
        proactiveMessage,
        clearProactiveMessage,
        recordActivity,
        setTyping,
        setSpeaking,
    };
}
