// ==============================================
// Auth Routes — Doctor Login & Kiosk Auth
// ==============================================

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// POST /api/auth/doctor/register — Doctor Self-Service Sign-up
router.post('/doctor/register', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, email, password, specialization, licenseNo, phone, assignedVillages } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = await prisma.doctor.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'A doctor account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const doctor = await prisma.doctor.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        specialization: specialization || 'General Medicine',
        licenseNo: licenseNo || null,
        phone: phone || null,
        assignedVillages: assignedVillages || 'Rampur, Anandpur',
        isAvailable: true,
      },
    });

    const token = jwt.sign(
      { id: doctor.id, email: doctor.email, name: doctor.name, role: 'doctor' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        licenseNo: doctor.licenseNo,
        phone: doctor.phone,
        assignedVillages: doctor.assignedVillages,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/doctor/login
router.post('/doctor/login', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const doctor = await prisma.doctor.findUnique({ where: { email } });
    if (!doctor) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, doctor.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: doctor.id, email: doctor.email, name: doctor.name, role: 'doctor' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/kiosk/login — Machine authentication
router.post('/kiosk/login', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { machineCode } = req.body;

    if (!machineCode) {
      return res.status(400).json({ error: 'Machine code required' });
    }

    const kiosk = await prisma.kiosk.findUnique({
      where: { machineCode },
      include: { village: true },
    });

    if (!kiosk) {
      return res.status(401).json({ error: 'Unknown machine' });
    }

    const token = jwt.sign(
      { id: kiosk.id, machineCode: kiosk.machineCode, villageId: kiosk.villageId, role: 'kiosk' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      kiosk: {
        id: kiosk.id,
        machineCode: kiosk.machineCode,
        village: kiosk.village,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — Get current user
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    res.json(decoded);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/patient/register — Patient Sign-up (Patient Web Portal)
router.post('/patient/register', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, phone, villageId, gender, dob, address } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone number are required.' });
    }

    const existing = await prisma.villager.findFirst({ where: { phone: phone.trim() } });
    if (existing) {
      return res.status(400).json({ error: 'A patient profile with this phone number already exists.' });
    }

    let targetVillageId = villageId;
    if (!targetVillageId) {
      const defaultVillage = await prisma.village.findFirst();
      targetVillageId = defaultVillage?.id;
    }

    const patient = await prisma.villager.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        villageId: targetVillageId,
        gender: gender || 'Other',
        dob: dob ? new Date(dob) : null,
        address: address || null,
      },
      include: { village: true },
    });

    const token = jwt.sign(
      { id: patient.id, name: patient.name, phone: patient.phone, role: 'patient' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '30d' }
    );

    res.status(201).json({ token, patient });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/patient/login — Patient Login (Patient Web Portal)
router.post('/patient/login', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const patient = await prisma.villager.findFirst({
      where: { phone: phone.trim() },
      include: { village: true },
    });

    if (!patient) {
      return res.status(401).json({ error: 'No account found with this phone number. Please sign up.' });
    }

    const token = jwt.sign(
      { id: patient.id, name: patient.name, phone: patient.phone, role: 'patient' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '30d' }
    );

    res.json({ token, patient });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
