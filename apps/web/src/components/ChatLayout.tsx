'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { useSocket, useMessageListener, useTypingListener } from '@/hooks';

export function ChatLayout() {
  const { isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const { isConnected } = useSocket();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-16 border-b bg-white dark:bg-gray-900 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-primary">NexComm</h1>
          {!isConnected && (
            <span className="text-xs text-orange-500">● Reconnecting...</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            🔔
          </button>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            ⚙️
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <ConversationList />
        <ChatWindow />
      </div>
    </div>
  );
}
