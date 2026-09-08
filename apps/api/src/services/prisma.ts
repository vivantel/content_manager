import { PrismaClient } from '@prisma/client';
import type { PrismaClient as PrismaClientType } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined;
};

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;