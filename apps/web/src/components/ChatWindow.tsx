'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore, useAuthStore } from '@/store';
import { socketService } from '@/lib/socket';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  type: 'text' | 'file' | 'voice';
  createdAt: Date;
  readAt?: Date;
  reactions?: Record<string, string[]>;
}

export function ChatWindow() {
  const { activeConversation, messages, addMessage, typingUsers, setTypingUser } = useChatStore();
  const { user } = useAuthStore();
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversationMessages = activeConversation ? (messages[activeConversation] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !activeConversation) return;

    socketService.sendMessage(activeConversation, inputValue.trim(), 'text');
    setInputValue('');
    socketService.stopTyping(activeConversation);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (activeConversation) {
      if (e.target.value) {
        socketService.startTyping(activeConversation);
      } else {
        socketService.stopTyping(activeConversation);
      }
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    // Implement voice recording logic here
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Send recorded audio
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center text-gray-500">
          <p className="text-lg">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          conversationMessages.map((msg: Message) => {
            const isOwn = msg.senderId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    isOwn
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  {!isOwn && (
                    <p className="text-xs font-medium mb-1 opacity-75">
                      {msg.senderName}
                    </p>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <div className={`text-xs mt-1 ${isOwn ? 'opacity-75' : 'text-gray-500'}`}>
                    {format(new Date(msg.createdAt), 'HH:mm')}
                    {isOwn && msg.readAt && (
                      <span className="ml-1">✓✓</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers[activeConversation] && typingUsers[activeConversation].length > 0 && (
        <div className="px-4 py-2 text-sm text-gray-500 italic">
          {typingUsers[activeConversation].length} person(s) typing...
        </div>
      )}

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 rounded-full ${
              isRecording ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            🎤
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="p-2 bg-primary text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
