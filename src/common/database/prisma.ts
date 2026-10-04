import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const connectPrisma = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('Successfully connected to Prisma / PostgreSQL');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL via Prisma:', error);
    process.exit(1);
  }
};
