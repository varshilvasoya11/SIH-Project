// ==============================================
// Patient History & Full Medical Record Component
// ==============================================

import { useState } from 'react';

export default function PatientHistory({ patient, allPatients = [], onSelectPatient, onBack, onCallPatient }) {
  const [activeTab, setActiveTab] = useState('consultations'); // consultations | deliveries | bloodtests

  if (!patient) return null;

  return (
    <div className="animate-fade-in">
      {/* Top Header & Patient Switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <button className="btn btn-secondary btn-sm" onClick={onBack}>
              ← All Patients
            </button>
          )}
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
            Patient Medical Record
          </h2>
        </div>

        {/* Quick Actions & Patient Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onCallPatient && (
            <button
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 700, padding: '8px 16px' }}
              onClick={() => onCallPatient(patient)}
            >
              📞 Direct Video Call Patient
            </button>
          )}

          {allPatients.length > 0 && onSelectPatient && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Switch Patient:</span>
              <select
                className="input"
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
                value={patient.id || ''}
                onChange={(e) => {
                  const selected = allPatients.find((p) => p.id === e.target.value);
                  if (selected) onSelectPatient(selected.id);
                }}
              >
                {allPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.phone || 'No phone'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Patient Demographics & Profile Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 800,
            color: '#0a0e1a',
            boxShadow: 'var(--accent-glow)',
            flexShrink: 0,
          }}>
            {patient.name?.charAt(0)?.toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{patient.name}</h3>
              {patient.gender && (
                <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                  {patient.gender}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date of Birth</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  {patient.dob ? new Date(patient.dob).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact Number</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  {patient.phone ? `📞 ${patient.phone}` : 'N/A'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emergency Contact</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  {patient.emergencyContactName ? (
                    `🚨 ${patient.emergencyContactName} (${patient.emergencyContactPhone || 'N/A'})`
                  ) : (
                    'Not specified'
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Home Address</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  {patient.address || patient.village?.name || 'Village Kiosk Jurisdiction'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Medical History & Allergies */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Medical History & Known Allergies
          </h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {patient.medicalHistory?.allergies?.length > 0 ? (
              <span className="badge badge-danger">
                ⚠️ Allergies: {patient.medicalHistory.allergies.join(', ')}
              </span>
            ) : null}

            {patient.medicalHistory?.conditions?.length > 0 ? (
              <span className="badge badge-warning">
                🏥 Conditions: {patient.medicalHistory.conditions.join(', ')}
              </span>
            ) : null}

            {!patient.medicalHistory?.allergies?.length && !patient.medicalHistory?.conditions?.length && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                ✓ No recorded chronic conditions or drug allergies.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn btn-sm ${activeTab === 'consultations' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('consultations')}
        >
          📋 Consultations ({patient.consultations?.length || 0})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'deliveries' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('deliveries')}
        >
          🚚 Deliveries ({patient.deliveries?.length || 0})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'bloodtests' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('bloodtests')}
        >
          🩸 Blood Tests ({patient.bloodTests?.length || 0})
        </button>
      </div>

      {/* Tab Content: Consultations */}
      {activeTab === 'consultations' && (
        <>
          {(!patient.consultations || patient.consultations.length === 0) ? (
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <p style={{ color: 'var(--text-muted)' }}>No previous consultation records for this patient.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {patient.consultations.map((c) => (
                <div key={c.id} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                      Consultation Date: {new Date(c.createdAt).toLocaleDateString()} at {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`badge ${c.status === 'completed' ? 'badge-success' : 'badge-info'}`}>
                      {c.status}
                    </span>
                  </div>

                  {c.doctor && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginBottom: 4, fontWeight: 600 }}>
                      Attending Physician: Dr. {c.doctor.name} ({c.doctor.specialization || 'General'})
                    </div>
                  )}

                  {c.doctorNotes && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 'var(--radius-sm)', margin: '8px 0' }}>
                      <strong style={{ color: 'var(--text-secondary)' }}>Doctor Notes: </strong>
                      {c.doctorNotes}
                    </div>
                  )}

                  {c.triage?.aiAnalysis?.reasoning && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      AI Triage Summary: {c.triage.aiAnalysis.reasoning}
                    </div>
                  )}

                  {c.prescriptions?.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Prescribed Medicines:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                        {c.prescriptions.map((p) => (
                          <span key={p.id} style={{
                            padding: '4px 12px',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(0, 212, 170, 0.12)',
                            color: '#00d4aa',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            border: '1px solid rgba(0, 212, 170, 0.3)',
                          }}>
                            💊 {p.medicine?.name} × {p.quantity} ({p.dosage || 'Standard dosage'})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab Content: Deliveries */}
      {activeTab === 'deliveries' && (
        <>
          {(!patient.deliveries || patient.deliveries.length === 0) ? (
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <p style={{ color: 'var(--text-muted)' }}>No medicine delivery records found for this patient.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {patient.deliveries.map((d) => (
                <div key={d.id} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                      🚚 Order #{d.id.slice(0, 8)} — Scheduled: {d.deliveryDate ? new Date(d.deliveryDate).toLocaleDateString() : 'Pending'}
                    </span>
                    <span className={`badge ${d.status === 'Delivered' ? 'badge-success' : d.status === 'Dispatched' ? 'badge-warning' : 'badge-info'}`}>
                      {d.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    📍 <strong>Delivery Address:</strong> {d.deliveryAddress || 'Standard Address'}
                  </div>

                  {d.courierName && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Courier Agent: {d.courierName} ({d.courierContact || 'N/A'})
                    </div>
                  )}

                  {d.specialInstructions && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: 4 }}>
                      ⚠️ Instructions: {d.specialInstructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab Content: Blood Tests */}
      {activeTab === 'bloodtests' && (
        <>
          {(!patient.bloodTests || patient.bloodTests.length === 0) ? (
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <p style={{ color: 'var(--text-muted)' }}>No diagnostic blood test records found for this patient.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {patient.bloodTests.map((b) => (
                <div key={b.id} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>
                        🩸 {b.testType || 'Blood Diagnostic Test'}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Taken on: {new Date(b.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`badge ${b.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
