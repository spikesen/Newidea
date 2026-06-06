import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  role: 'ADMIN' | 'MODERATOR' | 'MEMBER';
  isOnline: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (user, token, refreshToken) =>
        set({ user, token, refreshToken, isAuthenticated: true }),
      logout: () =>
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: 'auth-storage',
    }
  )
);

interface ChatState {
  conversations: any[];
  activeConversation: string | null;
  messages: Record<string, any[]>;
  typingUsers: Record<string, string[]>;
  setConversations: (conversations: any[]) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: any) => void;
  updateMessage: (conversationId: string, messageId: string, updates: any) => void;
  setTypingUser: (conversationId: string, userId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: {},
  typingUsers: {},
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversation: id }),
  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message],
      },
    })),
  updateMessage: (conversationId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.id === messageId ? { ...m, ...updates } : m
        ),
      },
    })),
  setTypingUser: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      const updated = isTyping
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId);
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: updated,
        },
      };
    }),
}));

interface CallState {
  activeCall: any | null;
  isIncomingCall: boolean;
  incomingCallData: any | null;
  startCall: (callData: any) => void;
  endCall: () => void;
  setIncomingCall: (data: any | null) => void;
}

export const useCallStore = create<CallState>((set) => ({
  activeCall: null,
  isIncomingCall: false,
  incomingCallData: null,
  startCall: (callData) => set({ activeCall: callData }),
  endCall: () => set({ activeCall: null }),
  setIncomingCall: (data) =>
    set({ isIncomingCall: !!data, incomingCallData: data }),
}));

interface LocationState {
  sharingLocation: Record<string, boolean>;
  activeLocations: Record<string, { latitude: number; longitude: number; userId: string; updatedAt: Date }[]>;
  startSharing: (roomId: string) => void;
  stopSharing: (roomId: string) => void;
  updateLocation: (roomId: string, latitude: number, longitude: number, userId: string) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  sharingLocation: {},
  activeLocations: {},
  startSharing: (roomId) =>
    set((state) => ({
      sharingLocation: { ...state.sharingLocation, [roomId]: true },
    })),
  stopSharing: (roomId) =>
    set((state) => ({
      sharingLocation: { ...state.sharingLocation, [roomId]: false },
    })),
  updateLocation: (roomId, latitude, longitude, userId) =>
    set((state) => {
      const locations = state.activeLocations[roomId] || [];
      const existingIndex = locations.findIndex((loc) => loc.userId === userId);
      const newLocation = { latitude, longitude, userId, updatedAt: new Date() };
      
      if (existingIndex >= 0) {
        locations[existingIndex] = newLocation;
      } else {
        locations.push(newLocation);
      }
      
      return {
        activeLocations: {
          ...state.activeLocations,
          [roomId]: locations,
        },
      };
    }),
}));
