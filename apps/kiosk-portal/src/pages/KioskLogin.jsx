// ==============================================
// Kiosk Login Page — Machine Authentication
// ==============================================

import { useState } from 'react';
import { loginKiosk } from '../services/api';

export default function KioskLogin({ onLogin }) {
  const [machineCode, setMachineCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginKiosk(machineCode.trim());
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at center, rgba(0, 212, 170, 0.05) 0%, var(--bg-primary) 70%)',
    }}>
      <div className="card animate-slide-up" style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
        {/* Logo/Icon */}
        <div style={{
          width: 80,
          height: 80,
          margin: '0 auto 24px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          boxShadow: 'var(--accent-glow)',
        }}>
          🏥
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          marginBottom: 8,
          background: 'var(--accent-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          HealthKiosk AI
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '0.95rem' }}>
          AI-Powered Rural Healthcare System
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              textAlign: 'left',
              marginBottom: 8,
              fontSize: '0.85rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}>
              Machine Code
            </label>
            <input
              id="machine-code-input"
              className="input"
              type="text"
              placeholder="e.g., KIOSK-RAMPUR-001"
              value={machineCode}
              onChange={(e) => setMachineCode(e.target.value)}
              style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: '0.05em' }}
              autoFocus
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              marginBottom: 16,
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}>
              {error}
            </div>
          )}

          <button
            id="kiosk-login-btn"
            className="btn btn-primary btn-lg"
            type="submit"
            disabled={!machineCode.trim() || loading}
            style={{ width: '100%' }}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Connecting...</>
            ) : (
              '🔐 Activate KIOSK'
            )}
          </button>
        </form>

        <p style={{
          marginTop: 24,
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}>
          Enter the machine code displayed on this kiosk unit.<br />
          Contact support if you don't have a code.
        </p>
      </div>
    </div>
  );
}
