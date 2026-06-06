import { prisma, UserRole, UserStatus } from '../index';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  inviteCode: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function verifyInviteCode(code: string) {
  const inviteCode = await prisma.inviteCode.findUnique({
    where: { code },
  });

  if (!inviteCode || inviteCode.used || inviteCode.expiresAt < new Date()) {
    return null;
  }

  return inviteCode;
}

export async function createInviteCode(createdBy: string, email?: string, expiresHours = 72) {
  const code = `NX-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  
  return prisma.inviteCode.create({
    data: {
      code,
      email,
      createdById: createdBy,
      expiresAt: new Date(Date.now() + expiresHours * 60 * 60 * 1000),
    },
  });
}

export async function registerUser(data: z.infer<typeof RegisterSchema>) {
  const { email, username, password, inviteCode: code, firstName, lastName } = data;

  // Verify invite code
  const invite = await verifyInviteCode(code);
  if (!invite) {
    throw new Error('Invalid or expired invite code');
  }

  // Check if user exists
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    throw new Error('User already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      firstName,
      lastName,
      role: invite.email ? UserRole.MEMBER : UserRole.ADMIN,
    },
  });

  // Mark invite as used
  await prisma.inviteCode.update({
    where: { id: invite.id },
    data: { used: true, usedBy: user.id },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user.id,
      performedBy: user.id,
      metadata: { email, username },
    },
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new Error('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  return user;
}

export async function createSession(userId: string, deviceInfo?: string, ipAddress?: string) {
  const token = `tok_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
  const refreshToken = `ref_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      refreshToken,
      deviceInfo,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { lastSeenAt: new Date() },
  });

  return session;
}

export async function validateSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || session.revokedAt) {
    return null;
  }

  return session;
}

export async function revokeSession(token: string) {
  return prisma.session.update({
    where: { token },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string) {
  return prisma.session.updateMany({
    where: { userId },
    data: { revokedAt: new Date() },
  });
}
