// ==============================================
// Waiting Room — Queue display with priority
// ==============================================

import { useState, useEffect } from 'react';
import { getQueue } from '../services/api';
import { getSocket } from '../services/socket';

export default function WaitingRoom({ consultation, kioskData, onDoctorReady }) {
  const [queue, setQueue] = useState([]);
  const [myPosition, setMyPosition] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 10000);

    const socket = getSocket();
    if (socket) {
      socket.on('queue-updated', () => loadQueue());
      socket.on('doctor-ready', (data) => {
        if (data.consultationId === consultation.id) {
          onDoctorReady();
        }
      });
    }

    return () => {
      clearInterval(interval);
      socket?.off('queue-updated');
      socket?.off('doctor-ready');
    };
  }, []);

  async function loadQueue() {
    try {
      const data = await getQueue(kioskData.id);
      setQueue(data);

      const pos = data.findIndex((q) => q.id === consultation.id);
      setMyPosition(pos >= 0 ? pos + 1 : null);
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  }

  const getPriorityBadge = (score) => {
    if (score >= 8) return { label: 'EMERGENCY', class: 'badge-danger' };
    if (score >= 6) return { label: 'HIGH', class: 'badge-warning' };
    if (score >= 4) return { label: 'MEDIUM', class: 'badge-info' };
    return { label: 'ROUTINE', class: 'badge-success' };
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="animate-slide-up" style={{ width: '100%', maxWidth: 600, textAlign: 'center' }}>
        {/* Position display */}
        <div style={{
          width: 120,
          height: 120,
          margin: '0 auto 24px',
          borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '3px solid var(--accent-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse-glow 2s infinite',
        }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {myPosition || '—'}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>IN QUEUE</span>
        </div>

        <h1 className="page-title" style={{ fontSize: '1.75rem', marginBottom: 8 }}>
          Please Wait
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
          A doctor will be with you shortly. You are number <strong>{myPosition || '...'}</strong> in the queue.
        </p>

        {/* Queue list */}
        <div style={{ textAlign: 'left' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current Queue
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {queue.map((item, idx) => {
              const isMe = item.id === consultation.id;
              const priority = getPriorityBadge(item.priorityScore);

              return (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderColor: isMe ? 'var(--accent-primary)' : 'var(--border)',
                    background: isMe ? 'rgba(0, 212, 170, 0.05)' : 'var(--bg-card)',
                  }}
                >
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: isMe ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: isMe ? '#0a0e1a' : 'var(--text-muted)',
                    flexShrink: 0,
                  }}>
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: isMe ? 600 : 400, fontSize: '0.95rem' }}>
                      {item.villager?.name || 'Unknown'} {isMe && '(You)'}
                    </span>
                  </div>
                  <span className={`badge ${priority.class}`}>{priority.label}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {item.waitTimeMinutes}m
                  </span>
                </div>
              );
            })}
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
