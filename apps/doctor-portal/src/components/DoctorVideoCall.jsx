// ==============================================
// Doctor Video Call Component — Doctor Portal
// Real-Time Live Face-to-Face Video Calling
// ==============================================

import { useState, useRef, useEffect } from 'react';
import { getSocket } from '../services/socket';
import { getCallMessages, sendCallMessage } from '../services/api';

export default function DoctorVideoCall({ consultation, kioskId, onClose, onComplete }) {
  const [callStatus, setCallStatus] = useState('connecting'); // connecting | active | ended
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteFrame, setRemoteFrame] = useState(null);
  const [hasWebRTCStream, setHasWebRTCStream] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showChat, setShowChat] = useState(true);

  const localVideoRef = useRef(null);
  const fallbackVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const hiddenCanvasRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const timerRef = useRef(null);
  const frameBroadcastIntervalRef = useRef(null);

  const doctorName = consultation?.doctor?.name || 'Dr. Priya Sharma';
  const patientName = consultation?.villager?.name || 'Patient';

  useEffect(() => {
    initCall();

    return () => {
      cleanupCall();
    };
  }, []);

  // Ensure stream is bound to both local and fallback video elements whenever rendered
  useEffect(() => {
    if (localStreamRef.current) {
      if (localVideoRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      if (fallbackVideoRef.current && fallbackVideoRef.current.srcObject !== localStreamRef.current) {
        fallbackVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  });

  async function createAndSendOffer() {
    try {
      const pc = peerConnectionRef.current;
      const socket = getSocket();
      if (!pc || !socket) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call-offer', {
        to: `kiosk-${kioskId}`,
        offer: offer,
      });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  }

  async function initCall() {
    try {
      const socket = getSocket();

      // 1. Get Doctor's local camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: { ideal: 30 } },
        audio: true,
      }).catch((err) => {
        console.warn('Camera access warning:', err);
        return null;
      });

      if (stream) {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        if (fallbackVideoRef.current) {
          fallbackVideoRef.current.srcObject = stream;
        }

        // Start broadcasting live camera frames over Socket.io for real-time video feed
        startFrameBroadcasting(socket);
      }

      // 2. Initialize WebRTC Peer Connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      // Listen for remote track (Patient WebRTC video)
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setHasWebRTCStream(true);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            to: `kiosk-${kioskId}`,
            candidate: event.candidate,
          });
        }
      };

      // 3. Listen for Socket Events
      if (socket) {
        socket.on('request-offer', () => {
          createAndSendOffer();
        });

        socket.on('call-answer', async (data) => {
          if (peerConnectionRef.current && data.answer) {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(data.answer)
            );
            setCallStatus('active');
          }
        });

        socket.on('ice-candidate', async (data) => {
          if (peerConnectionRef.current && data.candidate) {
            try {
              await peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate(data.candidate)
              );
            } catch (e) {
              console.error('Error adding ice candidate', e);
            }
          }
        });

        // Receive real-time live video frames from Patient/Kiosk
        socket.on('video-stream-frame', (data) => {
          if (data.sender === 'kiosk' && data.frame) {
            setRemoteFrame(data.frame);
          }
        });

        socket.on('new-call-message', (msg) => {
          setChatMessages((prev) => {
            if (prev.some((m) => (m.id && msg.id && m.id === msg.id) || (m.createdAt === msg.createdAt && m.messageText === msg.messageText))) return prev;
            return [...prev, msg];
          });
        });

        socket.on('call-ended', () => {
          setCallStatus('ended');
        });
      }

      // Fetch initial chat messages
      if (consultation?.id) {
        getCallMessages(consultation.id)
          .then((msgs) => setChatMessages(msgs))
          .catch((err) => console.warn('Could not fetch call messages:', err));
      }

      // Send initial offer
      await createAndSendOffer();

      // Start call timer
      setTimeout(() => {
        setCallStatus('active');
        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }, 1000);

    } catch (err) {
      console.error('Call initialization failed:', err);
      setCallStatus('active');
    }
  }

  // Broadcast live webcam video frames over socket for real-time video rendering
  function startFrameBroadcasting(socket) {
    if (!hiddenCanvasRef.current) return;
    const canvas = hiddenCanvasRef.current;
    const ctx = canvas.getContext('2d');

    frameBroadcastIntervalRef.current = setInterval(() => {
      const video = localVideoRef.current || fallbackVideoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && socket) {
        canvas.width = 480;
        canvas.height = 360;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

        socket.emit('video-stream-frame', {
          to: `kiosk-${kioskId}`,
          sender: 'doctor',
          frame: dataUrl,
        });
      }
    }, 60); // ~16 fps for smooth real-time video
  }

  function cleanupCall() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (frameBroadcastIntervalRef.current) clearInterval(frameBroadcastIntervalRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    const socket = getSocket();
    socket?.off('request-offer');
    socket?.off('call-answer');
    socket?.off('ice-candidate');
    socket?.off('video-stream-frame');
    socket?.off('call-ended');
  }

  function toggleMute() {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }

  function toggleVideo() {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }

  function handleEndCall() {
    cleanupCall();
    setCallStatus('ended');
    const socket = getSocket();
    socket?.emit('call-end', { to: `kiosk-${kioskId}` });
    socket?.emit('call-end', { to: `patient-${consultation?.villagerId}` });
    socket?.emit('call-end', { to: 'all' });
    setTimeout(() => onClose(), 1500);
  }

  function handleCompleteCall() {
    const socket = getSocket();
    socket?.emit('call-end', { to: `kiosk-${kioskId}` });
    socket?.emit('call-end', { to: `patient-${consultation?.villagerId}` });
    socket?.emit('call-end', { to: 'all' });
    onComplete();
  }

  async function handleSendChatMessage(e) {
    e?.preventDefault();
    if (!inputMessage.trim() || !consultation?.id) return;
    const txt = inputMessage.trim();
    setInputMessage('');
    try {
      await sendCallMessage(consultation.id, {
        sender: 'doctor',
        messageText: txt,
      });
    } catch (err) {
      console.error('Failed to send in-call chat message:', err);
    }
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#040711',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Hidden canvas for capturing & broadcasting live camera frames */}
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

      {/* Main Container: Video + In-Call Chat Panel */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Video Stream Container */}
        <div style={{
          flex: 1,
          position: 'relative',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {callStatus === 'connecting' ? (
            <div style={{ textAlign: 'center', color: 'white', zIndex: 10 }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto 20px', width: 50, height: 50, borderWidth: 4 }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Connecting Video Consultation...</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Connecting to Patient {patientName}</p>
            </div>
          ) : callStatus === 'ended' ? (
            <div style={{ textAlign: 'center', color: 'white', zIndex: 10 }}>
              <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Consultation Finished</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Call ended with {patientName}</p>
            </div>
          ) : (
            <>
              {/* Direct WebRTC Video Stream Element */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: hasWebRTCStream ? 'block' : 'none',
                  position: 'absolute',
                  inset: 0,
                }}
              />

              {/* Real-time Socket Live Video Frame Feed */}
              {!hasWebRTCStream && remoteFrame && (
                <img
                  src={remoteFrame}
                  alt="Live Patient Video Stream"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    position: 'absolute',
                    inset: 0,
                    display: 'block',
                  }}
                />
              )}

              {/* Fallback Mirror Feed */}
              {!hasWebRTCStream && !remoteFrame && (
                <video
                  ref={fallbackVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    position: 'absolute',
                    inset: 0,
                    display: 'block',
                  }}
                />
              )}

              {/* Top-Right Thumbnail (Doctor Camera) */}
              <div style={{
                position: 'absolute',
                top: 24,
                right: showChat ? 340 : 24,
                width: 200,
                height: 130,
                borderRadius: 14,
                overflow: 'hidden',
                border: '2px solid #06b6d4',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                background: '#090d16',
                zIndex: 30,
                transition: 'right 0.3s ease',
              }}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    display: isVideoOff ? 'none' : 'block',
                  }}
                />
                {isVideoOff && (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#111827',
                    color: 'var(--text-muted)',
                  }}>
                    📷 Camera Off
                  </div>
                )}
                <div style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 6,
                  background: 'rgba(0, 0, 0, 0.8)',
                  padding: '3px 10px',
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  color: '#38bdf8',
                  fontWeight: 700,
                }}>
                  Doctor Camera
                </div>
              </div>
            </>
          )}
        </div>

        {/* Live In-Call Chat Sidebar Panel */}
        {showChat && (
          <div style={{
            width: 320,
            background: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 30,
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-teal)' }}>
                💬 Live Consultation Chat
              </div>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                onClick={() => setShowChat(false)}
              >
                ✖
              </button>
            </div>

            {/* Chat message stream */}
            <div style={{ flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {chatMessages.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: 30 }}>
                  No messages yet. Prescribed medicines will post here automatically.
                </div>
              ) : (
                chatMessages.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: m.sender === 'doctor' ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-card)',
                      border: m.sender === 'doctor' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid var(--border)',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)',
                      alignSelf: m.sender === 'doctor' ? 'flex-end' : 'flex-start',
                      maxWidth: '90%',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2, fontWeight: 700 }}>
                      {m.sender === 'doctor' ? '👨‍⚕️ You (Doctor)' : '👤 Patient'}
                    </div>
                    {m.messageText}
                  </div>
                ))
              )}
            </div>

            {/* Send chat message input */}
            <form onSubmit={handleSendChatMessage} style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="Type a message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'white',
                  fontSize: '0.8rem',
                }}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0 12px' }}>
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div style={{
        padding: '16px 24px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 40,
      }}>
        <div style={{ marginRight: 'auto', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
          ⏱️ Consultation Time: <span style={{ color: 'white', fontWeight: 700 }}>{formatTime(callDuration)}</span>
        </div>

        <button
          onClick={toggleMute}
          className="btn"
          style={{
            background: isMuted ? 'var(--danger)' : 'var(--bg-card)',
            color: 'white',
            borderRadius: 'var(--radius-full)',
            width: 52,
            height: 52,
            padding: 0,
            fontSize: '1.3rem',
          }}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🎤'}
        </button>

        <button
          onClick={toggleVideo}
          className="btn"
          style={{
            background: isVideoOff ? 'var(--danger)' : 'var(--bg-card)',
            color: 'white',
            borderRadius: 'var(--radius-full)',
            width: 52,
            height: 52,
            padding: 0,
            fontSize: '1.3rem',
          }}
          title={isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}
        >
          {isVideoOff ? '🚫' : '📹'}
        </button>

        <button
          onClick={handleCompleteCall}
          className="btn btn-primary"
          style={{ padding: '0 28px', height: 52, fontWeight: 700 }}
        >
          💊 Dispense & Complete
        </button>

        <button
          onClick={handleEndCall}
          className="btn btn-danger"
          style={{
            borderRadius: 'var(--radius-full)',
            width: 64,
            height: 52,
            fontSize: '1.4rem',
            padding: 0,
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
          }}
          title="End Consultation"
        >
          📞
        </button>
      </div>
    </div>
  );
}
