// ==============================================
// Face Scan Page — Identify Villager by Face
// ==============================================

import { useState, useRef, useEffect } from 'react';
import { getVillagers, registerVillager } from '../services/api';

export default function FaceScan({ kioskData, onIdentified }) {
  const [mode, setMode] = useState('scan'); // scan | register | select
  const [cameraActive, setCameraActive] = useState(false);
  const [villagers, setVillagers] = useState([]);
  const [scanning, setScanning] = useState(false);
  
  // Registration Form States
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newGender, setNewGender] = useState('male');
  const [newAddress, setNewAddress] = useState('');
  const [newEmergencyName, setNewEmergencyName] = useState('');
  const [newEmergencyPhone, setNewEmergencyPhone] = useState('');
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedAllergies, setSelectedAllergies] = useState([]);

  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const CONDITIONS_LIST = ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Thyroid'];
  const ALLERGIES_LIST = ['Penicillin', 'Sulfa Drugs', 'Aspirin', 'Dust / Pollen', 'Food'];

  useEffect(() => {
    loadVillagers();
    startCamera();
    return () => stopCamera();
  }, []);

  async function loadVillagers() {
    try {
      const data = await getVillagers(kioskData.village?.id || kioskData.villageId);
      setVillagers(data);
    } catch (err) {
      console.error('Failed to load villagers:', err);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied. Please allow camera permissions.');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  async function handleScanFace() {
    setScanning(true);
    await new Promise((r) => setTimeout(r, 2000));
    setScanning(false);
    setMode('select');
  }

  function toggleCondition(cond) {
    if (selectedConditions.includes(cond)) {
      setSelectedConditions(selectedConditions.filter((c) => c !== cond));
    } else {
      setSelectedConditions([...selectedConditions, cond]);
    }
  }

  function toggleAllergy(allg) {
    if (selectedAllergies.includes(allg)) {
      setSelectedAllergies(selectedAllergies.filter((a) => a !== allg));
    } else {
      setSelectedAllergies([...selectedAllergies, allg]);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!newName.trim()) return;

    setRegistering(true);
    try {
      const villager = await registerVillager({
        name: newName.trim(),
        villageId: kioskData.village?.id || kioskData.villageId,
        phone: newPhone || null,
        dob: newDob || null,
        gender: newGender || null,
        address: newAddress || null,
        emergencyContactName: newEmergencyName || null,
        emergencyContactPhone: newEmergencyPhone || null,
        medicalHistory: {
          conditions: selectedConditions,
          allergies: selectedAllergies,
        },
        faceEncoding: { demo: true, timestamp: Date.now() },
      });
      onIdentified(villager);
    } catch (err) {
      setError(err.message);
    } finally {
      setRegistering(false);
    }
  }

  function selectVillager(v) {
    onIdentified(v);
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px 16px' }}>
      <div className="animate-slide-up" style={{ width: '100%', maxWidth: mode === 'register' ? 620 : 700, textAlign: 'center' }}>
        <h1 className="page-title" style={{ fontSize: '2rem', marginBottom: 8 }}>
          {mode === 'scan' ? '👋 Welcome! Look at the Camera' : mode === 'register' ? '📝 Register New Patient' : '👤 Select Your Name'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          {mode === 'scan'
            ? 'Stand in front of the camera so we can identify you'
            : mode === 'register'
              ? 'First time? Please fill in your patient registration details'
              : 'Tap your name from the list below'}
        </p>

        {/* Camera Feed */}
        {mode === 'scan' && (
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <div style={{
              width: '100%',
              maxWidth: 480,
              margin: '0 auto',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              border: scanning ? '3px solid var(--accent-primary)' : '3px solid var(--border)',
              boxShadow: scanning ? 'var(--accent-glow)' : 'var(--shadow-lg)',
              transition: 'all 0.5s ease',
              position: 'relative',
              aspectRatio: '4/3',
              background: '#000',
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />

              {scanning && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    width: 200,
                    height: 200,
                    border: '3px solid var(--accent-primary)',
                    borderRadius: '50%',
                    animation: 'pulse-glow 1s infinite',
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: '20%',
                    right: '20%',
                    height: 2,
                    background: 'var(--accent-gradient)',
                    animation: 'scan-line 2s linear infinite',
                    boxShadow: '0 0 10px var(--accent-primary)',
                  }} />
                </div>
              )}

              {!cameraActive && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-card)',
                  color: 'var(--text-muted)',
                  fontSize: '1.1rem',
                }}>
                  📷 Starting camera...
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'scan' && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              id="scan-face-btn"
              className="btn btn-primary btn-lg"
              onClick={handleScanFace}
              disabled={scanning || !cameraActive}
              style={{ minWidth: 200 }}
            >
              {scanning ? (
                <><span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Scanning...</>
              ) : (
                '🔍 Scan My Face'
              )}
            </button>
            <button
              id="register-btn"
              className="btn btn-secondary btn-lg"
              onClick={() => setMode('register')}
              style={{ minWidth: 200 }}
            >
              📝 I'm New Here
            </button>
          </div>
        )}

        {/* Select from list */}
        {mode === 'select' && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            {villagers.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                <p style={{ color: 'var(--text-secondary)' }}>No registered villagers yet.</p>
                <button className="btn btn-primary" onClick={() => setMode('register')} style={{ marginTop: 16 }}>
                  📝 Register First Patient
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {villagers.map((v) => (
                  <button
                    key={v.id}
                    className="card"
                    onClick={() => selectVillager(v)}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '16px 20px',
                      textAlign: 'left',
                      border: '1px solid var(--border)',
                      width: '100%',
                    }}
                  >
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'var(--accent-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      color: '#0a0e1a',
                      flexShrink: 0,
                    }}>
                      {v.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{v.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {v.gender && `${v.gender} • `}
                        {v.phone || 'No phone'}
                      </div>
                    </div>
                  </button>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-secondary" onClick={() => setMode('scan')} style={{ flex: 1 }}>
                    ← Back to Scan
                  </button>
                  <button className="btn btn-primary" onClick={() => setMode('register')} style={{ flex: 1 }}>
                    + New Patient
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Patient Registration Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} style={{ width: '100%', margin: '0 auto' }}>
            <div className="card" style={{ textAlign: 'left', padding: '24px 28px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, color: 'var(--accent-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                📋 Patient Personal Information
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Full Name *
                  </label>
                  <input
                    id="register-name"
                    className="input"
                    type="text"
                    placeholder="Enter patient full name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Phone Number
                  </label>
                  <input
                    id="register-phone"
                    className="input"
                    type="tel"
                    placeholder="10-digit phone number"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Date of Birth
                  </label>
                  <input
                    className="input"
                    type="date"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Gender
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['male', 'female', 'other'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        className="btn"
                        onClick={() => setNewGender(g)}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          background: newGender === g ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                          color: newGender === g ? '#0a0e1a' : 'var(--text-secondary)',
                          fontWeight: newGender === g ? 700 : 400,
                          border: `1px solid ${newGender === g ? 'var(--accent-primary)' : 'var(--border)'}`,
                          textTransform: 'capitalize',
                          fontSize: '0.85rem',
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Residential Address / Location
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="House No / Street / Village Ward"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '20px 0 14px', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                🚨 Emergency Contact Details
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Emergency Contact Name
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Relative / Spouse / Guardian"
                    value={newEmergencyName}
                    onChange={(e) => setNewEmergencyName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Emergency Contact Phone
                  </label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="Emergency Phone Number"
                    value={newEmergencyPhone}
                    onChange={(e) => setNewEmergencyPhone(e.target.value)}
                  />
                </div>
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '20px 0 14px', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                🩺 Medical Conditions & Allergies (Optional)
              </h3>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Known Pre-existing Conditions:
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CONDITIONS_LIST.map((cond) => {
                    const isSelected = selectedConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleCondition(cond)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-secondary)',
                          color: isSelected ? 'var(--warning)' : 'var(--text-secondary)',
                          border: `1px solid ${isSelected ? 'var(--warning)' : 'var(--border)'}`,
                          transition: 'all 0.2s',
                        }}
                      >
                        {isSelected ? `✓ ${cond}` : `+ ${cond}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Known Drug & Food Allergies:
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ALLERGIES_LIST.map((allg) => {
                    const isSelected = selectedAllergies.includes(allg);
                    return (
                      <button
                        key={allg}
                        type="button"
                        onClick={() => toggleAllergy(allg)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-secondary)',
                          color: isSelected ? 'var(--danger)' : 'var(--text-secondary)',
                          border: `1px solid ${isSelected ? 'var(--danger)' : 'var(--border)'}`,
                          transition: 'all 0.2s',
                        }}
                      >
                        {isSelected ? `⚠️ ${allg}` : `+ ${allg}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  fontSize: '0.85rem',
                  marginBottom: 16,
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setMode('scan')} style={{ flex: 1 }}>
                  ← Cancel
                </button>
                <button
                  id="register-submit-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newName.trim() || registering}
                  style={{ flex: 2, fontWeight: 700 }}
                >
                  {registering ? 'Registering...' : '✓ Register & Continue'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
