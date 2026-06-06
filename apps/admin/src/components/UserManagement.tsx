'use client';

import { useState, useEffect } from 'react';
import { User, Phone, Video, Trash2, Shield, Ban, CheckCircle } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MODERATOR' | 'MEMBER';
  status: 'ACTIVE' | 'SUSPENDED';
  lastSeen: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [callTarget, setCallTarget] = useState<string | null>(null);

  useEffect(() => {
    // In production, fetch from API
    // fetch('/api/admin/users').then(...)
    setUsers([
      { id: '1', email: 'alice@example.com', name: 'Alice Johnson', role: 'MEMBER', status: 'ACTIVE', lastSeen: '2 mins ago' },
      { id: '2', email: 'bob@example.com', name: 'Bob Smith', role: 'MODERATOR', status: 'ACTIVE', lastSeen: '1 hour ago' },
      { id: '3', email: 'charlie@example.com', name: 'Charlie Brown', role: 'MEMBER', status: 'SUSPENDED', lastSeen: '5 days ago' },
    ]);
    setLoading(false);
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'ADMIN' | 'MODERATOR' | 'MEMBER') => {
    // API call to update role
    console.log(`Updating ${userId} to ${newRole}`);
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const handleStatusToggle = async (userId: string, currentStatus: 'ACTIVE' | 'SUSPENDED') => {
    // API call to toggle status
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    console.log(`Toggling ${userId} to ${newStatus}`);
    setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
  };

  const initiateCall = (userId: string, type: 'audio' | 'video') => {
    setCallTarget(userId);
    // In a real app, this would trigger the WebRTC signaling via Socket.IO
    // window.dispatchEvent(new CustomEvent('initiate-admin-call', { detail: { userId, type } }));
    alert(`Initiating ${type} call with user ${userId}... (WebRTC Signaling)`);
    setTimeout(() => setCallTarget(null), 3000);
  };

  if (loading) return <div className="p-4">Loading users...</div>;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
          Invite New User
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className={callTarget === user.id ? 'bg-indigo-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select 
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                    className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastSeen}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {/* Admin Calling Controls */}
                    <button 
                      onClick={() => initiateCall(user.id, 'audio')}
                      className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-100"
                      title="Audio Call"
                    >
                      <Phone size={18} />
                    </button>
                    <button 
                      onClick={() => initiateCall(user.id, 'video')}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100"
                      title="Video Call"
                    >
                      <Video size={18} />
                    </button>
                    
                    <button 
                      onClick={() => handleStatusToggle(user.id, user.status)}
                      className={`${user.status === 'ACTIVE' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'} p-1`}
                      title={user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    >
                      {user.status === 'ACTIVE' ? <Ban size={18} /> : <CheckCircle size={18} />}
                    </button>
                    <button className="text-red-600 hover:text-red-900 p-1" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {callTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full text-center">
            <div className="animate-pulse mb-4">
              <Video size={48} className="mx-auto text-indigo-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Connecting Call...</h3>
            <p className="text-sm text-gray-500 mt-2">Establishing secure WebRTC connection</p>
            <button 
              onClick={() => setCallTarget(null)}
              className="mt-6 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
