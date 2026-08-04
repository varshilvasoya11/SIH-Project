// ==============================================
// Socket Service — Doctor Portal
// ==============================================

import { io } from 'socket.io-client';

let socket = null;

export function connectSocket() {
  if (socket?.connected) return socket;

  socket = io('/', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('🔌 Doctor socket connected:', socket.id));
  socket.on('disconnect', () => console.log('❌ Doctor socket disconnected'));

  return socket;
}

export function getSocket() {
  return socket;
}

export function joinDoctorRoom(doctorId) {
  socket?.emit('join-room', { role: 'doctor', id: doctorId });
}

export function joinQueueRoom(kioskId) {
  socket?.emit('join-queue', { kioskId });
}

export function sendDispenseCommand(kioskId, data) {
  socket?.emit('dispense-medicine', { kioskId, ...data });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
