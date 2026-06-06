'use client';

import React from 'react';
import Link from 'next/link';
import { useAuthStore, useChatStore } from '@/store';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageAt: Date;
  unreadCount: number;
  isGroup: boolean;
  type: 'direct' | 'group';
}

export function ConversationList() {
  const { conversations, activeConversation, setActiveConversation } = useChatStore();

  return (
    <div className="w-80 border-r bg-white dark:bg-gray-900 h-full overflow-y-auto">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Messages</h2>
      </div>
      <div>
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No conversations yet
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                activeConversation === conv.id ? 'bg-gray-100 dark:bg-gray-800' : ''
              }`}
            >
              <div className="relative">
                {conv.avatar ? (
                  <img
                    src={conv.avatar}
                    alt={conv.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                    {conv.name[0].toUpperCase()}
                  </div>
                )}
                {conv.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium truncate">{conv.name}</h3>
                  {conv.lastMessageAt && (
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {conv.lastMessage || 'No messages yet'}
                </p>
              </div>
              {conv.unreadCount > 0 && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-primary rounded-full">
                    {conv.unreadCount}
                  </span>
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
