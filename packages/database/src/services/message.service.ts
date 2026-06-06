import { prisma, MessageType, MessageStatus } from '../index';

export async function sendMessage(data: {
  content?: string;
  type?: MessageType;
  senderId: string;
  groupId?: string;
  recipientId?: string;
  replyToId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  latitude?: number;
  longitude?: number;
  locationDuration?: number;
}) {
  const { 
    content, 
    type = MessageType.TEXT, 
    senderId, 
    groupId, 
    recipientId, 
    replyToId,
    fileUrl,
    fileName,
    fileSize,
    mimeType,
    latitude,
    longitude,
    locationDuration,
  } = data;

  // Validate: either group or recipient must be provided
  if (!groupId && !recipientId) {
    throw new Error('Either groupId or recipientId must be provided');
  }

  const message = await prisma.message.create({
    data: {
      content,
      type,
      senderId,
      groupId,
      recipientId,
      replyToId,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      latitude,
      longitude,
      locationDuration,
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          type: true,
          sender: {
            select: { username: true },
          },
        },
      },
    },
  });

  return message;
}

export async function getMessages(groupId?: string, recipientId1?: string, recipientId2?: string, limit = 50, cursor?: string) {
  let whereClause: any = {};

  if (groupId) {
    whereClause.groupId = groupId;
  } else if (recipientId1 && recipientId2) {
    whereClause.OR = [
      { senderId: recipientId1, recipientId: recipientId2 },
      { senderId: recipientId2, recipientId: recipientId1 },
    ];
  } else {
    throw new Error('Either groupId or both recipientIds must be provided');
  }

  whereClause.isDeleted = false;

  const messages = await prisma.message.findMany({
    where: whereClause,
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
      recipient: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          type: true,
          sender: {
            select: { username: true },
          },
        },
      },
      readBy: {
        select: {
          userId: true,
          readAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return messages.reverse();
}

export async function markMessageAsRead(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  // For group messages, anyone can mark as read
  // For DMs, only the recipient can mark as read
  if (message.recipientId && message.recipientId !== userId) {
    throw new Error('Not authorized to mark this message as read');
  }

  return prisma.readReceipt.upsert({
    where: {
      messageId_userId: {
        messageId,
        userId,
      },
    },
    create: {
      messageId,
      userId,
    },
    update: {},
  });
}

export async function markGroupMessagesAsRead(groupId: string, userId: string) {
  const messages = await prisma.message.findMany({
    where: {
      groupId,
      isDeleted: false,
    },
    select: { id: true },
  });

  const receipts = [];
  for (const msg of messages) {
    try {
      const receipt = await prisma.readReceipt.upsert({
        where: {
          messageId_userId: {
            messageId: msg.id,
            userId,
          },
        },
        create: {
          messageId: msg.id,
          userId,
        },
        update: {},
      });
      receipts.push(receipt);
    } catch (e) {
      // Ignore duplicates
    }
  }

  return receipts.length;
}

export async function editMessage(messageId: string, content: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message || message.senderId !== userId) {
    throw new Error('Not authorized to edit this message');
  }

  // Build edit history
  const editHistory = message.editHistory ? (message.editHistory as any[]) : [];
  editHistory.push({
    content: message.content,
    editedAt: message.updatedAt,
  });

  return prisma.message.update({
    where: { id: messageId },
    data: {
      content,
      isEdited: true,
      editHistory,
    },
  });
}

export async function deleteMessage(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message || message.senderId !== userId) {
    throw new Error('Not authorized to delete this message');
  }

  return prisma.message.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      content: null,
      fileUrl: null,
    },
  });
}

export async function addReaction(messageId: string, userId: string, emoji: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  const reactions = (message.reactions as any[]) || [];
  
  // Remove existing reaction from this user if exists
  const filtered = reactions.filter((r: any) => r.userId !== userId);
  
  // Add new reaction
  filtered.push({ emoji, userId, createdAt: new Date().toISOString() });

  return prisma.message.update({
    where: { id: messageId },
    data: { reactions: filtered },
  });
}

export async function removeReaction(messageId: string, userId: string, emoji: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  const reactions = (message.reactions as any[]) || [];
  const filtered = reactions.filter((r: any) => !(r.userId === userId && r.emoji === emoji));

  return prisma.message.update({
    where: { id: messageId },
    data: { reactions: filtered },
  });
}

export async function pinMessage(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message || !message.groupId) {
    throw new Error('Only group messages can be pinned');
  }

  // Check if user is moderator/admin
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId: message.groupId,
        userId,
      },
    },
  });

  if (!membership || (!membership.isModerator && membership.role !== 'ADMIN')) {
    throw new Error('Only moderators can pin messages');
  }

  return prisma.message.update({
    where: { id: messageId },
    data: { isPinned: true },
  });
}

export async function unpinMessage(messageId: string) {
  return prisma.message.update({
    where: { id: messageId },
    data: { isPinned: false },
  });
}

export async function getPinnedMessages(groupId: string) {
  return prisma.message.findMany({
    where: { groupId, isPinned: true, isDeleted: false },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function searchMessages(query: string, groupId?: string, userId?: string, limit = 50) {
  const whereClause: any = {
    isDeleted: false,
    content: {
      contains: query,
      mode: 'insensitive',
    },
  };

  if (groupId) {
    whereClause.groupId = groupId;
  } else if (userId) {
    whereClause.OR = [
      { senderId: userId },
      { recipientId: userId },
    ];
  }

  return prisma.message.findMany({
    where: whereClause,
    take: limit,
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
      group: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
