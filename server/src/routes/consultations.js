// ==============================================
// Consultation Routes
// ==============================================

const express = require('express');
const { authMiddleware, doctorOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/consultations — List consultations
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { status, kioskId, doctorId, villagerId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (kioskId) where.kioskId = kioskId;
    if (doctorId) where.doctorId = doctorId;
    if (villagerId) where.villagerId = villagerId;

    const consultations = await prisma.consultation.findMany({
      where,
      orderBy: [{ priorityScore: 'desc' }, { createdAt: 'asc' }],
      include: {
        villager: { select: { id: true, name: true, gender: true, dob: true, medicalHistory: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
        triage: true,
        prescriptions: { include: { medicine: true } },
        bloodTests: true,
      },
    });

    res.json(consultations);
  } catch (err) {
    next(err);
  }
});

// POST /api/consultations — Create new consultation (villager joins queue)
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const io = req.app.get('io');
    const { villagerId, kioskId, aiSymptoms } = req.body;

    if (!villagerId) {
      return res.status(400).json({ error: 'villagerId is required' });
    }

    // Resolve actual kiosk UUID if machineCode was passed or fallback to first kiosk
    let actualKioskId = kioskId;
    if (!actualKioskId) {
      const defaultKiosk = await prisma.kiosk.findFirst();
      actualKioskId = defaultKiosk?.id;
    } else {
      const kioskObj = await prisma.kiosk.findFirst({
        where: {
          OR: [{ id: kioskId }, { machineCode: kioskId }],
        },
      });
      if (kioskObj) {
        actualKioskId = kioskObj.id;
      }
    }

    // Check if villager already has an active consultation
    const existing = await prisma.consultation.findFirst({
      where: {
        villagerId,
        status: { in: ['waiting', 'in_triage', 'triaged', 'in_progress'] },
      },
    });

    if (existing) {
      // Reuse/update existing consultation and refresh status to 'waiting'
      const updated = await prisma.consultation.update({
        where: { id: existing.id },
        data: {
          kioskId: actualKioskId,
          ...(aiSymptoms && { aiSymptoms }),
          status: 'waiting',
        },
        include: {
          villager: { select: { id: true, name: true, gender: true, dob: true, medicalHistory: true } },
          kiosk: true,
          triage: true,
        },
      });

      io.emit('queue-updated', { action: 'update', consultation: updated });
      return res.status(200).json(updated);
    }

    const consultation = await prisma.consultation.create({
      data: {
        villagerId,
        kioskId: actualKioskId,
        aiSymptoms,
        status: 'waiting',
      },
      include: {
        villager: { select: { id: true, name: true, gender: true, dob: true, medicalHistory: true } },
        kiosk: true,
        triage: true,
      },
    });

    // Notify all connected clients about queue update
    io.emit('queue-updated', { action: 'new', consultation });

    res.status(201).json(consultation);
  } catch (err) {
    next(err);
  }
});

// PUT /api/consultations/:id/assign — Doctor picks up consultation
router.put('/:id/assign', authMiddleware, doctorOnly, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const io = req.app.get('io');

    const consultation = await prisma.consultation.update({
      where: { id: req.params.id },
      data: {
        doctorId: req.user.id,
        status: 'in_progress',
        startedAt: new Date(),
      },
      include: {
        villager: true,
        doctor: { select: { name: true, specialization: true } },
      },
    });

    io.to(`queue-${consultation.kioskId}`).emit('queue-updated', { action: 'assigned', consultation });
    io.to(`kiosk-${consultation.kioskId}`).emit('doctor-ready', {
      consultationId: consultation.id,
      doctorName: consultation.doctor?.name,
    });

    res.json(consultation);
  } catch (err) {
    next(err);
  }
});

// PUT /api/consultations/:id/complete — End consultation
router.put('/:id/complete', authMiddleware, doctorOnly, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const io = req.app.get('io');
    const { doctorNotes } = req.body;

    const consultation = await prisma.consultation.update({
      where: { id: req.params.id },
      data: {
        status: 'completed',
        endedAt: new Date(),
        doctorNotes,
      },
    });

    io.to(`queue-${consultation.kioskId}`).emit('queue-updated', { action: 'completed', consultation });

    res.json(consultation);
  } catch (err) {
    next(err);
  }
});

// GET /api/consultations/:id/messages — Fetch call messages for live in-call chat
router.get('/:id/messages', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const messages = await prisma.callMessage.findMany({
      where: { consultationId: req.params.id },
      orderBy: { createdAt: 'asc' },
      include: { prescribedMedicine: true },
    });
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// POST /api/consultations/:id/messages — Send message in live in-call chat
router.post('/:id/messages', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const io = req.app.get('io');
    const { sender, messageText, prescribedMedicineId } = req.body;

    if (!messageText) {
      return res.status(400).json({ error: 'messageText is required' });
    }

    const message = await prisma.callMessage.create({
      data: {
        consultationId: req.params.id,
        sender: sender || 'user',
        messageText,
        prescribedMedicineId,
      },
      include: { prescribedMedicine: true },
    });

    io.to(`consultation-${req.params.id}`).emit('new-call-message', message);

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
