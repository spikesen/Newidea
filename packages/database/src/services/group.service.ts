import { prisma, GroupType, UserRole } from '../index';

export async function createGroup(data: {
  name: string;
  description?: string;
  avatarUrl?: string;
  type?: GroupType;
  ownerId: string;
  memberIds?: string[];
}, performedBy: string) {
  const { name, description, avatarUrl, type = GroupType.PRIVATE, ownerId, memberIds = [] } = data;

  const group = await prisma.group.create({
    data: {
      name,
      description,
      avatarUrl,
      type,
      ownerId,
      members: {
        create: [
          { userId: ownerId, role: UserRole.ADMIN, isModerator: true },
          ...memberIds.filter(id => id !== ownerId).map(userId => ({
            userId,
            role: UserRole.MEMBER,
            isModerator: false,
          })),
        ],
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'GROUP_CREATED',
      entityType: 'Group',
      entityId: group.id,
      performedBy,
      metadata: { name, type },
    },
  });

  return group;
}

export async function getGroupById(groupId: string) {
  return prisma.group.findUnique({
    where: { id: groupId },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              lastSeenAt: true,
            },
          },
        },
      },
      _count: {
        select: {
          messages: true,
          members: true,
        },
      },
    },
  });
}

export async function getAllGroups(page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  const [groups, total] = await Promise.all([
    prisma.group.findMany({
      skip,
      take: limit,
      include: {
        owner: {
          select: { id: true, username: true },
        },
        _count: {
          select: { members: true, messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.group.count(),
  ]);

  return { groups, total, page, limit };
}

export async function getUserGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          owner: {
            select: { id: true, username: true, avatarUrl: true },
          },
          _count: {
            select: { members: true, messages: true },
          },
        },
      },
    },
  });

  return memberships.map(m => ({
    ...m.group,
    membership: {
      role: m.role,
      isModerator: m.isModerator,
      joinedAt: m.joinedAt,
    },
  }));
}

export async function addMemberToGroup(groupId: string, userId: string, performedBy: string) {
  const membership = await prisma.groupMember.create({
    data: {
      groupId,
      userId,
      role: UserRole.MEMBER,
      isModerator: false,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'GROUP_MEMBER_ADDED',
      entityType: 'Group',
      entityId: groupId,
      performedBy,
      metadata: { addedUserId: userId },
    },
  });

  return membership;
}

export async function removeMemberFromGroup(groupId: string, userId: string, performedBy: string) {
  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId } },
  });

  await prisma.auditLog.create({
    data: {
      action: 'GROUP_MEMBER_REMOVED',
      entityType: 'Group',
      entityId: groupId,
      performedBy,
      metadata: { removedUserId: userId },
    },
  });
}

export async function setGroupModerator(groupId: string, userId: string, isModerator: boolean, performedBy: string) {
  const membership = await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId } },
    data: { isModerator },
  });

  await prisma.auditLog.create({
    data: {
      action: 'GROUP_MODERATOR_CHANGED',
      entityType: 'Group',
      entityId: groupId,
      performedBy,
      metadata: { targetUserId: userId, isModerator },
    },
  });

  return membership;
}

export async function updateGroupSettings(groupId: string, settings: {
  name?: string;
  description?: string;
  avatarUrl?: string;
  allowMessages?: boolean;
  allowFiles?: boolean;
  allowLocation?: boolean;
}, performedBy: string) {
  const group = await prisma.group.update({
    where: { id: groupId },
    data: settings,
  });

  await prisma.auditLog.create({
    data: {
      action: 'GROUP_SETTINGS_UPDATED',
      entityType: 'Group',
      entityId: groupId,
      performedBy,
      metadata: settings,
    },
  });

  return group;
}

export async function archiveGroup(groupId: string, performedBy: string) {
  const group = await prisma.group.update({
    where: { id: groupId },
    data: { isArchived: true },
  });

  await prisma.auditLog.create({
    data: {
      action: 'GROUP_ARCHIVED',
      entityType: 'Group',
      entityId: groupId,
      performedBy,
    },
  });

  return group;
}

export async function deleteGroup(groupId: string, performedBy: string) {
  await prisma.group.delete({
    where: { id: groupId },
  });

  await prisma.auditLog.create({
    data: {
      action: 'GROUP_DELETED',
      entityType: 'Group',
      entityId: groupId,
      performedBy,
    },
  });
}

export async function getGroupMembers(groupId: string) {
  return prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          role: true,
          lastSeenAt: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });
}
