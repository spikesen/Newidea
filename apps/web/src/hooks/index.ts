import { useState, useEffect } from 'react';
import { socketService } from '@/lib/socket';
import { useAuthStore } from '@/store';

export function useSocket() {
  const { token } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (token && !isConnected) {
      socketService.connect(token);
      setIsConnected(true);
    }

    return () => {
      // Don't disconnect on unmount, keep connection alive
    };
  }, [token]);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketService.getSocket()?.on('connect', handleConnect);
    socketService.getSocket()?.on('disconnect', handleDisconnect);

    return () => {
      socketService.getSocket()?.off('connect', handleConnect);
      socketService.getSocket()?.off('disconnect', handleDisconnect);
    };
  }, []);

  return { isConnected, socket: socketService.getSocket() };
}

export function useMessageListener(conversationId: string, onMessage: (msg: any) => void) {
  useEffect(() => {
    socketService.onMessage((message) => {
      if (message.roomId === conversationId) {
        onMessage(message);
      }
    });

    return () => {
      socketService.removeListener('new_message', onMessage);
    };
  }, [conversationId, onMessage]);
}

export function useTypingListener(conversationId: string, onTyping: (userId: string, isTyping: boolean) => void) {
  useEffect(() => {
    const handleTyping = (data: { roomId: string; userId: string; isTyping: boolean }) => {
      if (data.roomId === conversationId) {
        onTyping(data.userId, data.isTyping);
      }
    };

    socketService.onTyping(handleTyping);

    return () => {
      socketService.removeListener('typing_update', handleTyping);
    };
  }, [conversationId, onTyping]);
}

export function useLocationTracking(conversationId: string, isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        socketService.shareLocation(conversationId, latitude, longitude);
      },
      (error) => console.error('Location error:', error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      socketService.stopLocationShare(conversationId);
    };
  }, [conversationId, isActive]);
}
