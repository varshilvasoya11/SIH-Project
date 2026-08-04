// ==============================================
// Patient Web Portal — Login & Sign-Up Page
// ==============================================

import { useState } from 'react';
import { loginPatient, registerPatient } from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [phone, setPhone] = useState('9876543210');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim() || !phone.trim()) {
          throw new Error('Name and phone number are required.');
        }
        const data = await registerPatient({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
        });
        localStorage.setItem('patient_token', data.token);
        localStorage.setItem('patient_user', JSON.stringify(data.patient));
        onLoginSuccess(data.patient);
      } else {
        if (!phone.trim()) {
          throw new Error('Phone number is required.');
        }
        const data = await loginPatient(phone.trim());
        localStorage.setItem('patient_token', data.token);
        localStorage.setItem('patient_user', JSON.stringify(data.patient));
        onLoginSuccess(data.patient);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(circle at top, #10192d 0%, #090d16 100%)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 440, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏥</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            HealthKiosk AI
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
            Patient Web Portal & Medicine Ordering
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          padding: 4,
          marginBottom: 24,
        }}>
          <button
            onClick={() => { setIsSignUp(false); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: !isSignUp ? 'var(--bg-card)' : 'transparent',
              color: !isSignUp ? 'white' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            🔑 Log In
          </button>
          <button
            onClick={() => { setIsSignUp(true); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: isSignUp ? 'var(--bg-card)' : 'transparent',
              color: isSignUp ? 'white' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            ✍️ Sign Up
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Full Name
              </label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Phone Number
            </label>
            <input
              className="input"
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Village Address / Landmark
              </label>
              <input
                className="input"
                type="text"
                placeholder="e.g. House #14, Rampur Village"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px 0', marginTop: 8, fontWeight: 700 }}
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Profile & Enter' : 'Log In with Phone'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Quick Demo Login: Phone <code style={{ color: '#38bdf8' }}>9876543210</code> (Ramesh Kumar)
        </div>
      </div>
    </div>
  );
}
