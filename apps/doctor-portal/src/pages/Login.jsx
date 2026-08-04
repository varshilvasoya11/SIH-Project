// ==============================================
// Doctor Login & Self-Service Sign Up Page
// ==============================================

import { useState } from 'react';
import { loginDoctor, registerDoctor } from '../services/api';

export default function Login({ onLogin }) {
  const [activeTab, setActiveTab] = useState('login'); // login | signup

  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSpecialization, setRegSpecialization] = useState('General Medicine');
  const [regLicenseNo, setRegLicenseNo] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regVillages, setRegVillages] = useState('Rampur, Anandpur');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginDoctor(email, password);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();
    setError('');
    if (!regName || !regEmail || !regPassword) {
      setError('Name, email, and password are required.');
      return;
    }
    setLoading(true);
    try {
      const data = await registerDoctor({
        name: regName,
        email: regEmail,
        password: regPassword,
        specialization: regSpecialization,
        licenseNo: regLicenseNo,
        phone: regPhone,
        assignedVillages: regVillages,
      });
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
      padding: '24px 16px',
      background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.05) 0%, var(--bg-primary) 70%)',
    }}>
      <div className="card animate-slide-up" style={{ width: '100%', maxWidth: 460, textAlign: 'center', padding: '28px 24px' }}>
        <div style={{
          width: 68,
          height: 68,
          margin: '0 auto 16px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem',
          boxShadow: 'var(--accent-glow)',
        }}>
          👨‍⚕️
        </div>

        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          background: 'var(--accent-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 4,
        }}>
          Doctor Portal
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: '0.85rem' }}>
          HealthKiosk AI — Remote Consultation System
        </p>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          padding: 4,
          marginBottom: 20,
          border: '1px solid var(--border)',
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'login' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'login' ? '#0a0e1a' : 'var(--text-secondary)',
              fontWeight: activeTab === 'login' ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.2s',
            }}
          >
            🔐 Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('signup'); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'signup' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'signup' ? '#0a0e1a' : 'var(--text-secondary)',
              fontWeight: activeTab === 'signup' ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.2s',
            }}
          >
            📝 Doctor Sign Up
          </button>
        </div>

        {/* Login Form */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: 14, textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <input
                id="doctor-email"
                className="input"
                type="email"
                placeholder="doctor@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div style={{ marginBottom: 20, textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Password
              </label>
              <input
                id="doctor-password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--danger)',
                fontSize: '0.8rem',
                marginBottom: 14,
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}>
                {error}
              </div>
            )}

            <button
              id="doctor-login-btn"
              className="btn btn-primary"
              type="submit"
              disabled={!email || !password || loading}
              style={{ width: '100%', padding: '12px', fontWeight: 700 }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* Doctor Self-Service Sign Up Form */
          <form onSubmit={handleSignupSubmit} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Full Name *
              </label>
              <input
                className="input"
                type="text"
                placeholder="Dr. Full Name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Email Address *
                </label>
                <input
                  className="input"
                  type="email"
                  placeholder="doctor@hospital.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Password *
                </label>
                <input
                  className="input"
                  type="password"
                  placeholder="Password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Specialization
                </label>
                <select
                  className="input"
                  value={regSpecialization}
                  onChange={(e) => setRegSpecialization(e.target.value)}
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="General Medicine">General Medicine</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Obstetrics & Gynecology">Obstetrics & Gynecology</option>
                  <option value="Emergency Care">Emergency Care</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Registration / MCI License No.
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="MCI-12345"
                  value={regLicenseNo}
                  onChange={(e) => setRegLicenseNo(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Contact Phone
                </label>
                <input
                  className="input"
                  type="tel"
                  placeholder="10-digit phone"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Assigned Kiosks / Villages
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="Rampur, Anandpur"
                  value={regVillages}
                  onChange={(e) => setRegVillages(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--danger)',
                fontSize: '0.8rem',
                marginBottom: 14,
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}>
                {error}
              </div>
            )}

            <button
              id="doctor-signup-btn"
              className="btn btn-primary"
              type="submit"
              disabled={!regName || !regEmail || !regPassword || loading}
              style={{ width: '100%', padding: '12px', fontWeight: 700 }}
            >
              {loading ? 'Creating Account...' : '✓ Complete Doctor Sign Up'}
            </button>
          </form>
        )}

        <p style={{ marginTop: 20, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Demo Credentials: priya@hospital.com / doctor123
        </p>
      </div>
    </div>
  );
}
