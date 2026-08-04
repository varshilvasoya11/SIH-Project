// ==============================================
// Patient Video Call Component — Patient Web Portal
// Real-Time Live Face-to-Face Consultation
// ==============================================

import { useState, useRef, useEffect } from 'react';
import { getSocket } from '../services/socket';
import { getCallMessages, sendCallMessage } from '../services/api';

export default function PatientVideoCall({ patient, consultation, onCallEnd }) {
  const [callStatus, setCallStatus] = useState('connecting'); // connecting | active | ended
  const [isMuted, setIsMuted] = useState(false);
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
  const streamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const timerRef = useRef(null);
  const frameBroadcastIntervalRef = useRef(null);

  const doctorName = consultation?.doctor?.name || 'Dr. Priya Sharma';

  useEffect(() => {
    startCallSession();

    return () => {
      cleanupCallSession();
    };
  }, []);

  // Ensure stream is bound to both local and fallback video elements
  useEffect(() => {
    if (streamRef.current) {
      if (localVideoRef.current && localVideoRef.current.srcObject !== streamRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }
      if (fallbackVideoRef.current && fallbackVideoRef.current.srcObject !== streamRef.current) {
        fallbackVideoRef.current.srcObject = streamRef.current;
      }
    }
  });

  async function startCallSession() {
    try {
      const socket = getSocket();

      // 1. Get Patient's local camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: { ideal: 30 } },
        audio: true,
      }).catch((err) => {
        console.warn('Local camera access warning:', err);
        return null;
      });

      if (stream) {
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        if (fallbackVideoRef.current) {
          fallbackVideoRef.current.srcObject = stream;
        }

        startFrameBroadcasting(socket);
      }

      // 2. WebRTC Peer Connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setHasWebRTCStream(true);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            to: `doctor-${consultation?.doctorId || 'active'}`,
            candidate: event.candidate,
          });
        }
      };

      // 3. Socket listeners
      if (socket) {
        if (consultation?.id) {
          socket.emit('join-consultation', { consultationId: consultation.id });
        }

        socket.emit('request-offer', { to: `doctor-${consultation?.doctorId}` });

        socket.on('call-offer', async (data) => {
          if (peerConnectionRef.current && data.offer) {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(data.offer)
            );
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);

            socket.emit('call-answer', {
              to: data.from,
              answer: answer,
            });
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
              console.error('Error adding ICE candidate:', e);
            }
          }
        });

        socket.on('video-stream-frame', (data) => {
          if (data.sender === 'doctor' && data.frame) {
            setRemoteFrame(data.frame);
          }
        });

        socket.on('new-call-message', (msg) => {
          if (msg.consultationId && consultation?.id && msg.consultationId !== consultation.id) {
            return;
          }
          setChatMessages((prev) => {
            if (prev.some((m) => (m.id && msg.id && m.id === msg.id) || (m.createdAt === msg.createdAt && m.messageText === msg.messageText))) return prev;
            return [...prev, msg];
          });
        });

        socket.on('call-ended', () => {
          handleEndCall();
        });
      }

      // Fetch initial chat messages
      if (consultation?.id) {
        getCallMessages(consultation.id)
          .then((msgs) => setChatMessages(msgs))
          .catch((err) => console.warn('Could not fetch call messages:', err));
      }

      setTimeout(() => {
        setCallStatus('active');
        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }, 1000);

    } catch (err) {
      console.error('Failed to start call session:', err);
      setCallStatus('active');
    }
  }

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
          to: `doctor-${consultation?.doctorId || 'active'}`,
          sender: 'patient',
          frame: dataUrl,
        });
      }
    }, 60);
  }

  function cleanupCallSession() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (frameBroadcastIntervalRef.current) clearInterval(frameBroadcastIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    const socket = getSocket();
    socket?.off('call-offer');
    socket?.off('ice-candidate');
    socket?.off('video-stream-frame');
    socket?.off('call-ended');
  }

  function toggleMute() {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }

  function handleEndCall() {
    cleanupCallSession();
    setCallStatus('ended');
    const socket = getSocket();
    socket?.emit('call-end', { to: `doctor-${consultation?.doctorId}` });
    setTimeout(() => onCallEnd(), 1500);
  }

  async function handleSendChatMessage(e) {
    e?.preventDefault();
    if (!inputMessage.trim() || !consultation?.id) return;
    const txt = inputMessage.trim();
    setInputMessage('');
    try {
      await sendCallMessage(consultation.id, {
        sender: 'patient',
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
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

      {/* Main Container: Video + In-Call Chat Panel */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Video Stream Container */}
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          overflow: 'hidden',
        }}>
          {callStatus === 'connecting' ? (
            <div style={{ textAlign: 'center', color: 'white', zIndex: 10 }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto 20px', width: 50, height: 50, borderWidth: 4 }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Connecting Video Consultation...</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Establishing connection with {doctorName}</p>
            </div>
          ) : callStatus === 'ended' ? (
            <div style={{ textAlign: 'center', color: 'white', zIndex: 10 }}>
              <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Consultation Complete</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
                Thank you for consulting with {doctorName}.
              </p>
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

              {/* Socket Live Video Frame Feed */}
              {!hasWebRTCStream && remoteFrame && (
                <img
                  src={remoteFrame}
                  alt="Live Doctor Video Feed"
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

              {/* Top-Right Picture-in-Picture Thumbnail (Patient Camera) */}
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
                  }}
                />
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
                  Patient Camera
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
                  No messages yet. Prescriptions added by the doctor will appear here automatically.
                </div>
              ) : (
                chatMessages.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: m.sender === 'patient' ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-card)',
                      border: m.sender === 'patient' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid var(--border)',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)',
                      alignSelf: m.sender === 'patient' ? 'flex-end' : 'flex-start',
                      maxWidth: '90%',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2, fontWeight: 700 }}>
                      {m.sender === 'patient' ? '👤 You (Patient)' : '👨‍⚕️ Doctor'}
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
                placeholder="Type a message to doctor..."
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

      {callStatus === 'active' && (
        <div style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 20,
          background: 'rgba(10, 14, 26, 0.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border)',
          zIndex: 40,
        }}>
          <div style={{ marginRight: 'auto', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
            ⏱️ Call Duration: <span style={{ color: 'white', fontWeight: 700 }}>{formatTime(callDuration)}</span>
          </div>

          <button
            onClick={toggleMute}
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              border: 'none',
              background: isMuted ? 'var(--danger)' : 'var(--bg-card)',
              color: 'white',
              fontSize: '1.3rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-md)',
            }}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>

          <button
            onClick={handleEndCall}
            style={{
              height: 52,
              padding: '0 32px',
              borderRadius: 26,
              border: 'none',
              background: 'var(--danger)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 0 25px rgba(239, 68, 68, 0.4)',
            }}
          >
            <span>📞</span> End Consultation
          </button>
        </div>
      )}
    </div>
  );
}
