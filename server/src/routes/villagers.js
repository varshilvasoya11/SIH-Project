// ==============================================
// Villager Routes — CRUD + Face Recognition
// ==============================================

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// GET /api/villagers — List all villagers for a village
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { villageId } = req.query;

    const where = villageId ? { villageId } : {};
    const villagers = await prisma.villager.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        consultations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            prescriptions: { include: { medicine: true } },
            bloodTests: true,
          },
        },
      },
    });

    res.json(villagers);
  } catch (err) {
    next(err);
  }
});

// GET /api/villagers/:id — Get single villager with full history
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const villager = await prisma.villager.findUnique({
      where: { id: req.params.id },
      include: {
        village: true,
        deliveries: { orderBy: { createdAt: 'desc' } },
        consultations: {
          orderBy: { createdAt: 'desc' },
          include: {
            doctor: { select: { name: true, specialization: true } },
            prescriptions: { include: { medicine: true } },
            bloodTests: true,
            triage: true,
            review: true,
          },
        },
      },
    });

    if (!villager) {
      return res.status(404).json({ error: 'Villager not found' });
    }

    res.json(villager);
  } catch (err) {
    next(err);
  }
});

// POST /api/villagers — Register new villager
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, villageId, phone, dob, gender, address, emergencyContactName, emergencyContactPhone, medicalHistory, faceEncoding } = req.body;

    if (!name || !villageId) {
      return res.status(400).json({ error: 'Name and villageId required' });
    }

    const villager = await prisma.villager.create({
      data: {
        name,
        villageId,
        phone,
        dob: dob ? new Date(dob) : null,
        gender,
        address,
        emergencyContactName,
        emergencyContactPhone,
        medicalHistory,
        faceEncoding,
      },
    });

    res.status(201).json(villager);
  } catch (err) {
    next(err);
  }
});

// PUT /api/villagers/:id/face — Update face encoding
router.put('/:id/face', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { faceEncoding } = req.body;

    const villager = await prisma.villager.update({
      where: { id: req.params.id },
      data: { faceEncoding },
    });

    res.json(villager);
  } catch (err) {
    next(err);
  }
});

// POST /api/villagers/identify — Match face encoding
router.post('/identify', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { faceEncoding, villageId } = req.body;

    if (!faceEncoding || !villageId) {
      return res.status(400).json({ error: 'faceEncoding and villageId required' });
    }

    // Get all villagers with face data for this village
    const villagers = await prisma.villager.findMany({
      where: {
        villageId,
        faceEncoding: { not: null },
      },
    });

    // Face matching is done client-side with face-api.js
    // This endpoint returns all face encodings for client to match against
    const faceData = villagers.map((v) => ({
      id: v.id,
      name: v.name,
      faceEncoding: v.faceEncoding,
    }));

    res.json(faceData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
