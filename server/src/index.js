// ==============================================
// Server Entry Point — KIOSK Healthcare API
// ==============================================

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

// Routes
const authRoutes = require('./routes/auth');
const villagerRoutes = require('./routes/villagers');
const consultationRoutes = require('./routes/consultations');
const medicineRoutes = require('./routes/medicines');
const queueRoutes = require('./routes/queue');
const dispenseRoutes = require('./routes/dispense');
const aiRoutes = require('./routes/ai');
const kioskRoutes = require('./routes/kiosk');
const reviewRoutes = require('./routes/reviews');
const deliveryRoutes = require('./routes/deliveries');

// Middleware
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      process.env.DOCTOR_PORTAL_URL || 'http://localhost:5174',
      process.env.PATIENT_PORTAL_URL || 'http://localhost:5175',
    ],
    methods: ['GET', 'POST'],
  },
});

// Prisma
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: [
    process.env.DOCTOR_PORTAL_URL || 'http://localhost:5174',
    process.env.PATIENT_PORTAL_URL || 'http://localhost:5175',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Make prisma and io available to routes
app.set('prisma', prisma);
app.set('io', io);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/villagers', villagerRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/dispense', dispenseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/kiosk', kioskRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/deliveries', deliveryRoutes);

// Error handler
app.use(errorHandler);

// ── Socket.IO Events ────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Join kiosk or doctor room
  socket.on('join-room', ({ role, id }) => {
    socket.join(`${role}-${id}`);
    console.log(`📍 ${socket.id} joined room: ${role}-${id}`);
  });

  // WebRTC Signaling
  socket.on('call-offer', ({ to, offer }) => {
    io.to(to).emit('call-offer', { from: socket.id, offer });
  });

  socket.on('call-answer', ({ to, answer }) => {
    io.to(to).emit('call-answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('request-offer', ({ to }) => {
    io.to(to).emit('request-offer', { from: socket.id });
  });

  socket.on('call-end', ({ to }) => {
    if (to && to !== 'all') {
      io.to(to).emit('call-ended');
    }
    // Broadcast call-ended to all active call sessions so patient side cuts instantly
    io.emit('call-ended');
  });

  // Direct Doctor-to-Patient Call Trigger
  socket.on('doctor-initiates-call', (data) => {
    console.log(`📞 Doctor ${data.doctorName} calling patient ${data.patientName}`);
    io.emit('incoming-doctor-call', data);
  });

  socket.on('patient-accepts-call', (data) => {
    console.log(`🟢 Patient accepted call from Doctor ${data.doctorId}`);
    io.emit('patient-accepted-call', data);
  });

  socket.on('patient-declines-call', (data) => {
    io.emit('patient-declined-call', data);
  });

  // Live Video Frame Relay for real-time face-to-face video streaming
  socket.on('video-stream-frame', ({ to, frame, sender }) => {
    io.to(to).emit('video-stream-frame', { frame, sender });
  });

  // Queue updates
  socket.on('join-queue', ({ kioskId }) => {
    socket.join(`queue-${kioskId}`);
  });

  // Dispense commands
  socket.on('dispense-medicine', (data) => {
    io.to(`kiosk-${data.kioskId}`).emit('dispense-command', data);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 KIOSK Healthcare API running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close();
});
