// ==============================================
// Queue Routes — Smart queue with priority
// ==============================================

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// GET /api/queue/:kioskId — Get current queue for a kiosk
router.get('/:kioskId', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const param = req.params.kioskId;

    let kioskIds = [param];
    if (param !== 'all') {
      const kiosk = await prisma.kiosk.findFirst({
        where: {
          OR: [{ id: param }, { machineCode: param }],
        },
      });
      if (kiosk) {
        kioskIds = [kiosk.id, kiosk.machineCode];
      }
    }

    const whereClause = {
      status: { in: ['waiting', 'in_triage', 'triaged', 'in_progress'] },
    };

    if (param !== 'all') {
      whereClause.kioskId = { in: kioskIds };
    }

    const queue = await prisma.consultation.findMany({
      where: whereClause,
      orderBy: [
        { priorityScore: 'desc' },
        { createdAt: 'asc' },
      ],
      include: {
        villager: {
          select: { id: true, name: true, gender: true, dob: true, medicalHistory: true, phone: true },
        },
        doctor: { select: { id: true, name: true } },
        kiosk: { select: { id: true, machineCode: true, village: true } },
        triage: true,
        bloodTests: true,
      },
    });

    // Enrich with wait time and position
    const enriched = queue.map((item, index) => ({
      ...item,
      position: index + 1,
      waitTimeMinutes: Math.round((Date.now() - new Date(item.createdAt).getTime()) / 60000),
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// GET /api/queue/doctors/available — Get available doctors with load
router.get('/doctors/available', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');

    const doctors = await prisma.doctor.findMany({
      where: { isAvailable: true },
      include: {
        consultations: {
          where: { status: 'in_progress' },
        },
      },
    });

    // Calculate load for each doctor
    const withLoad = doctors.map((doc) => ({
      id: doc.id,
      name: doc.name,
      specialization: doc.specialization,
      activePatients: doc.consultations.length,
    }));

    // Sort by load (least busy first)
    withLoad.sort((a, b) => a.activePatients - b.activePatients);

    res.json(withLoad);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
