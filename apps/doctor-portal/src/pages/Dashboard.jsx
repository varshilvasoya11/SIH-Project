// ==============================================
// Doctor Dashboard — Queue, Patients, Stock
// ==============================================

import { useState, useEffect } from 'react';
import { getKiosks, getQueue, assignConsultation, completeConsultation, getVillager, getMedicines, getMedicineStock, dispenseMedicines, createConsultation } from '../services/api';
import { getSocket } from '../services/socket';
import PatientHistory from '../components/PatientHistory';
import DispensePanel from '../components/DispensePanel';
import StockView from '../components/StockView';
import DoctorVideoCall from '../components/DoctorVideoCall';
import PatientRecordsView from '../components/PatientRecordsView';

export default function Dashboard({ doctor, onLogout }) {
  const [tab, setTab] = useState('queue'); // queue | patient | stock
  const [kiosks, setKiosks] = useState([]);
  const [selectedKiosk, setSelectedKiosk] = useState(null);
  const [queue, setQueue] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDispense, setShowDispense] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);

  useEffect(() => {
    loadKiosks();
  }, []);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 4000);

    const socket = getSocket();
    socket?.on('queue-updated', loadQueue);

    return () => {
      clearInterval(interval);
      socket?.off('queue-updated');
    };
  }, [selectedKiosk]);

  async function loadKiosks() {
    try {
      const data = await getKiosks();
      setKiosks(data);
      if (data.length > 0) {
        // Default to All Kiosks or first kiosk
        setSelectedKiosk({ id: 'all', machineCode: 'ALL KIOSKS', village: { name: 'All Villages' } });
      }
    } catch (err) {
      console.error('Failed to load kiosks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadQueue() {
    try {
      const kioskIdParam = selectedKiosk?.id || 'all';
      const data = await getQueue(kioskIdParam);
      setQueue(data);
    } catch (err) {
      console.error('Queue load failed:', err);
    }
  }

  async function handleAssign(consultationId) {
    try {
      const result = await assignConsultation(consultationId);
      setActiveConsultation(result);
      setShowVideoCall(true);
      loadQueue();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleComplete() {
    if (!activeConsultation) return;
    try {
      await completeConsultation(activeConsultation.id, 'Consultation completed');
      setActiveConsultation(null);
      setShowDispense(false);
      setShowVideoCall(false);
      loadQueue();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleViewPatient(villagerId) {
    try {
      const data = await getVillager(villagerId);
      setSelectedPatient(data);
      setTab('patient');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleDirectCallPatient(patient) {
    if (!patient) return;
    try {
      const consultation = await createConsultation({
        villagerId: patient.id,
        kioskId: selectedKiosk?.id || 'all',
        aiSymptoms: { text: 'Direct Doctor Call from Patient Directory' },
      });

      const assigned = await assignConsultation(consultation.id);
      setActiveConsultation(assigned);
      setShowVideoCall(true);

      const socket = getSocket();
      socket?.emit('doctor-initiates-call', {
        patientId: patient.id,
        patientPhone: patient.phone,
        patientName: patient.name,
        doctorId: doctor.id,
        doctorName: doctor.name || 'Dr. Priya Sharma',
        consultationId: assigned.id,
      });
    } catch (err) {
      alert('Failed to call patient: ' + err.message);
    }
  }

  const getPriorityBadge = (score) => {
    if (score >= 8) return { label: 'EMERGENCY', cls: 'badge-danger' };
    if (score >= 6) return { label: 'HIGH', cls: 'badge-warning' };
    if (score >= 4) return { label: 'MEDIUM', cls: 'badge-info' };
    return { label: 'ROUTINE', cls: 'badge-success' };
  };

  const waitingQueue = queue.filter((q) => q.status === 'waiting' || q.status === 'triaged');
  const inProgress = queue.filter((q) => q.status === 'in_progress');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top navbar */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 24px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        gap: 16,
      }}>
        <h1 style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          background: 'var(--accent-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          HealthKiosk
        </h1>

        {/* Kiosk selector */}
        {kiosks.length > 0 && (
          <select
            className="input"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            value={selectedKiosk?.id || 'all'}
            onChange={(e) => {
              if (e.target.value === 'all') {
                setSelectedKiosk({ id: 'all', machineCode: 'ALL KIOSKS', village: { name: 'All Villages' } });
              } else {
                const k = kiosks.find((k) => k.id === e.target.value);
                setSelectedKiosk(k);
              }
            }}
          >
            <option value="all">🌐 All Kiosks & Villages</option>
            {kiosks.map((k) => (
              <option key={k.id} value={k.id}>
                📍 {k.machineCode} — {k.village?.name}
              </option>
            ))}
          </select>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Dr. {doctor.name}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside style={{
          width: 56,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 16,
          gap: 4,
        }}>
          {[
            { id: 'queue', icon: '📋', title: 'Queue' },
            { id: 'patient', icon: '👤', title: 'Patient' },
            { id: 'stock', icon: '💊', title: 'Stock' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.title}
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: tab === t.id ? 'var(--accent-gradient)' : 'transparent',
                cursor: 'pointer',
                fontSize: '1.1rem',
                transition: 'all 0.2s',
                opacity: tab === t.id ? 1 : 0.6,
              }}
            >
              {t.icon}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {tab === 'queue' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                  Patient Queue
                  <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                    ({waitingQueue.length} waiting)
                  </span>
                </h2>
              </div>

              {/* Active consultation */}
              {activeConsultation && (
                <div className="card" style={{
                  marginBottom: 20,
                  borderColor: 'var(--success)',
                  background: 'rgba(16, 185, 129, 0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                      🟢 Active Consultation — {activeConsultation.villager?.name}
                    </h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm" style={{ background: 'var(--accent-primary)', color: '#0a0e1a', fontWeight: 700 }} onClick={() => setShowVideoCall(true)}>
                        📹 Video Call
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => setShowDispense(true)}>
                        💊 Dispense
                      </button>
                      <button className="btn btn-sm" style={{ background: 'var(--info)', color: 'white' }} onClick={() => handleViewPatient(activeConsultation.villagerId)}>
                        📋 History
                      </button>
                      <button className="btn btn-success btn-sm" onClick={handleComplete}>
                        ✓ Complete
                      </button>
                    </div>
                  </div>
                  {activeConsultation.aiTriageResult && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      AI Triage: {activeConsultation.aiTriageResult.reasoning || 'N/A'}
                    </div>
                  )}
                </div>
              )}

              {/* Video Call Modal */}
              {showVideoCall && activeConsultation && selectedKiosk && (
                <DoctorVideoCall
                  consultation={activeConsultation}
                  kioskId={selectedKiosk.id}
                  onClose={() => setShowVideoCall(false)}
                  onComplete={() => {
                    setShowVideoCall(false);
                    setShowDispense(true);
                  }}
                />
              )}

              {/* Dispense panel modal */}
              {showDispense && activeConsultation && selectedKiosk && (
                <DispensePanel
                  consultation={activeConsultation}
                  kioskId={selectedKiosk.id}
                  onClose={() => setShowDispense(false)}
                  onDispensed={() => {
                    setShowDispense(false);
                  }}
                />
              )}

              {/* Queue list */}
              {waitingQueue.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>🏥</div>
                  <p style={{ color: 'var(--text-secondary)' }}>No patients in queue</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                    Patients will appear here when they check in at the kiosk
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {waitingQueue.map((item) => {
                    const priority = getPriorityBadge(item.priorityScore);
                    return (
                      <div key={item.id} className="card animate-fade-in" style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: item.priorityScore >= 8 ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: item.priorityScore >= 8 ? 'var(--danger)' : 'var(--text-secondary)',
                            flexShrink: 0,
                          }}>
                            {item.position || '#'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.villager?.name}</span>
                              <span className={`badge ${priority.cls}`}>{priority.label}</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                              {item.villager?.gender} • Waiting {item.waitTimeMinutes}m
                              {item.triage?.aiAnalysis?.possibleConditions && (
                                <> • AI: {item.triage.aiAnalysis.possibleConditions.join(', ')}</>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleViewPatient(item.villagerId)}
                            >
                              View
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleAssign(item.id)}
                              disabled={!!activeConsultation}
                            >
                              Start Call
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'patient' && (
            <PatientRecordsView
              kioskId={selectedKiosk?.id}
              villageId={selectedKiosk?.villageId}
              selectedPatient={selectedPatient}
              onSelectPatient={(p) => setSelectedPatient(p)}
              onCallPatient={handleDirectCallPatient}
            />
          )}

          {tab === 'stock' && selectedKiosk && (
            <StockView kioskId={selectedKiosk.id} kioskName={selectedKiosk.machineCode} />
          )}
        </main>
      </div>
    </div>
  );
}
