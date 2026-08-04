// ==============================================
// Database Seed — Demo Data for Hackathon
// ==============================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Villages ───────────────────────────────
  const village = await prisma.village.create({
    data: {
      id: uuidv4(),
      name: 'Rampur',
      district: 'Varanasi',
      state: 'Uttar Pradesh',
    },
  });
  console.log('✅ Village created:', village.name);

  // ── Kiosk ──────────────────────────────────
  const kiosk = await prisma.kiosk.create({
    data: {
      id: uuidv4(),
      villageId: village.id,
      machineCode: 'KIOSK-RAMPUR-001',
      status: 'online',
    },
  });
  console.log('✅ Kiosk created:', kiosk.machineCode);

  // ── Doctors ────────────────────────────────
  const passwordHash = await bcrypt.hash('doctor123', 10);

  const doctor1 = await prisma.doctor.create({
    data: {
      id: uuidv4(),
      name: 'Dr. Priya Sharma',
      email: 'priya@hospital.com',
      passwordHash,
      specialization: 'General Medicine',
      licenseNo: 'MCI-12345',
      isAvailable: true,
    },
  });

  const doctor2 = await prisma.doctor.create({
    data: {
      id: uuidv4(),
      name: 'Dr. Rajesh Patel',
      email: 'rajesh@hospital.com',
      passwordHash,
      specialization: 'Pediatrics',
      licenseNo: 'MCI-67890',
      isAvailable: true,
    },
  });

  const doctor3 = await prisma.doctor.create({
    data: {
      id: uuidv4(),
      name: 'Dr. Meena Gupta',
      email: 'meena@hospital.com',
      passwordHash,
      specialization: 'Dermatology',
      licenseNo: 'MCI-11111',
      isAvailable: true,
    },
  });

  const doctor4 = await prisma.doctor.create({
    data: {
      id: uuidv4(),
      name: 'Dr. Vikram Verma',
      email: 'vikram@hospital.com',
      passwordHash,
      specialization: 'Cardiology & Telehealth',
      licenseNo: 'MCI-88921',
      isAvailable: true,
    },
  });

  const doctor5 = await prisma.doctor.create({
    data: {
      id: uuidv4(),
      name: 'Dr. Ananya Reddy',
      email: 'ananya@hospital.com',
      passwordHash,
      specialization: 'Obstetrics & Gynecologist',
      licenseNo: 'MCI-44129',
      isAvailable: true,
    },
  });

  const doctor6 = await prisma.doctor.create({
    data: {
      id: uuidv4(),
      name: 'Dr. Sanjay Deshmukh',
      email: 'sanjay@hospital.com',
      passwordHash,
      specialization: 'Neurology & Emergency Care',
      licenseNo: 'MCI-77301',
      isAvailable: true,
    },
  });
  console.log('✅ 6 Doctors created');

  // ── Villagers ──────────────────────────────
  const villagers = await Promise.all([
    prisma.villager.create({
      data: {
        id: uuidv4(),
        villageId: village.id,
        name: 'Ramesh Kumar',
        phone: '9876543210',
        gender: 'male',
        dob: new Date('1985-03-15'),
        medicalHistory: { allergies: ['dust'], conditions: ['hypertension'] },
      },
    }),
    prisma.villager.create({
      data: {
        id: uuidv4(),
        villageId: village.id,
        name: 'Sunita Devi',
        phone: '9876543211',
        gender: 'female',
        dob: new Date('1990-07-22'),
        medicalHistory: { allergies: [], conditions: ['diabetes'] },
      },
    }),
    prisma.villager.create({
      data: {
        id: uuidv4(),
        villageId: village.id,
        name: 'Mohan Lal',
        phone: '9876543212',
        gender: 'male',
        dob: new Date('1978-11-05'),
        medicalHistory: { allergies: ['penicillin'], conditions: [] },
      },
    }),
  ]);
  console.log('✅ 3 Villagers created');

  // ── Medicines ──────────────────────────────
  const medicines = await Promise.all([
    prisma.medicine.create({ data: { name: 'Paracetamol 500mg', category: 'Pain Relief', unit: 'tablet', reorderThreshold: 20 } }),
    prisma.medicine.create({ data: { name: 'Amoxicillin 250mg', category: 'Antibiotic', unit: 'capsule', reorderThreshold: 15 } }),
    prisma.medicine.create({ data: { name: 'Cetirizine 10mg', category: 'Antihistamine', unit: 'tablet', reorderThreshold: 10 } }),
    prisma.medicine.create({ data: { name: 'ORS Sachets', category: 'Rehydration', unit: 'sachet', reorderThreshold: 25 } }),
    prisma.medicine.create({ data: { name: 'Metformin 500mg', category: 'Diabetes', unit: 'tablet', reorderThreshold: 15 } }),
    prisma.medicine.create({ data: { name: 'Amlodipine 5mg', category: 'Blood Pressure', unit: 'tablet', reorderThreshold: 15 } }),
    prisma.medicine.create({ data: { name: 'Azithromycin 500mg', category: 'Antibiotic', unit: 'tablet', reorderThreshold: 10 } }),
    prisma.medicine.create({ data: { name: 'Ibuprofen 400mg', category: 'Pain Relief', unit: 'tablet', reorderThreshold: 20 } }),
    prisma.medicine.create({ data: { name: 'Vitamin D3 1000IU', category: 'Supplement', unit: 'tablet', reorderThreshold: 10 } }),
    prisma.medicine.create({ data: { name: 'Cough Syrup 100ml', category: 'Cough & Cold', unit: 'bottle', reorderThreshold: 8 } }),
  ]);
  console.log('✅ 10 Medicines created');

  // ── Medicine Stock for Kiosk ───────────────
  for (const med of medicines) {
    await prisma.medicineStock.create({
      data: {
        kioskId: kiosk.id,
        medicineId: med.id,
        quantity: Math.floor(Math.random() * 40) + 10,
        lowThreshold: med.reorderThreshold,
        autoReorder: true,
      },
    });
  }
  console.log('✅ Medicine stock initialized for kiosk');

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Demo Doctor Login Credentials (Password: doctor123):');
  console.log('   1. Dr. Priya Sharma    — priya@hospital.com (General Medicine)');
  console.log('   2. Dr. Rajesh Patel    — rajesh@hospital.com (Pediatrics)');
  console.log('   3. Dr. Meena Gupta     — meena@hospital.com (Dermatology)');
  console.log('   4. Dr. Vikram Verma    — vikram@hospital.com (Cardiology & Telehealth)');
  console.log('   5. Dr. Ananya Reddy    — ananya@hospital.com (Obstetrics & Gynecologist)');
  console.log('   6. Dr. Sanjay Deshmukh — sanjay@hospital.com (Neurology & Emergency Care)');
  console.log(`\n   Kiosk Machine Code: ${kiosk.machineCode}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
