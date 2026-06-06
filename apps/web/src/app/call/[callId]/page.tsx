'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Users, MessageSquare } from 'lucide-react';

interface CallParticipant {
  id: string;
  username: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

export default function CallPage({ params }: { params: { callId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callType = searchParams.get('type') || 'video';
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(callType === 'video');
  const [screenSharing, setScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [showChat, setShowChat] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callStartTime = useRef<number>(Date.now());

  useEffect(() => {
    initializeCall();
    
    // Call duration timer
    const timer = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
    }, 1000);

    return () => {
      clearInterval(timer);
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const initializeCall = async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true,
      });
      
      setLocalStream(stream);
      
      // Simulate participant list (in production, get from WebSocket)
      setParticipants([
        { id: 'me', username: 'You', videoEnabled: callType === 'video', audioEnabled: true },
        { id: params.callId, username: 'Contact', videoEnabled: true, audioEnabled: true },
      ]);
      
      // Initialize WebRTC peer connection
      initializePeerConnection(stream);
      
    } catch (error) {
      console.error('Failed to initialize call:', error);
      alert('Unable to access camera/microphone. Please check permissions.');
    }
  };

  const initializePeerConnection = (stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add TURN servers in production
      ],
    });

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to remote peer via signaling server
        console.log('ICE candidate:', event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
    };

    // Add local tracks to peer connection
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    peerConnectionRef.current = pc;

    // In production: Create offer, send via signaling server, wait for answer
    createOffer(pc);
  };

  const createOffer = async (pc: RTCPeerConnection) => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Send offer to signaling server
      // Signaling server forwards to remote peer
      // Remote peer sends answer back
      // await pc.setRemoteDescription(answer);
      
      console.log('Offer created and sent');
    } catch (error) {
      console.error('Failed to create offer:', error);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        
        if (peerConnectionRef.current && localStream) {
          const sender = peerConnectionRef.current
            .getSenders()
            .find(s => s.track?.kind === 'video');
          
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        setScreenSharing(true);
      } catch (error) {
        console.error('Failed to share screen:', error);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current
          .getSenders()
          .find(s => s.track?.kind === 'video');
        
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      }
    }
    
    setScreenSharing(false);
  };

  const endCall = () => {
    cleanup();
    router.push('/chat/' + params.callId);
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Call Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-white">
            <h1 className="text-xl font-bold">Call with Contact</h1>
            <p className="text-sm text-green-400">{formatDuration(callDuration)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-gray-400">
            <Users size={20} />
            <span>{participants.length} participants</span>
          </div>
          
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-lg transition-colors ${
              showChat ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare size={20} />
          </button>
        </div>
      </header>

      {/* Video Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Remote Video (Main) */}
        <div className="flex-1 bg-gray-800 flex items-center justify-center">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center text-gray-400">
              <div className="animate-pulse mb-4">
                <Video size={64} className="mx-auto" />
              </div>
              <p>Waiting for remote video...</p>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-700 rounded-lg overflow-hidden shadow-lg border-2 border-gray-600">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
            You
          </div>
        </div>

        {/* In-Call Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold">Call Chat</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <p className="text-gray-400 text-sm text-center">
                Messages sent here are visible to all call participants
              </p>
            </div>
            <div className="p-4 border-t border-gray-700">
              <input
                type="text"
                placeholder="Type a message..."
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
        <div className="flex items-center justify-center space-x-4">
          {/* Mute/Unmute Audio */}
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-colors ${
              audioEnabled
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
            title={audioEnabled ? 'Mute' : 'Unmute'}
          >
            {audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
          </button>

          {/* Toggle Video */}
          {callType === 'video' && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-colors ${
                videoEnabled
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
              title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
          )}

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-colors ${
              screenSharing
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
            title={screenSharing ? 'Stop sharing' : 'Share screen'}
          >
            <Monitor size={24} />
          </button>

          {/* End Call */}
          <button
            onClick={endCall}
            className="p-4 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            title="End call"
          >
            <PhoneOff size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}
