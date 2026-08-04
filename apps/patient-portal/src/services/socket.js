// ==============================================
// Socket.IO Service — Patient Web Portal
// ==============================================

import { io } from 'socket.io-client';

let socket = null;

export function initSocket() {
  if (!socket) {
    const serverUrl = import.meta.env.VITE_SERVER_URL || '/';
    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('🔌 Patient Web Portal socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ Patient Web Portal socket disconnected');
    });
  }
  return socket;
}

export function getSocket() {
  if (!socket) {
    return initSocket();
  }
  return socket;
}

export function joinRoom(room) {
  const s = getSocket();
  s.emit('join-room', room);
}
