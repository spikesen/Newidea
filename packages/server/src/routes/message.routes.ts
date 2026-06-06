import { Router } from 'express';
import { API_RESPONSE } from '@nexcomm/shared';
import {
  sendMessage,
  getMessages,
  markMessageAsRead,
  markGroupMessagesAsRead,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  searchMessages,
} from '@nexcomm/database';
import { MessageType } from '@prisma/client';

const router = Router();

/**
 * GET /api/messages/group/:groupId
 * Get messages for a group
 */
router.get('/group/:groupId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const cursor = req.query.cursor as string | undefined;
    
    const messages = await getMessages(req.params.groupId, undefined, undefined, limit, cursor);
    res.json(API_RESPONSE.success(messages));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'FETCH_FAILED'));
  }
});

/**
 * GET /api/messages/dm/:userId
 * Get DM messages with another user
 */
router.get('/dm/:userId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const cursor = req.query.cursor as string | undefined;
    
    const messages = await getMessages(undefined, req.user!.userId, req.params.userId, limit, cursor);
    res.json(API_RESPONSE.success(messages));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'FETCH_FAILED'));
  }
});

/**
 * POST /api/messages
 * Send a new message
 */
router.post('/', async (req, res) => {
  try {
    const { content, type, groupId, recipientId, replyToId } = req.body;
    
    if (!groupId && !recipientId) {
      return res.status(400).json(API_RESPONSE.error('Either groupId or recipientId required', 'INVALID_REQUEST'));
    }
    
    const message = await sendMessage({
      content,
      type: type as MessageType || MessageType.TEXT,
      senderId: req.user!.userId,
      groupId,
      recipientId,
      replyToId,
    });
    
    // Emit via WebSocket (handled by socket layer)
    res.status(201).json(API_RESPONSE.success(message, 'Message sent'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'SEND_FAILED'));
  }
});

/**
 * POST /api/messages/:id/read
 * Mark message as read
 */
router.post('/:id/read', async (req, res) => {
  try {
    await markMessageAsRead(req.params.id, req.user!.userId);
    res.json(API_RESPONSE.success(null, 'Marked as read'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'UPDATE_FAILED'));
  }
});

/**
 * POST /api/messages/group/:groupId/read-all
 * Mark all group messages as read
 */
router.post('/group/:groupId/read-all', async (req, res) => {
  try {
    const count = await markGroupMessagesAsRead(req.params.groupId, req.user!.userId);
    res.json(API_RESPONSE.success({ count }, `${count} messages marked as read`));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'UPDATE_FAILED'));
  }
});

/**
 * PUT /api/messages/:id
 * Edit a message
 */
router.put('/:id', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json(API_RESPONSE.error('Content required', 'MISSING_CONTENT'));
    }
    
    const message = await editMessage(req.params.id, content, req.user!.userId);
    res.json(API_RESPONSE.success(message, 'Message edited'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'EDIT_FAILED'));
  }
});

/**
 * DELETE /api/messages/:id
 * Delete a message
 */
router.delete('/:id', async (req, res) => {
  try {
    await deleteMessage(req.params.id, req.user!.userId);
    res.json(API_RESPONSE.success(null, 'Message deleted'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'DELETE_FAILED'));
  }
});

/**
 * POST /api/messages/:id/reaction
 * Add reaction to message
 */
router.post('/:id/reaction', async (req, res) => {
  try {
    const { emoji } = req.body;
    
    if (!emoji) {
      return res.status(400).json(API_RESPONSE.error('Emoji required', 'MISSING_EMOJI'));
    }
    
    const message = await addReaction(req.params.id, req.user!.userId, emoji);
    res.json(API_RESPONSE.success(message, 'Reaction added'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'REACTION_FAILED'));
  }
});

/**
 * DELETE /api/messages/:id/reaction
 * Remove reaction from message
 */
router.delete('/:id/reaction/:emoji', async (req, res) => {
  try {
    const message = await removeReaction(req.params.id, req.user!.userId, req.params.emoji);
    res.json(API_RESPONSE.success(message, 'Reaction removed'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'REACTION_FAILED'));
  }
});

/**
 * POST /api/messages/:id/pin
 * Pin a message (group only)
 */
router.post('/:id/pin', async (req, res) => {
  try {
    await pinMessage(req.params.id, req.user!.userId);
    res.json(API_RESPONSE.success(null, 'Message pinned'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'PIN_FAILED'));
  }
});

/**
 * DELETE /api/messages/:id/pin
 * Unpin a message
 */
router.delete('/:id/pin', async (req, res) => {
  try {
    await unpinMessage(req.params.id);
    res.json(API_RESPONSE.success(null, 'Message unpinned'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'UNPIN_FAILED'));
  }
});

/**
 * GET /api/messages/group/:groupId/pinned
 * Get pinned messages for a group
 */
router.get('/group/:groupId/pinned', async (req, res) => {
  try {
    const messages = await getPinnedMessages(req.params.groupId);
    res.json(API_RESPONSE.success(messages));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'FETCH_FAILED'));
  }
});

/**
 * GET /api/messages/search
 * Search messages
 */
router.get('/search', async (req, res) => {
  try {
    const { q, groupId, limit } = req.query;
    
    if (!q) {
      return res.status(400).json(API_RESPONSE.error('Search query required', 'MISSING_QUERY'));
    }
    
    const messages = await searchMessages(
      q as string,
      groupId as string | undefined,
      req.user!.userId,
      parseInt(limit as string) || 50
    );
    
    res.json(API_RESPONSE.success(messages));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'SEARCH_FAILED'));
  }
});

export default router;
