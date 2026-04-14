"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface Participant {
    sid: string;
    name: string;
    emotion: string;
    joined_at: number;
}

interface RoomData {
    room_id: string;
    room_type: "solo" | "sync" | "group";
    participants: Participant[];
    participant_count: number;
    max_participants: number;
    room_aura: string;
    sync_meter: number | null;
    created_at: number;
    is_public: boolean;
}

interface RoomMessage {
    sender: string;
    sender_sid: string;
    content: string;
    role: "user" | "ai";
    emotion: string;
    timestamp: number;
}

interface UseTherapyRoomReturn {
    socket: Socket | null;
    isConnected: boolean;
    roomData: RoomData | null;
    messages: RoomMessage[];
    participants: Participant[];
    roomAura: string;
    syncMeter: number;
    isMatching: boolean;
    matchStatus: string;
    error: string | null;
    createRoom: (roomType: string, name: string) => void;
    joinRoom: (roomId: string, name: string) => void;
    leaveRoom: () => void;
    sendMessage: (content: string, sender: string, emotion: string) => void;
    updateEmotion: (emotion: string) => void;
    quickMatch: (name: string, emotion: string) => void;
    cancelMatch: () => void;
    clearError: () => void;
}

export function useTherapyRoom(): UseTherapyRoomReturn {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [roomData, setRoomData] = useState<RoomData | null>(null);
    const [messages, setMessages] = useState<RoomMessage[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [roomAura, setRoomAura] = useState("neutral");
    const [syncMeter, setSyncMeter] = useState(0);
    const [isMatching, setIsMatching] = useState(false);
    const [matchStatus, setMatchStatus] = useState("");
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<Socket | null>(null);

    // Initialize socket connection
    useEffect(() => {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
        const newSocket = io(backendUrl, {
            transports: ["polling"],
            path: "/socket.io/",
        });

        newSocket.on("connect", () => {
            setIsConnected(true);
            console.log("[TherapyRoom] Socket connected");
        });

        newSocket.on("disconnect", () => {
            setIsConnected(false);
            console.log("[TherapyRoom] Socket disconnected");
        });

        // Room events
        newSocket.on("room_created", (data: RoomData) => {
            setRoomData(data);
            setParticipants(data.participants);
            setMessages([]);
            console.log("[TherapyRoom] Room created:", data.room_id);
        });

        newSocket.on("room_joined", (data: RoomData) => {
            setRoomData(data);
            setParticipants(data.participants);
            setMessages([]);
            console.log("[TherapyRoom] Joined room:", data.room_id);
        });

        newSocket.on("room_update", (data: RoomData) => {
            setRoomData(data);
            setParticipants(data.participants);
            if (data.sync_meter !== null) setSyncMeter(data.sync_meter);
        });

        newSocket.on("room_left", () => {
            setRoomData(null);
            setParticipants([]);
            setMessages([]);
            setRoomAura("neutral");
            setSyncMeter(0);
        });

        newSocket.on("room_message", (msg: RoomMessage) => {
            setMessages(prev => [...prev, msg]);
        });

        newSocket.on("room_emotions", (data: { participants: Participant[]; room_aura: string; sync_meter?: number }) => {
            setParticipants(data.participants);
            setRoomAura(data.room_aura);
            if (data.sync_meter !== undefined) setSyncMeter(data.sync_meter);
        });

        newSocket.on("room_error", (data: { error: string }) => {
            setError(data.error);
            setTimeout(() => setError(null), 5000);
        });

        // Matchmaking events
        newSocket.on("match_queued", (data: { status: string; message: string }) => {
            setIsMatching(true);
            setMatchStatus(data.message);
        });

        newSocket.on("match_found", (data: RoomData) => {
            setIsMatching(false);
            setMatchStatus("");
            setRoomData(data);
            setParticipants(data.participants);
            setMessages([]);
            console.log("[TherapyRoom] Match found! Room:", data.room_id);
        });

        newSocket.on("match_cancelled", () => {
            setIsMatching(false);
            setMatchStatus("");
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const createRoom = useCallback((roomType: string, name: string) => {
        socketRef.current?.emit("create_room", { room_type: roomType, name });
    }, []);

    const joinRoom = useCallback((roomId: string, name: string) => {
        socketRef.current?.emit("join_room", { room_id: roomId, name });
    }, []);

    const leaveRoom = useCallback(() => {
        socketRef.current?.emit("leave_room", {});
        setRoomData(null);
        setParticipants([]);
        setMessages([]);
    }, []);

    const sendMessage = useCallback((content: string, sender: string, emotion: string) => {
        socketRef.current?.emit("room_message", { content, sender, emotion });
    }, []);

    const updateEmotion = useCallback((emotion: string) => {
        socketRef.current?.emit("room_emotion", { emotion });
    }, []);

    const quickMatch = useCallback((name: string, emotion: string) => {
        socketRef.current?.emit("quick_match", { name, emotion });
    }, []);

    const cancelMatch = useCallback(() => {
        socketRef.current?.emit("cancel_match", {});
        setIsMatching(false);
        setMatchStatus("");
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return {
        socket,
        isConnected,
        roomData,
        messages,
        participants,
        roomAura,
        syncMeter,
        isMatching,
        matchStatus,
        error,
        createRoom,
        joinRoom,
        leaveRoom,
        sendMessage,
        updateEmotion,
        quickMatch,
        cancelMatch,
        clearError,
    };
}
