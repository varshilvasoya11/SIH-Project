// ==============================================
// Delivery Routes — Patient Medicine Deliveries
// ==============================================

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// GET /api/deliveries — List deliveries (filter by villagerId, status)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { villagerId, status, consultationId } = req.query;

    const where = {};
    if (villagerId) where.villagerId = villagerId;
    if (status) where.status = status;
    if (consultationId) where.consultationId = consultationId;

    const deliveries = await prisma.delivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        villager: {
          select: { id: true, name: true, phone: true, address: true },
        },
        consultation: {
          select: { id: true, doctorNotes: true },
        },
      },
    });

    res.json(deliveries);
  } catch (err) {
    next(err);
  }
});

// GET /api/deliveries/:id — Fetch delivery details
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const delivery = await prisma.delivery.findUnique({
      where: { id: req.params.id },
      include: {
        villager: true,
        consultation: {
          include: { prescriptions: { include: { medicine: true } } },
        },
      },
    });

    if (!delivery) {
      return res.status(404).json({ error: 'Delivery record not found' });
    }

    res.json(delivery);
  } catch (err) {
    next(err);
  }
});

// POST /api/deliveries — Create new delivery request for a patient
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const {
      villagerId,
      consultationId,
      prescriptionId,
      deliveryAddress,
      deliveryDate,
      courierName,
      courierContact,
      paymentStatus,
      specialInstructions,
    } = req.body;

    if (!villagerId) {
      return res.status(400).json({ error: 'villagerId is required' });
    }

    // Get villager address if not specified
    const villager = await prisma.villager.findUnique({ where: { id: villagerId } });
    if (!villager) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const io = req.app.get('io');

    const delivery = await prisma.delivery.create({
      data: {
        villagerId,
        consultationId,
        prescriptionId,
        deliveryAddress: deliveryAddress || villager.address || 'Kiosk Pickup Point',
        deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(Date.now() + 86400000), // Default 24h
        status: 'placed',
        courierName: courierName || 'Express Rural Courier',
        courierContact,
        paymentStatus: paymentStatus || 'Prepaid',
        specialInstructions,
      },
      include: {
        villager: { select: { name: true, phone: true } },
      },
    });

    // Swappable Simulation: Auto-advance status (placed -> preparing -> delivered) over ~60s
    setTimeout(async () => {
      try {
        const prep = await prisma.delivery.update({
          where: { id: delivery.id },
          data: { status: 'preparing' },
        });
        io.emit('order-status-updated', { deliveryId: delivery.id, villagerId, status: 'preparing' });
      } catch (err) {
        console.error('Error auto-advancing delivery to preparing:', err.message);
      }
    }, 20000); // 20s

    setTimeout(async () => {
      try {
        const deliv = await prisma.delivery.update({
          where: { id: delivery.id },
          data: { status: 'delivered', deliveryDate: new Date() },
        });
        io.emit('order-status-updated', { deliveryId: delivery.id, villagerId, status: 'delivered' });
      } catch (err) {
        console.error('Error auto-advancing delivery to delivered:', err.message);
      }
    }, 60000); // 60s total

    res.status(201).json(delivery);
  } catch (err) {
    next(err);
  }
});

// PUT /api/deliveries/:id/status — Update delivery status & courier details
router.put('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { status, courierName, courierContact, deliveryDate } = req.body;

    const updated = await prisma.delivery.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(courierName && { courierName }),
        ...(courierContact && { courierContact }),
        ...(deliveryDate && { deliveryDate: new Date(deliveryDate) }),
      },
      include: { villager: { select: { name: true, phone: true } } },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
