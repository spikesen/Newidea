import { Router } from 'express';
import { API_RESPONSE } from '@nexcomm/shared';
import {
  createGroup,
  getGroupById,
  getAllGroups,
  getUserGroups,
  addMemberToGroup,
  removeMemberFromGroup,
  setGroupModerator,
  updateGroupSettings,
  archiveGroup,
  deleteGroup,
  getGroupMembers,
} from '@nexcomm/database';
import { GroupType } from '@prisma/client';

const router = Router();

/**
 * GET /api/groups
 * Get all groups (admin) or user's groups
 */
router.get('/', async (req, res) => {
  try {
    if (req.user?.role === 'ADMIN') {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await getAllGroups(page, limit);
      return res.json(API_RESPONSE.success(result));
    }
    
    // Regular users see only their groups
    const groups = await getUserGroups(req.user!.userId);
    res.json(API_RESPONSE.success(groups));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'FETCH_FAILED'));
  }
});

/**
 * POST /api/groups
 * Create a new group
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, avatarUrl, type, memberIds } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json(API_RESPONSE.error('Group name must be at least 2 characters', 'INVALID_NAME'));
    }
    
    const group = await createGroup(
      {
        name,
        description,
        avatarUrl,
        type: type as GroupType || GroupType.PRIVATE,
        ownerId: req.user!.userId,
        memberIds,
      },
      req.user!.userId
    );
    
    res.status(201).json(API_RESPONSE.success(group, 'Group created successfully'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'CREATE_FAILED'));
  }
});

/**
 * GET /api/groups/:id
 * Get group by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const group = await getGroupById(req.params.id);
    
    if (!group) {
      return res.status(404).json(API_RESPONSE.error('Group not found', 'NOT_FOUND'));
    }
    
    // Check if user is a member or admin
    const isMember = group.members.some(m => m.userId === req.user!.userId);
    if (!isMember && req.user?.role !== 'ADMIN') {
      return res.status(403).json(API_RESPONSE.error('Not a member of this group', 'FORBIDDEN'));
    }
    
    res.json(API_RESPONSE.success(group));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'FETCH_FAILED'));
  }
});

/**
 * GET /api/groups/:id/members
 * Get group members
 */
router.get('/:id/members', async (req, res) => {
  try {
    const group = await getGroupById(req.params.id);
    
    if (!group) {
      return res.status(404).json(API_RESPONSE.error('Group not found', 'NOT_FOUND'));
    }
    
    const isMember = group.members.some(m => m.userId === req.user!.userId);
    if (!isMember && req.user?.role !== 'ADMIN') {
      return res.status(403).json(API_RESPONSE.error('Not a member of this group', 'FORBIDDEN'));
    }
    
    const members = await getGroupMembers(req.params.id);
    res.json(API_RESPONSE.success(members));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'FETCH_FAILED'));
  }
});

/**
 * POST /api/groups/:id/members
 * Add member to group
 */
router.post('/:id/members', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json(API_RESPONSE.error('User ID required', 'MISSING_USER_ID'));
    }
    
    const group = await getGroupById(req.params.id);
    
    if (!group) {
      return res.status(404).json(API_RESPONSE.error('Group not found', 'NOT_FOUND'));
    }
    
    // Check if user has permission to add members
    const requesterMembership = group.members.find(m => m.userId === req.user!.userId);
    const isAdmin = req.user?.role === 'ADMIN';
    const isOwner = group.ownerId === req.user!.userId;
    const isModerator = requesterMembership?.isModerator;
    
    if (!isAdmin && !isOwner && !isModerator) {
      return res.status(403).json(API_RESPONSE.error('Not authorized to add members', 'FORBIDDEN'));
    }
    
    await addMemberToGroup(req.params.id, userId, req.user!.userId);
    res.json(API_RESPONSE.success(null, 'Member added successfully'));
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json(API_RESPONSE.error('User is already a member', 'ALREADY_MEMBER'));
    }
    res.status(500).json(API_RESPONSE.error(error.message, 'ADD_MEMBER_FAILED'));
  }
});

