// ==============================================
// Patient Records View Component
// Allows Doctors to search, browse, select, and view full patient records
// ==============================================

import { useState, useEffect } from 'react';
import { getVillagers, getVillager } from '../services/api';
import PatientHistory from './PatientHistory';

export default function PatientRecordsView({ kioskId, villageId, selectedPatient, onSelectPatient, onCallPatient }) {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [fullPatientDetail, setFullPatientDetail] = useState(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  useEffect(() => {
    loadPatients();
  }, [villageId]);

  useEffect(() => {
    if (selectedPatient?.id) {
      fetchPatientDetail(selectedPatient.id);
    } else {
      setFullPatientDetail(null);
    }
  }, [selectedPatient?.id]);

  async function loadPatients() {
    setLoading(true);
    try {
      const data = await getVillagers(villageId);
      setPatients(data || []);
    } catch (err) {
      console.error('Failed to load patient records:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPatientDetail(patientId) {
    setFetchingDetail(true);
    try {
      const detail = await getVillager(patientId);
      setFullPatientDetail(detail);
    } catch (err) {
      console.error('Failed to fetch full patient detail:', err);
    } finally {
      setFetchingDetail(false);
    }
  }

  function handlePickPatient(patientId) {
    const p = patients.find((item) => item.id === patientId);
    if (p) {
      if (onSelectPatient) onSelectPatient(p);
      fetchPatientDetail(patientId);
    }
  }

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.phone?.includes(q) ||
      p.gender?.toLowerCase().includes(q) ||
      p.address?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-fade-in">
      {/* Top Search & Filter Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <input
              type="text"
              className="input"
              placeholder="🔍 Search patient by Name, Phone, or Gender..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: 14 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select Patient:</span>
            <select
              className="input"
              style={{ minWidth: 200, padding: '8px 12px', fontSize: '0.85rem' }}
              value={selectedPatient?.id || ''}
              onChange={(e) => {
                if (e.target.value) {
                  handlePickPatient(e.target.value);
                } else {
                  if (onSelectPatient) onSelectPatient(null);
                  setFullPatientDetail(null);
                }
              }}
            >
              <option value="">-- Browse Patient Directory ({patients.length}) --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.phone ? `(${p.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* If a patient is selected, display their full record history */}
      {selectedPatient || fullPatientDetail ? (
        fetchingDetail ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading patient record...</p>
          </div>
        ) : (
          <PatientHistory
            patient={fullPatientDetail || selectedPatient}
            allPatients={patients}
            onSelectPatient={handlePickPatient}
            onBack={() => {
              if (onSelectPatient) onSelectPatient(null);
              setFullPatientDetail(null);
            }}
          />
        )
      ) : (
        /* Directory Grid View when no patient is selected yet */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Registered Patient Directory ({filteredPatients.length})
            </h3>
            {searchQuery && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            )}
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Fetching patient database...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👤</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No Patients Found</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                {searchQuery ? `No patient matches "${searchQuery}"` : 'No registered patients found in system.'}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}>
              {filteredPatients.map((p) => (
                <div
                  key={p.id}
                  className="card"
                  style={{
                    padding: 18,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => handlePickPatient(p.id)}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 46,
                        height: 46,
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
                        {p.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>{p.name}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {p.gender && <span style={{ textTransform: 'capitalize' }}>{p.gender} • </span>}
                          {p.phone ? `📞 ${p.phone}` : 'No phone'}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                      <div>📍 {p.address || p.village?.name || 'Local Jurisdiction'}</div>
                      {p.emergencyContactName && (
                        <div style={{ marginTop: 2 }}>
                          🚨 Emergency: {p.emergencyContactName} ({p.emergencyContactPhone || 'N/A'})
                        </div>
                      )}
                    </div>

                    {/* Medical conditions summary */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                      {p.medicalHistory?.allergies?.length > 0 && (
                        <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                          Allergies: {p.medicalHistory.allergies.join(', ')}
                        </span>
                      )}
                      {p.medicalHistory?.conditions?.length > 0 && (
                        <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                          Conditions: {p.medicalHistory.conditions.join(', ')}
                        </span>
                      )}
                      {(!p.medicalHistory?.allergies?.length && !p.medicalHistory?.conditions?.length) && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No medical alerts</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePickPatient(p.id);
                      }}
                    >
                      📋 Record
                    </button>
                    {onCallPatient && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1.2, fontWeight: 700 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCallPatient(p);
                        }}
                      >
                        📞 Call Patient
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
