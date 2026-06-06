import { io, Socket } from 'socket.io-client';
import { WS_URL } from './api';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Message events
  sendMessage(roomId: string, content: string, type: 'text' | 'file' | 'voice' = 'text') {
    this.socket?.emit('send_message', { roomId, content, type });
  }

  // Typing indicators
  startTyping(roomId: string) {
    this.socket?.emit('typing_start', { roomId });
  }

  stopTyping(roomId: string) {
    this.socket?.emit('typing_stop', { roomId });
  }

  // Read receipts
  markAsRead(messageIds: string[]) {
    this.socket?.emit('mark_read', { messageIds });
  }

  // Location sharing
  shareLocation(roomId: string, latitude: number, longitude: number) {
    this.socket?.emit('location_update', { roomId, latitude, longitude });
  }

  stopLocationShare(roomId: string) {
    this.socket?.emit('location_stop', { roomId });
  }

  // Video call signaling
  inviteToCall(roomId: string, type: 'audio' | 'video') {
    this.socket?.emit('call_invite', { roomId, type });
  }

  acceptCall(callId: string) {
    this.socket?.emit('call_accept', { callId });
  }

  rejectCall(callId: string) {
    this.socket?.emit('call_reject', { callId });
  }

  endCall(callId: string) {
    this.socket?.emit('call_end', { callId });
  }

  sendSignal(callId: string, signal: any) {
    this.socket?.emit('call_signal', { callId, signal });
  }

  // Event listeners
  onMessage(callback: (message: any) => void) {
    this.socket?.on('new_message', callback);
  }

  onTyping(callback: (data: { roomId: string; userId: string }) => void) {
    this.socket?.on('typing_update', callback);
  }

  onReadReceipt(callback: (data: { messageId: string; readAt: string }) => void) {
    this.socket?.on('read_receipt', callback);
  }

  onLocationUpdate(callback: (data: any) => void) {
    this.socket?.on('location_update', callback);
  }

  onCallInvite(callback: (data: any) => void) {
    this.socket?.on('call_invite', callback);
  }

  onCallSignal(callback: (data: any) => void) {
    this.socket?.on('call_signal', callback);
  }

  onUserOnline(callback: (userId: string) => void) {
    this.socket?.on('user_online', callback);
  }

  onUserOffline(callback: (userId: string) => void) {
    this.socket?.on('user_offline', callback);
  }

  removeListener(event: string, callback: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }
}

export const socketService = new SocketService();
