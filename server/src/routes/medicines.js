// ==============================================
// Medicine Routes — Stock management
// ==============================================

const express = require('express');
const { authMiddleware, doctorOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/medicines — List all medicines
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const medicines = await prisma.medicine.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(medicines);
  } catch (err) {
    next(err);
  }
});

// GET /api/medicines/stock/:kioskId — Get stock for a kiosk
router.get('/stock/:kioskId', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const param = req.params.kioskId;

    let kioskIds = [];
    if (param && param !== 'all' && param !== 'undefined') {
      const kiosk = await prisma.kiosk.findFirst({
        where: {
          OR: [{ id: param }, { machineCode: param }],
        },
      });
      if (kiosk) {
        kioskIds = [kiosk.id];
      }
    }

    const whereClause = kioskIds.length > 0 ? { kioskId: { in: kioskIds } } : {};

    let stock = await prisma.medicineStock.findMany({
      where: whereClause,
      include: { medicine: true },
      orderBy: { medicine: { name: 'asc' } },
    });

    // Fallback if no specific stock items found for that kiosk
    if (stock.length === 0) {
      stock = await prisma.medicineStock.findMany({
        include: { medicine: true },
        orderBy: { medicine: { name: 'asc' } },
        take: 12,
      });
    }

    // Mark low stock items
    const enriched = stock.map((s) => ({
      ...s,
      isLowStock: s.quantity <= s.lowThreshold,
      isOutOfStock: s.quantity === 0,
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// POST /api/medicines/reorder-check/:kioskId — Check and auto-reorder
router.post('/reorder-check/:kioskId', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const io = req.app.get('io');

    const lowStockItems = await prisma.medicineStock.findMany({
      where: {
        kioskId: req.params.kioskId,
        autoReorder: true,
      },
      include: { medicine: true },
    });

    const reorders = [];
    for (const item of lowStockItems) {
      if (item.quantity <= item.lowThreshold && item.quantity > 0) {
        const reorder = await prisma.reorderRequest.create({
          data: {
            kioskId: req.params.kioskId,
            medicineId: item.medicineId,
            quantity: item.medicine.reorderThreshold * 3,
            status: 'pending',
          },
        });
        reorders.push({ medicine: item.medicine.name, quantity: reorder.quantity });
      }
    }

    if (reorders.length > 0) {
      io.emit('stock-alert', { kioskId: req.params.kioskId, reorders });
    }

    res.json({ reordersPlaced: reorders.length, reorders });
  } catch (err) {
    next(err);
  }
});

// POST /api/medicines/restock/:stockId — Manual Restock button for testing convenience
router.post('/restock/:stockId', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const io = req.app.get('io');
    const { quantity } = req.body;

    const stock = await prisma.medicineStock.findUnique({
      where: { id: req.params.stockId },
      include: { medicine: true },
    });

    if (!stock) {
      return res.status(404).json({ error: 'Stock item not found' });
    }

    const restockQty = quantity || (stock.medicine.reorderThreshold ? stock.medicine.reorderThreshold * 5 : 50);

    const updated = await prisma.medicineStock.update({
      where: { id: req.params.stockId },
      data: {
        quantity: restockQty,
        lastRestocked: new Date(),
      },
      include: { medicine: true },
    });

    io.emit('stock-updated', { stockId: updated.id, kioskId: updated.kioskId, quantity: updated.quantity });

    res.json({
      message: `Successfully restocked ${updated.medicine.name} to ${updated.quantity} units.`,
      stock: updated,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
