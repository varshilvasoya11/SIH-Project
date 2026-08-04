// ==============================================
// Socket Service — KIOSK Portal
// ==============================================

import { io } from 'socket.io-client';

let socket = null;

export function connectSocket() {
  if (socket?.connected) return socket;

  const serverUrl = import.meta.env.VITE_SERVER_URL || '/';
  socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function joinKioskRoom(kioskId) {
  socket?.emit('join-room', { role: 'kiosk', id: kioskId });
  socket?.emit('join-queue', { kioskId });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
