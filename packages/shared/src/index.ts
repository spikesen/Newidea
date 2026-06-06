// Shared types and utilities for NexComm
export interface User {
  id: string;
  email: string;
  username: string;
  role: 'ADMIN' | 'MODERATOR' | 'MEMBER';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  avatarUrl?: string;
  firstName?: string;
  lastName?: string;
  lastSeenAt?: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  type: 'PRIVATE' | 'BROADCAST';
  ownerId: string;
  isArchived: boolean;
  allowMessages: boolean;
  allowFiles: boolean;
  allowLocation: boolean;
}

export interface Message {
  id: string;
  content?: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'VOICE_MESSAGE' | 'LOCATION';
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
  status: 'SENT' | 'DELIVERED' | 'READ';
  isEdited: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  reactions?: Array<{ emoji: string; userId: string; createdAt: string }>;
  editHistory?: Array<{ content: string; editedAt: string }>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface LocationShare {
  id: string;
  userId: string;
  groupId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  isActive: boolean;
  expiresAt: Date;
  stoppedAt?: Date;
  trackedAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface SocketEvents {
  // Client -> Server
  'join_room': (data: { roomId: string }) => void;
  'leave_room': (data: { roomId: string }) => void;
  'send_message': (data: { content: string; type: string; roomId: string; replyToId?: string }) => void;
  'typing_start': (data: { roomId: string }) => void;
  'typing_stop': (data: { roomId: string }) => void;
  'read_receipt': (data: { messageId: string; roomId: string }) => void;
  'location_update': (data: { groupId: string; latitude: number; longitude: number; accuracy?: number }) => void;
  'call_signal': (data: { callId: string; signal: any; targetUserId?: string }) => void;
  
  // Server -> Client
  'new_message': (message: Message) => void;
  'message_updated': (message: Message) => void;
  'message_deleted': (messageId: string) => void;
  'typing': (data: { roomId: string; userId: string; username: string }) => void;
  'read_receipt': (data: { messageId: string; userId: string; readAt: string }) => void;
  'user_online': (userId: string) => void;
  'user_offline': (userId: string) => void;
  'location_update': (data: LocationShare & { username: string }) => void;
  'call_invite': (data: { callId: string; fromUser: string; type: 'audio' | 'video'; isGroup: boolean }) => void;
  'call_signal': (data: { callId: string; fromUser: string; signal: any }) => void;
  'call_ended': (data: { callId: string; reason: string }) => void;
}

export const API_RESPONSE = {
  success: <T>(data: T, message = 'Success') => ({
    success: true,
    data,
    message,
  }),
  error: (message: string, code = 'ERROR') => ({
    success: false,
    error: { message, code },
  }),
};

export type APIResponse<T> = ReturnType<typeof API_RESPONSE.success<T>> | ReturnType<typeof API_RESPONSE.error>;
