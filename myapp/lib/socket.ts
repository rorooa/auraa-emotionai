import { io, Socket } from "socket.io-client";

let socket: Socket;

export const getSocket = () => {
    if (!socket) {
        // In production, connect to the deployed backend URL directly
        // In dev, use empty string (proxied via next.config.ts rewrites)
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
        socket = io(backendUrl, {
            transports: ["polling"],
            path: "/socket.io/",
        });
    }
    return socket;
};
