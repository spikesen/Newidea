import { prisma, UserRole, UserStatus } from '../index';
import bcrypt from 'bcryptjs';

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      status: true,
      avatarUrl: true,
      firstName: true,
      lastName: true,
      twoFactorEnabled: true,
      createdAt: true,
      lastSeenAt: true,
    },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function getAllUsers(page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        avatarUrl: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        lastSeenAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);

  return { users, total, page, limit };
}

export async function updateUserRole(userId: string, role: UserRole, performedBy: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  await prisma.auditLog.create({
    data: {
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: userId,
      performedBy,
      metadata: { newRole: role },
    },
  });

  return user;
}

export async function suspendUser(userId: string, performedBy: string) {
  await revokeAllUserSessions(userId);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.SUSPENDED },
  });

  await prisma.auditLog.create({
    data: {
      action: 'USER_SUSPENDED',
      entityType: 'User',
      entityId: userId,
      performedBy,
    },
  });

  return user;
}

export async function activateUser(userId: string, performedBy: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.ACTIVE },
  });

  await prisma.auditLog.create({
    data: {
      action: 'USER_ACTIVATED',
      entityType: 'User',
      entityId: userId,
      performedBy,
    },
  });

  return user;
}

export async function deleteUser(userId: string, performedBy: string) {
  await revokeAllUserSessions(userId);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { 
      status: UserStatus.DELETED,
      email: `deleted_${userId}@deleted`,
      username: `deleted_${userId}`,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: userId,
      performedBy,
    },
  });

  return user;
}

export async function resetPassword(userId: string, newPassword: string, performedBy: string) {
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await revokeAllUserSessions(userId);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await prisma.auditLog.create({
    data: {
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: userId,
      performedBy,
    },
  });
}

export async function updateProfile(userId: string, data: { firstName?: string; lastName?: string; avatarUrl?: string }) {
  return prisma.user.update({
    where: { id: userId },
    data,
  });
}

export async function getUserSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      deviceInfo: true,
      ipAddress: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function revokeAllUserSessions(userId: string) {
  return prisma.session.updateMany({
    where: { userId },
    data: { revokedAt: new Date() },
  });
}
