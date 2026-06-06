// Database package entry point
export { PrismaClient } from '@prisma/client';

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from './services/auth.service';
export * from './services/user.service';
export * from './services/group.service';
export * from './services/message.service';
