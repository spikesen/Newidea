import { Server as SocketIOServer } from 'socket.io';
import Redis from 'ioredis';
import { prisma } from '@nexcomm/database';

interface SocketData {
  userId: string;
  username: string;
  role: string;
}

export function initSocketHandlers(io: SocketIOServer, redis: Redis) {
  // Redis adapter for horizontal scaling (optional)
  // io.adapter(createAdapter({ pubClient: redis, subClient: redis }));

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    let socketData: SocketData | null = null;

    /**
     * Handle user authentication on connect
     */
    socket.on('authenticate', async (data: { token: string }, callback: (response: any) => void) => {
      try {
        const { token } = data;
        
        const session = await prisma.session.findUnique({
          where: { token },
          include: { user: true },
        });

        if (!session || session.expiresAt < new Date() || session.revokedAt) {
          return callback({ success: false, error: 'Invalid token' });
        }

        socketData = {
          userId: session.user.id,
          username: session.user.username,
          role: session.user.role,
        };

        // Store user ID in socket for later use
        socket.data.userId = socketData.userId;

        // Join user's personal room for DMs and notifications
        socket.join(`user:${socketData.userId}`);

        // Broadcast user online status
        io.emit('user_online', socketData.userId);

        // Update last seen
        await prisma.user.update({
          where: { id: socketData.userId },
          data: { lastSeenAt: new Date() },
        });

        callback({ success: true, user: socketData });
      } catch (error: any) {
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Join a room (group or DM)
     */
    socket.on('join_room', async (data: { roomId: string }) => {
      const { roomId } = data;
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
    });

    /**
     * Leave a room
     */
    socket.on('leave_room', (data: { roomId: string }) => {
      const { roomId } = data;
      socket.leave(roomId);
      console.log(`User ${socket.id} left room: ${roomId}`);
    });

    /**
     * Send message via WebSocket
     */
    socket.on('send_message', async (data: { 
      content: string; 
      type: string; 
      roomId: string; 
      replyToId?: string;
      groupId?: string;
      recipientId?: string;
    }, callback: (response: any) => void) => {
      try {
        if (!socketData) {
          return callback({ success: false, error: 'Not authenticated' });
        }

        const { content, type, roomId, replyToId, groupId, recipientId } = data;

        // Create message in database
        const message = await prisma.message.create({
          data: {
            content,
            type: type as any,
            senderId: socketData.userId,
            groupId: groupId || null,
            recipientId: recipientId || null,
            replyToId,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        });

        // Emit to room
        io.to(roomId).emit('new_message', message);

        // For DMs, also emit to recipient's personal room
        if (recipientId) {
          io.to(`user:${recipientId}`).emit('new_message', message);
        }

        callback({ success: true, message });
      } catch (error: any) {
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Typing indicators
     */
    socket.on('typing_start', (data: { roomId: string }) => {
      if (!socketData) return;
      
      const { roomId } = data;
      socket.to(roomId).emit('typing', {
        roomId,
        userId: socketData.userId,
        username: socketData.username,
      });
    });

    socket.on('typing_stop', (data: { roomId: string }) => {
      if (!socketData) return;
      
      const { roomId } = data;
      socket.to(roomId).emit('typing_stop', {
        roomId,
        userId: socketData.userId,
      });
    });

    /**
     * Read receipts
     */
    socket.on('read_receipt', async (data: { messageId: string; roomId: string }) => {
      if (!socketData) return;
      
      const { messageId, roomId } = data;

      try {
        await prisma.readReceipt.upsert({
          where: {
            messageId_userId: {
              messageId,
              userId: socketData.userId,
            },
          },
          create: {
            messageId,
            userId: socketData.userId,
          },
          update: {},
        });

        // Broadcast read receipt to room
        io.to(roomId).emit('read_receipt', {
          messageId,
          userId: socketData.userId,
          readAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error saving read receipt:', error);
      }
    });

    /**
     * Location updates
     */
    socket.on('location_update', async (data: { 
      groupId: string; 
      latitude: number; 
      longitude: number; 
      accuracy?: number;
    }) => {
      if (!socketData) return;
      
      const { groupId, latitude, longitude, accuracy } = data;

      try {
        // Update or create location share
        const existingShare = await prisma.locationShare.findFirst({
          where: {
            groupId,
            userId: socketData.userId,
            isActive: true,
          },
        });

        if (existingShare) {
          await prisma.locationShare.update({
            where: { id: existingShare.id },
            data: { latitude, longitude, accuracy, trackedAt: new Date() },
          });
        } else {
          await prisma.locationShare.create({
            data: {
              groupId,
              userId: socketData.userId,
              latitude,
              longitude,
              accuracy,
              expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Default 1 hour
            },
          });
        }

        // Broadcast to group members
        io.to(groupId).emit('location_update', {
          groupId,
          userId: socketData.userId,
          username: socketData.username,
          latitude,
          longitude,
          accuracy,
          trackedAt: new Date(),
        });
      } catch (error) {
        console.error('Error updating location:', error);
      }
    });

    /**
     * WebRTC signaling for calls
     */
    socket.on('call_signal', (data: { 
      callId: string; 
      signal: any; 
      targetUserId?: string;
      type?: 'offer' | 'answer' | 'ice-candidate';
    }) => {
      if (!socketData) return;
      
      const { callId, signal, targetUserId } = data;

      if (targetUserId) {
        // Send to specific user
        io.to(`user:${targetUserId}`).emit('call_signal', {
          callId,
          fromUser: socketData.userId,
          signal,
        });
      } else {
        // Broadcast to call room
        socket.to(callId).emit('call_signal', {
          callId,
          fromUser: socketData.userId,
          signal,
        });
      }
    });

    /**
     * Call invite
     */
    socket.on('call_invite', (data: { 
      targetUserId: string; 
      type: 'audio' | 'video';
      isGroup?: boolean;
      callId: string;
    }) => {
      if (!socketData) return;
      
      const { targetUserId, type, isGroup, callId } = data;

      io.to(`user:${targetUserId}`).emit('call_invite', {
        callId,
        fromUser: socketData.userId,
        fromUsername: socketData.username,
        type,
        isGroup: isGroup || false,
      });
    });

    /**
     * End call
     */
    socket.on('call_end', (data: { callId: string; reason?: string }) => {
      if (!socketData) return;
      
      const { callId, reason } = data;

      io.to(callId).emit('call_ended', {
        callId,
        fromUser: socketData.userId,
        reason: reason || 'Call ended',
      });
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.id}`);
      
      if (socketData) {
        io.emit('user_offline', socketData.userId);
        
        // Stop any active location shares
        await prisma.locationShare.updateMany({
          where: {
            userId: socketData.userId,
            isActive: true,
          },
          data: {
            isActive: false,
            stoppedAt: new Date(),
          },
        });
      }
    });
  });

  console.log('✅ Socket.IO handlers initialized');
}
