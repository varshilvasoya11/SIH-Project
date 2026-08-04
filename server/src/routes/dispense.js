// ==============================================
// Dispense Routes — Medicine dispensing
// ==============================================

const express = require('express');
const { authMiddleware, doctorOnly } = require('../middleware/auth');
const router = express.Router();

// POST /api/dispense — Doctor prescribes and dispenses medicine
router.post('/', authMiddleware, doctorOnly, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const io = req.app.get('io');
    const { consultationId, medicines } = req.body;

    // medicines: [{ medicineId, dosage, quantity, instructions }]
    if (!consultationId || !medicines?.length) {
      return res.status(400).json({ error: 'consultationId and medicines array required' });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
    });
    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    const results = [];

    for (const med of medicines) {
      // Check stock
      const stock = await prisma.medicineStock.findFirst({
        where: { kioskId: consultation.kioskId, medicineId: med.medicineId },
      });

      if (!stock || stock.quantity < med.quantity) {
        results.push({
          medicineId: med.medicineId,
          status: 'failed',
          error: `Insufficient stock (available: ${stock?.quantity || 0})`,
        });
        continue;
      }

      // Create prescription
      const prescription = await prisma.prescription.create({
        data: {
          consultationId,
          medicineId: med.medicineId,
          dosage: med.dosage,
          quantity: med.quantity,
          instructions: med.instructions,
        },
        include: { medicine: true },
      });

      // Create dispensed record
      const dispensed = await prisma.dispensedMedicine.create({
        data: {
          prescriptionId: prescription.id,
          medicineId: med.medicineId,
          quantity: med.quantity,
          status: 'dispensing',
        },
      });

      // Reduce stock
      await prisma.medicineStock.update({
        where: { id: stock.id },
        data: { quantity: stock.quantity - med.quantity },
      });

      // Create in-call chat message and emit to live video call chat
      const callMsg = await prisma.callMessage.create({
        data: {
          consultationId,
          sender: 'doctor',
          messageText: `💊 Prescribed: ${prescription.medicine.name} (Qty: ${med.quantity}) ${med.instructions ? '— ' + med.instructions : ''}`,
          prescribedMedicineId: med.medicineId,
        },
        include: { prescribedMedicine: true },
      });

      io.emit('new-call-message', callMsg);

      // Real-time WebSocket push: automatically add prescribed medicine to Patient Portal cart
      io.emit('prescription-added-to-cart', {
        villagerId: consultation.villagerId,
        consultationId,
        medicine: {
          id: prescription.medicine.id,
          name: prescription.medicine.name,
          category: prescription.medicine.category,
          unit: prescription.medicine.unit,
          quantity: med.quantity,
          instructions: med.instructions,
        },
      });

      results.push({
        medicineId: med.medicineId,
        prescriptionId: prescription.id,
        dispensedId: dispensed.id,
        status: 'dispensing',
        callMessage: callMsg,
      });
    }

    // Send dispense command to kiosk via WebSocket
    io.to(`kiosk-${consultation.kioskId}`).emit('dispense-command', {
      consultationId,
      medicines: results.filter((r) => r.status === 'dispensing'),
    });

    // Auto-check for reorders
    const lowStock = await prisma.medicineStock.findMany({
      where: {
        kioskId: consultation.kioskId,
        autoReorder: true,
      },
      include: { medicine: true },
    });

    const reorderAlerts = [];
    for (const s of lowStock) {
      if (s.quantity <= s.lowThreshold) {
        reorderAlerts.push({ name: s.medicine.name, remaining: s.quantity });
        const existing = await prisma.reorderRequest.findFirst({
          where: {
            kioskId: consultation.kioskId,
            medicineId: s.medicineId,
            status: 'pending',
          },
        });
        if (!existing) {
          await prisma.reorderRequest.create({
            data: {
              kioskId: consultation.kioskId,
              medicineId: s.medicineId,
              quantity: (s.medicine.reorderThreshold || 10) * 3,
              status: 'pending',
            },
          });
        }
      }
    }

    if (reorderAlerts.length > 0) {
      io.emit('stock-low-alert', { kioskId: consultation.kioskId, items: reorderAlerts });
    }

    res.json({ results, reorderAlerts });
  } catch (err) {
    next(err);
  }
});

// PUT /api/dispense/:dispensedId/confirm — Kiosk confirms dispense
router.put('/:dispensedId/confirm', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');

    const dispensed = await prisma.dispensedMedicine.update({
      where: { id: req.params.dispensedId },
      data: { status: 'dispensed', dispensedAt: new Date() },
    });

    res.json(dispensed);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
