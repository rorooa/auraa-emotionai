import type { NextConfig } from "next";
import path from "path";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/api/emotion', destination: `${BACKEND}/emotion` },
      { source: '/api/chat', destination: `${BACKEND}/chat` },
      { source: '/socket.io/:path*', destination: `${BACKEND}/socket.io/:path*` },
      { source: '/api/login', destination: `${BACKEND}/login` },
      { source: '/api/firebase-login', destination: `${BACKEND}/firebase-login` },
      { source: '/api/register', destination: `${BACKEND}/register` },
      { source: '/api/history', destination: `${BACKEND}/history` },
      { source: '/api/reviews/:path*', destination: `${BACKEND}/reviews/:path*` },
      { source: '/api/payments/:path*', destination: `${BACKEND}/api/payments/:path*` },
      { source: '/api/profile/:path*', destination: `${BACKEND}/profile/:path*` },
      { source: '/api/emotion-mirror/:path*', destination: `${BACKEND}/emotion-mirror/:path*` },
      { source: '/api/rooms/:path*', destination: `${BACKEND}/rooms/:path*` },
      { source: '/api/user/streak/check', destination: `${BACKEND}/api/user/streak/check` },
      { source: '/api/games/log', destination: `${BACKEND}/api/games/log` },
      { source: '/api/health', destination: `${BACKEND}/` },
    ];
  },
};

export default nextConfig;
