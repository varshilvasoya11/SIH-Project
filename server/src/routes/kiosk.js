// ==============================================
// Kiosk Routes — Machine management
// ==============================================

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// GET /api/kiosk/:id — Get kiosk details
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const kiosk = await prisma.kiosk.findUnique({
      where: { id: req.params.id },
      include: { village: true },
    });
    if (!kiosk) return res.status(404).json({ error: 'Kiosk not found' });
    res.json(kiosk);
  } catch (err) {
    next(err);
  }
});

// GET /api/kiosk — List all kiosks
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const kiosks = await prisma.kiosk.findMany({
      include: { village: true },
    });
    res.json(kiosks);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
