import { Router } from 'express';
import { API_RESPONSE } from '@nexcomm/shared';
import { 
  getAllUsers, 
  getUserById, 
  updateUserRole, 
  suspendUser, 
  activateUser, 
  deleteUser,
  resetPassword,
  updateProfile,
  getUserSessions
} from '@nexcomm/database';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (req.user?.role !== 'ADMIN') {
      // Non-admin users can only see basic info about other users
      const result = await getAllUsers(page, Math.min(limit, 20));
      return res.json(API_RESPONSE.success(result));
    }
    
    const result = await getAllUsers(page, limit);
    res.json(API_RESPONSE.success(result));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'FETCH_FAILED'));
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json(API_RESPONSE.error('User not found', 'NOT_FOUND'));
    }
    
    res.json(API_RESPONSE.success(user));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'FETCH_FAILED'));
  }
});

/**
 * PUT /api/users/:id/profile
 * Update own profile
 */
router.put('/:id/profile', async (req, res) => {
  try {
    // Users can only update their own profile unless admin
    if (req.user?.userId !== req.params.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json(API_RESPONSE.error('Forbidden', 'FORBIDDEN'));
    }
    
    const { firstName, lastName, avatarUrl } = req.body;
    const user = await updateProfile(req.params.id, { firstName, lastName, avatarUrl });
    
    res.json(API_RESPONSE.success(user, 'Profile updated'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'UPDATE_FAILED'));
  }
});

/**
 * GET /api/users/:id/sessions
 * Get user sessions (own sessions or admin viewing any user)
 */
router.get('/:id/sessions', async (req, res) => {
  try {
    if (req.user?.userId !== req.params.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json(API_RESPONSE.error('Forbidden', 'FORBIDDEN'));
    }
    
    const sessions = await getUserSessions(req.params.id);
    res.json(API_RESPONSE.success(sessions));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'FETCH_FAILED'));
  }
});

/**
 * POST /api/users/:id/role
 * Update user role (admin only)
 */
router.post('/:id/role', async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json(API_RESPONSE.error('Forbidden: Admin access required', 'FORBIDDEN'));
    }
    
    const { role } = req.body;
    if (!['ADMIN', 'MODERATOR', 'MEMBER'].includes(role)) {
      return res.status(400).json(API_RESPONSE.error('Invalid role', 'INVALID_ROLE'));
    }
    
    const user = await updateUserRole(req.params.id, role as UserRole, req.user.userId);
    res.json(API_RESPONSE.success(user, 'Role updated'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'UPDATE_FAILED'));
  }
});

/**
 * POST /api/users/:id/suspend
 * Suspend user (admin only)
 */
router.post('/:id/suspend', async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json(API_RESPONSE.error('Forbidden: Admin access required', 'FORBIDDEN'));
    }
    
    const user = await suspendUser(req.params.id, req.user.userId);
    res.json(API_RESPONSE.success(user, 'User suspended'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'SUSPEND_FAILED'));
  }
});

/**
 * POST /api/users/:id/activate
 * Activate suspended user (admin only)
 */
router.post('/:id/activate', async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json(API_RESPONSE.error('Forbidden: Admin access required', 'FORBIDDEN'));
    }
    
    const user = await activateUser(req.params.id, req.user.userId);
    res.json(API_RESPONSE.success(user, 'User activated'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'ACTIVATE_FAILED'));
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json(API_RESPONSE.error('Forbidden: Admin access required', 'FORBIDDEN'));
    }
    
    await deleteUser(req.params.id, req.user.userId);
    res.json(API_RESPONSE.success(null, 'User deleted'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'DELETE_FAILED'));
  }
});

/**
 * POST /api/users/:id/reset-password
 * Reset user password (admin only)
 */
router.post('/:id/reset-password', async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json(API_RESPONSE.error('Forbidden: Admin access required', 'FORBIDDEN'));
    }
    
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json(API_RESPONSE.error('Password must be at least 8 characters', 'INVALID_PASSWORD'));
    }
    
    await resetPassword(req.params.id, newPassword, req.user.userId);
    res.json(API_RESPONSE.success(null, 'Password reset successfully'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'RESET_FAILED'));
  }
});

export default router;