/**
 * DELETE /api/groups/:id/members/:userId
 * Remove member from group
 */
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const group = await getGroupById(req.params.id);
    
    if (!group) {
      return res.status(404).json(API_RESPONSE.error('Group not found', 'NOT_FOUND'));
    }
    
    const requesterMembership = group.members.find(m => m.userId === req.user!.userId);
    const isAdmin = req.user?.role === 'ADMIN';
    const isOwner = group.ownerId === req.user!.userId;
    const isModerator = requesterMembership?.isModerator;
    
    if (!isAdmin && !isOwner && !isModerator) {
      return res.status(403).json(API_RESPONSE.error('Not authorized to remove members', 'FORBIDDEN'));
    }
    
    // Cannot remove the owner
    if (req.params.userId === group.ownerId) {
      return res.status(400).json(API_RESPONSE.error('Cannot remove the group owner', 'CANNOT_REMOVE_OWNER'));
    }
    
    await removeMemberFromGroup(req.params.id, req.params.userId, req.user!.userId);
    res.json(API_RESPONSE.success(null, 'Member removed successfully'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'REMOVE_MEMBER_FAILED'));
  }
});

/**
 * POST /api/groups/:id/moderator
 * Set/unset group moderator
 */
router.post('/:id/moderator', async (req, res) => {
  try {
    const { userId, isModerator } = req.body;
    
    if (!userId) {
      return res.status(400).json(API_RESPONSE.error('User ID required', 'MISSING_USER_ID'));
    }
    
    const group = await getGroupById(req.params.id);
    
    if (!group) {
      return res.status(404).json(API_RESPONSE.error('Group not found', 'NOT_FOUND'));
    }
    
    if (req.user?.role !== 'ADMIN' && group.ownerId !== req.user!.userId) {
      return res.status(403).json(API_RESPONSE.error('Only owner or admin can set moderators', 'FORBIDDEN'));
    }
    
    await setGroupModerator(req.params.id, userId, isModerator, req.user!.userId);
    res.json(API_RESPONSE.success(null, 'Moderator status updated'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'UPDATE_FAILED'));
  }
});

/**
 * PUT /api/groups/:id/settings
 * Update group settings
 */
router.put('/:id/settings', async (req, res) => {
  try {
    const group = await getGroupById(req.params.id);
    
    if (!group) {
      return res.status(404).json(API_RESPONSE.error('Group not found', 'NOT_FOUND'));
    }
    
    const requesterMembership = group.members.find(m => m.userId === req.user!.userId);
    const isAdmin = req.user?.role === 'ADMIN';
    const isOwner = group.ownerId === req.user!.userId;
    const isModerator = requesterMembership?.isModerator;
    
    if (!isAdmin && !isOwner && !isModerator) {
      return res.status(403).json(API_RESPONSE.error('Not authorized to update settings', 'FORBIDDEN'));
    }
    
    const { name, description, avatarUrl, allowMessages, allowFiles, allowLocation } = req.body;
    
    const updated = await updateGroupSettings(
      req.params.id,
      { name, description, avatarUrl, allowMessages, allowFiles, allowLocation },
      req.user!.userId
    );
    
    res.json(API_RESPONSE.success(updated, 'Settings updated'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'UPDATE_FAILED'));
  }
});

/**
 * POST /api/groups/:id/archive
 * Archive group
 */
router.post('/:id/archive', async (req, res) => {
  try {
    const group = await getGroupById(req.params.id);
    
    if (!group) {
      return res.status(404).json(API_RESPONSE.error('Group not found', 'NOT_FOUND'));
    }
    
    if (req.user?.role !== 'ADMIN' && group.ownerId !== req.user!.userId) {
      return res.status(403).json(API_RESPONSE.error('Only owner or admin can archive group', 'FORBIDDEN'));
    }
    
    const archived = await archiveGroup(req.params.id, req.user!.userId);
    res.json(API_RESPONSE.success(archived, 'Group archived'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'ARCHIVE_FAILED'));
  }
});

/**
 * DELETE /api/groups/:id
 * Delete group
 */
router.delete('/:id', async (req, res) => {
  try {
    const group = await getGroupById(req.params.id);
    
    if (!group) {
      return res.status(404).json(API_RESPONSE.error('Group not found', 'NOT_FOUND'));
    }
    
    if (req.user?.role !== 'ADMIN' && group.ownerId !== req.user!.userId) {
      return res.status(403).json(API_RESPONSE.error('Only owner or admin can delete group', 'FORBIDDEN'));
    }
    
    await deleteGroup(req.params.id, req.user!.userId);
    res.json(API_RESPONSE.success(null, 'Group deleted'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'DELETE_FAILED'));
  }
});

export default router;
