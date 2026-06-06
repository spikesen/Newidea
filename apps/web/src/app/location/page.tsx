'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, X, Play, Pause, StopCircle } from 'lucide-react';

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  userId: string;
  username: string;
}

interface ActiveShare {
  id: string;
  duration: number;
  expiresAt: number;
}

export default function LocationSharingPage() {
  const [sharingLocation, setSharingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [activeShares, setActiveShares] = useState<ActiveShare[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number>(15 * 60); // 15 minutes in seconds
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Mock data for other users sharing location
  const [otherUsersLocations] = useState<LocationUpdate[]>([
    {
      userId: 'user1',
      username: 'Alice Johnson',
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
      timestamp: Date.now(),
    },
    {
      userId: 'user2',
      username: 'Bob Smith',
      latitude: 40.7580,
      longitude: -73.9855,
      accuracy: 15,
      timestamp: Date.now() - 30000,
    },
  ]);

  useEffect(() => {
    if (sharingLocation && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            stopSharing();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sharingLocation, timeRemaining]);

  const startSharing = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setSharingLocation(true);
    setTimeRemaining(selectedDuration);

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationUpdate = {
          userId: 'me',
          username: 'You',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };

        setCurrentLocation(location);

        // In production, send to server via WebSocket
        console.log('Location update:', location);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location: ' + error.message);
        stopSharing();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    // Create active share record
    const newShare: ActiveShare = {
      id: Date.now().toString(),
      duration: selectedDuration,
      expiresAt: Date.now() + selectedDuration * 1000,
    };
    setActiveShares([newShare]);
  };

  const pauseSharing = () => {
    if (watchIdRef.current !== null && watchIdRef.current !== undefined) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const resumeSharing = () => {
    startSharing();
  };

  const stopSharing = () => {
    if (watchIdRef.current !== null && watchIdRef.current !== undefined) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setSharingLocation(false);
    setCurrentLocation(null);
    setActiveShares([]);
    setTimeRemaining(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDurationOption = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Main Map Area */}
      <div className="flex-1 relative">
        {/* Map Placeholder - In production, integrate Mapbox or Google Maps */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
          {/* Grid pattern to simulate map */}
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%">
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Center point */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-600">
              <MapPin size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Map View</p>
              <p className="text-sm">Integrate Mapbox or Google Maps SDK</p>
            </div>
          </div>

          {/* Other Users Location Markers */}
          {otherUsersLocations.map((user, index) => (
            <div
              key={user.userId}
              className="absolute"
              style={{
                left: `${30 + index * 20}%`,
                top: `${40 + index * 10}%`,
              }}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full animate-ping absolute"></div>
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold relative shadow-lg">
                  {user.username.charAt(0)}
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                    {user.username}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Your Location Marker */}
          {currentLocation && (
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="w-16 h-16 bg-green-500/20 rounded-full animate-ping absolute"></div>
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white font-bold relative shadow-lg border-4 border-white">
                  <Navigation size={24} />
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                    You
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 space-y-2">
          <button className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 shadow-lg">
            <Navigation size={20} />
          </button>
          <button className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 shadow-lg">
            <MapPin size={20} />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <MapPin className="text-green-500" size={24} />
            <span>Location Sharing</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Share your real-time location with contacts
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Current Status */}
          {sharingLocation ? (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-green-400 font-medium">Sharing Active</span>
                <div className="flex items-center space-x-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">Live</span>
                </div>
              </div>

              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-white mb-1">
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-sm text-gray-400">Time remaining</div>
              </div>

              {currentLocation && (
                <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                  <div className="text-xs text-gray-400 mb-2">Current Coordinates</div>
                  <div className="text-sm text-white font-mono">
                    {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Accuracy: ±{Math.round(currentLocation.accuracy)}m
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={timeRemaining > 0 ? pauseSharing : resumeSharing}
                  className="flex-1 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center space-x-2"
                >
                  {timeRemaining > 0 ? <Pause size={18} /> : <Play size={18} />}
                  <span>{timeRemaining > 0 ? 'Pause' : 'Resume'}</span>
                </button>
                <button
                  onClick={stopSharing}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <StopCircle size={18} />
                  <span>Stop</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-gray-300 text-sm mb-4">
                Share your live location with group members or specific contacts. 
                You can stop sharing at any time.
              </p>
            </div>
          )}

          {/* Duration Selection */}
          {!sharingLocation && (
            <div>
              <h3 className="text-white font-semibold mb-3">Sharing Duration</h3>
              <div className="space-y-2">
                {[15, 30, 60, 120, 480].map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => setSelectedDuration(minutes * 60)}
                    className={`w-full py-3 px-4 rounded-lg flex items-center justify-between transition-colors ${
                      selectedDuration === minutes * 60
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <span>{formatDurationOption(minutes)}</span>
                    {selectedDuration === minutes * 60 && (
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={startSharing}
                className="w-full mt-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2"
              >
                <Play size={20} />
                <span>Start Sharing</span>
              </button>
            </div>
          )}

          {/* Active Shares List */}
          {activeShares.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-3">Active Shares</h3>
              <div className="space-y-2">
                {activeShares.map((share) => (
                  <div
                    key={share.id}
                    className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-white text-sm font-medium">Your Location</div>
                      <div className="text-gray-400 text-xs">
                        Expires in {formatTime(timeRemaining)}
                      </div>
                    </div>
                    <button className="text-red-400 hover:text-red-300">
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* People Sharing With You */}
          <div>
            <h3 className="text-white font-semibold mb-3">
              People Sharing Location ({otherUsersLocations.length})
            </h3>
            <div className="space-y-2">
              {otherUsersLocations.map((user) => (
                <div
                  key={user.userId}
                  className="bg-gray-700/50 rounded-lg p-3 flex items-center space-x-3"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {user.username.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium">{user.username}</div>
                    <div className="text-gray-400 text-xs">
                      Updated {Math.round((Date.now() - user.timestamp) / 1000)}s ago
                    </div>
                  </div>
                  <Navigation size={16} className="text-blue-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
