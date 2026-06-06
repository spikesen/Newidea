import { Router } from 'express';
import { z } from 'zod';
import { API_RESPONSE } from '@nexcomm/shared';
import { registerUser, loginUser, createSession, validateSession, revokeSession } from '@nexcomm/database';

const router = Router();

// Register schema
const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  inviteCode: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

// Login schema
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * POST /api/auth/register
 * Register a new user with invite code
 */
router.post('/register', async (req, res) => {
  try {
    const data = RegisterSchema.parse(req.body);
    const user = await registerUser(data);
    
    // Create session
    const session = await createSession(user.id, req.headers['user-agent'], req.ip);
    
    res.status(201).json(API_RESPONSE.success({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      token: session.token,
      refreshToken: session.refreshToken,
    }, 'Registration successful'));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(API_RESPONSE.error(error.errors[0].message, 'VALIDATION_ERROR'));
    }
    res.status(400).json(API_RESPONSE.error(error.message, 'REGISTRATION_FAILED'));
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const user = await loginUser(email, password);
    
    const session = await createSession(user.id, req.headers['user-agent'], req.ip);
    
    res.json(API_RESPONSE.success({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      token: session.token,
      refreshToken: session.refreshToken,
    }, 'Login successful'));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(API_RESPONSE.error(error.errors[0].message, 'VALIDATION_ERROR'));
    }
    res.status(401).json(API_RESPONSE.error(error.message, 'LOGIN_FAILED'));
  }
});

/**
 * POST /api/auth/logout
 * Logout user (revoke session)
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await revokeSession(token);
    }
    res.json(API_RESPONSE.success(null, 'Logged out successfully'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'LOGOUT_FAILED'));
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json(API_RESPONSE.error('Refresh token required', 'MISSING_TOKEN'));
    }
    
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });
    
    if (!session || session.expiresAt < new Date() || session.revokedAt) {
      return res.status(401).json(API_RESPONSE.error('Invalid refresh token', 'INVALID_TOKEN'));
    }
    
    // Create new session
    const newSession = await createSession(session.userId, session.deviceInfo, session.ipAddress);
    
    res.json(API_RESPONSE.success({
      token: newSession.token,
      refreshToken: newSession.refreshToken,
    }, 'Token refreshed'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'REFRESH_FAILED'));
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(API_RESPONSE.error('Unauthorized', 'NO_TOKEN'));
    }
    
    const token = authHeader.split(' ')[1];
    const session = await validateSession(token);
    
    if (!session) {
      return res.status(401).json(API_RESPONSE.error('Invalid session', 'INVALID_SESSION'));
    }
    
    res.json(API_RESPONSE.success({
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      role: session.user.role,
      avatarUrl: session.user.avatarUrl,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      twoFactorEnabled: session.user.twoFactorEnabled,
    }));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'FETCH_FAILED'));
  }
});

// Need to import prisma for refresh endpoint
import { prisma } from '@nexcomm/database';

export default router;
