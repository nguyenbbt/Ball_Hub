import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@ballhub.com';
const ADMIN_PASSWORD = 'admin123';

const run = async () => {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    console.log('Admin user already exists:', ADMIN_EMAIL);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
      teamId: null,
    },
  });

  console.log('Admin user created:', admin.email);
};

run()
  .catch((error) => {
    console.error('Failed to seed admin user:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
