'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Phone, Video, Paperclip, Smile, Mic, MapPin } from 'lucide-react';
import io from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  type: 'text' | 'image' | 'file' | 'voice';
  read: boolean;
}

interface ChatUser {
  id: string;
  username: string;
  email: string;
  online: boolean;
}

export default function ChatPage({ params }: { params: { chatId: string } }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [typing, setTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const socketRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Initialize Socket.IO connection
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to chat server');
      socketRef.current.emit('join_room', params.chatId);
    });

    socketRef.current.on('new_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socketRef.current.on('user_typing', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTyping(isTyping);
    });

    socketRef.current.on('read_receipt', ({ messageId, userId }: { messageId: string; userId: string }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, read: true } : m
      ));
    });

    // Load chat user info and messages
    loadChatData(token);

    return () => {
      socketRef.current?.disconnect();
    };
  }, [params.chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatData = async (token: string) => {
    try {
      const [userRes, messagesRes] = await Promise.all([
        fetch(`${API_URL}/users/${params.chatId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/messages/${params.chatId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const userData = await userRes.json();
      const messagesData = await messagesRes.json();

      setChatUser(userData);
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load chat data:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !socketRef.current) return;

    const messageData = {
      roomId: params.chatId,
      content: newMessage,
      type: 'text' as const,
    };

    // Optimistic update
    const optimisticMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      senderId: 'me',
      createdAt: new Date().toISOString(),
      type: 'text',
      read: false,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    // Send via socket
    socketRef.current.emit('send_message', messageData);

    // Also send via REST for persistence
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(messageData),
    });
  };

  const handleTyping = () => {
    if (socketRef.current) {
      socketRef.current.emit('typing', { roomId: params.chatId, isTyping: true });
      
      // Stop typing indicator after 2 seconds
      setTimeout(() => {
        socketRef.current?.emit('typing', { roomId: params.chatId, isTyping: false });
      }, 2000);
    }
  };

  const initiateCall = (type: 'audio' | 'video') => {
    if (!socketRef.current) return;
    
    // Send call invite via socket
    socketRef.current.emit('call_invite', {
      targetUserId: params.chatId,
      type,
    });

    // Navigate to call page
    router.push(`/call/${params.chatId}?type=${type}`);
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        // Send location via socket
        socketRef.current?.emit('share_location', {
          roomId: params.chatId,
          ...locationData,
        });

        alert(`Location shared: ${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`);
      },
      (error) => {
        alert('Unable to retrieve location: ' + error.message);
      }
    );
  };

  const startRecording = () => {
    setRecording(true);
    // In production, use MediaRecorder API for actual voice recording
    setTimeout(() => {
      setRecording(false);
      // Send voice message
      socketRef.current?.emit('send_message', {
        roomId: params.chatId,
        content: 'Voice message (placeholder)',
        type: 'voice',
      });
    }, 3000);
  };

  if (!chatUser) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold ${
              chatUser.online ? 'bg-green-500' : 'bg-gray-600'
            }`}>
              {chatUser.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{chatUser.username}</h2>
              <p className={`text-sm ${chatUser.online ? 'text-green-400' : 'text-gray-400'}`}>
                {chatUser.online ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => initiateCall('audio')}
              className="p-3 bg-green-600/20 text-green-400 rounded-full hover:bg-green-600/30 transition-colors"
              title="Audio Call"
            >
              <Phone size={20} />
            </button>
            <button
              onClick={() => initiateCall('video')}
              className="p-3 bg-blue-600/20 text-blue-400 rounded-full hover:bg-blue-600/30 transition-colors"
              title="Video Call"
            >
              <Video size={20} />
            </button>
            <button
              onClick={shareLocation}
              className="p-3 bg-yellow-600/20 text-yellow-400 rounded-full hover:bg-yellow-600/30 transition-colors"
              title="Share Location"
            >
              <MapPin size={20} />
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-3 ${
                  message.senderId === 'me'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                <p>{message.content}</p>
                <div className="flex items-center justify-end mt-1 space-x-1">
                  <span className="text-xs opacity-70">
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {message.senderId === 'me' && (
                    <span className={`text-xs ${message.read ? 'text-blue-300' : 'text-gray-400'}`}>
                      {message.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {typing && (
            <div className="flex justify-start">
              <div className="bg-gray-700 rounded-lg px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
          <div className="flex items-center space-x-3">
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Paperclip size={20} />
            </button>
            
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-gray-700 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Smile size={20} />
            </button>
            
            <button
              onClick={startRecording}
              className={`p-2 rounded-full transition-colors ${
                recording ? 'bg-red-600 text-white animate-pulse' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Mic size={20} />
            </button>
            
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
          
          {recording && (
            <div className="mt-2 text-center text-sm text-red-400">
              Recording... Click mic again to stop
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
