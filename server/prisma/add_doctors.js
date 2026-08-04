// Script to add 3 new doctors to the database
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  console.log('🩺 Adding new doctors to database...');
  const passwordHash = await bcrypt.hash('doctor123', 10);

  const newDoctors = [
    {
      name: 'Dr. Vikram Verma',
      email: 'vikram@hospital.com',
      specialization: 'Cardiology & Telehealth',
      licenseNo: 'MCI-88921',
    },
    {
      name: 'Dr. Ananya Reddy',
      email: 'ananya@hospital.com',
      specialization: 'Obstetrics & Gynecologist',
      licenseNo: 'MCI-44129',
    },
    {
      name: 'Dr. Sanjay Deshmukh',
      email: 'sanjay@hospital.com',
      specialization: 'Neurology & Emergency Care',
      licenseNo: 'MCI-77301',
    },
  ];

  for (const doc of newDoctors) {
    const existing = await prisma.doctor.findUnique({ where: { email: doc.email } });
    if (!existing) {
      const created = await prisma.doctor.create({
        data: {
          id: uuidv4(),
          name: doc.name,
          email: doc.email,
          passwordHash,
          specialization: doc.specialization,
          licenseNo: doc.licenseNo,
          isAvailable: true,
        },
      });
      console.log(`✅ Created Doctor: ${created.name} (${created.email})`);
    } else {
      console.log(`ℹ️ Doctor already exists: ${existing.name}`);
    }
  }

  const allDoctors = await prisma.doctor.findMany();
  console.log(`\n🎉 Total Doctors in Database: ${allDoctors.length}`);
  console.table(allDoctors.map(d => ({ Name: d.name, Email: d.email, Specialization: d.specialization })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
