'use client';

import { useState, useEffect } from 'react';
import { Users, MessageSquare, Video, MapPin, HardDrive, Activity } from 'lucide-react';

export default function DashboardStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalGroups: 0,
    messagesToday: 0,
    activeCalls: 0,
    locationShares: 0,
    storageUsed: '0 GB',
  });

  useEffect(() => {
    // Fetch stats from API in production
    // fetch('/api/admin/stats').then(...)
    setStats({
      totalUsers: 156,
      activeUsers: 42,
      totalGroups: 23,
      messagesToday: 1247,
      activeCalls: 5,
      locationShares: 12,
      storageUsed: '4.2 GB',
    });
  }, []);

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-500', change: '+12%' },
    { title: 'Active Now', value: stats.activeUsers, icon: Activity, color: 'bg-green-500', change: '+5%' },
    { title: 'Groups', value: stats.totalGroups, icon: Users, color: 'bg-purple-500', change: '+3' },
    { title: 'Messages Today', value: stats.messagesToday, icon: MessageSquare, color: 'bg-indigo-500', change: '+18%' },
    { title: 'Active Calls', value: stats.activeCalls, icon: Video, color: 'bg-red-500', change: 'Live' },
    { title: 'Location Shares', value: stats.locationShares, icon: MapPin, color: 'bg-yellow-500', change: 'Real-time' },
    { title: 'Storage Used', value: stats.storageUsed, icon: HardDrive, color: 'bg-gray-500', change: '65%' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat) => (
        <div key={stat.title} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              <p className="text-xs text-green-600 mt-1">{stat.change}</p>
            </div>
            <div className={`${stat.color} p-3 rounded-full`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
