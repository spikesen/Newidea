'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Phone, Video, UserPlus, Edit2, Trash2, Shield, Ban, CheckCircle, LogOut } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalGroups: number;
  messagesToday: number;
  storageUsed: number;
  activeCalls: number;
  locationShares: number;
}

interface User {
  id: string;
  email: string;
  username: string;
  role: 'ADMIN' | 'MODERATOR' | 'MEMBER';
  isSuspended: boolean;
  lastSeen: string;
  createdAt: Date;
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [callTarget, setCallTarget] = useState<{ userId: string; type: 'audio' | 'video' } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadDashboardData(token);
  }, []);

  const loadDashboardData = async (token: string) => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    const token = localStorage.getItem('adminToken');
    try {
      await axios.patch(
        `${API_URL}/admin/users/${userId}/suspend`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(users.map(u => u.id === userId ? { ...u, isSuspended: !u.isSuspended } : u));
    } catch (error) {
      console.error('Failed to suspend user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure? This will permanently delete the user.')) return;
    
    const token = localStorage.getItem('adminToken');
    try {
      await axios.delete(`${API_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'ADMIN' | 'MODERATOR' | 'MEMBER') => {
    const token = localStorage.getItem('adminToken');
    try {
      await axios.patch(
        `${API_URL}/admin/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const initiateCall = (userId: string, type: 'audio' | 'video') => {
    setCallTarget({ userId, type });
    
    // In production, this would trigger WebRTC signaling via Socket.IO
    // The backend would send a call_invite event to the target user
    setTimeout(() => {
      alert(`Initiating ${type} call with user ${userId}...\n\nIn production, this would:\n1. Send WebRTC offer via Socket.IO\n2. Establish P2P/SFU connection\n3. Open video/audio interface`);
      setCallTarget(null);
    }, 1500);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-red-500">NexComm Admin</h1>
            <span className="text-gray-400 text-sm">Control Panel</span>
          </div>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2">
              <UserPlus size={18} />
              <span>Invite User</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center space-x-2"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-400 text-sm mb-2">Total Users</h3>
                <p className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</p>
                <p className="text-green-500 text-xs mt-1">+12% this week</p>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-full">
                <Shield className="text-blue-500" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-400 text-sm mb-2">Active Now</h3>
                <p className="text-3xl font-bold text-green-500">{stats?.activeUsers || 0}</p>
                <p className="text-green-500 text-xs mt-1">Real-time</p>
              </div>
              <div className="bg-green-500/20 p-3 rounded-full">
                <CheckCircle className="text-green-500" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-400 text-sm mb-2">Messages Today</h3>
                <p className="text-3xl font-bold text-purple-500">{stats?.messagesToday || 0}</p>
                <p className="text-green-500 text-xs mt-1">+18% vs yesterday</p>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-full">
                <Edit2 className="text-purple-500" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-400 text-sm mb-2">Active Calls</h3>
                <p className="text-3xl font-bold text-red-500">{stats?.activeCalls || 0}</p>
                <p className="text-red-500 text-xs mt-1">Live now</p>
              </div>
              <div className="bg-red-500/20 p-3 rounded-full">
                <Video className="text-red-500" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">Total Groups</h3>
            <p className="text-2xl font-bold text-blue-400">{stats?.totalGroups || 0}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">Location Shares Active</h3>
            <p className="text-2xl font-bold text-yellow-400">{stats?.locationShares || 0}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">Storage Used</h3>
            <p className="text-2xl font-bold text-gray-400">{((stats?.storageUsed || 0) / 1024).toFixed(2)} GB</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">User Management</h2>
            <input
              type="text"
              placeholder="Search users..."
              className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-red-500"
            />
          </div>
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Last Seen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-750 ${callTarget?.userId === user.id ? 'bg-indigo-900/30' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{user.username}</div>
                        <div className="text-gray-400 text-sm">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                      className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-red-500"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    {user.isSuspended ? (
                      <span className="px-2 py-1 bg-red-900/50 text-red-400 rounded text-xs">Suspended</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{user.lastSeen || 'Never'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {/* Admin Calling Controls */}
                      <button
                        onClick={() => initiateCall(user.id, 'audio')}
                        className="p-2 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition-colors"
                        title="Audio Call"
                      >
                        <Phone size={16} />
                      </button>
                      <button
                        onClick={() => initiateCall(user.id, 'video')}
                        className="p-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors"
                        title="Video Call"
                      >
                        <Video size={16} />
                      </button>
                      
                      <button
                        onClick={() => handleSuspendUser(user.id)}
                        className={`p-2 rounded transition-colors ${
                          user.isSuspended 
                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' 
                            : 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                        }`}
                        title={user.isSuspended ? 'Unsuspend' : 'Suspend'}
                      >
                        {user.isSuspended ? <CheckCircle size={16} /> : <Ban size={16} />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Call Initiation Modal */}
      {callTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-700 shadow-2xl">
            <div className="text-center">
              <div className="animate-pulse mb-6">
                <div className="mx-auto h-20 w-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                  {callTarget.type === 'video' ? (
                    <Video className="text-white" size={40} />
                  ) : (
                    <Phone className="text-white" size={40} />
                  )}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Initiating {callTarget.type === 'video' ? 'Video' : 'Audio'} Call...
              </h3>
              <p className="text-gray-400 mb-6">
                Connecting to user {callTarget.userId}
              </p>
              
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                  <span>Establishing secure WebRTC connection</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  • DTLS-SRTP Encryption<br/>
                  • STUN/TURN Negotiation<br/>
                  • SFU Media Routing
                </div>
              </div>
              
              <button
                onClick={() => setCallTarget(null)}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Cancel Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
