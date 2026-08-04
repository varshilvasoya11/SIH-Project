// ==============================================
// Dispense Page — Medicine vending animation
// ==============================================

import { useState, useEffect } from 'react';

export default function Dispense({ consultation, onComplete }) {
  const [dispensing, setDispensing] = useState(true);
  const [currentMed, setCurrentMed] = useState(0);
  const [completed, setCompleted] = useState([]);

  // Demo medicines (in real app, comes from consultation.dispenseMedicines)
  const medicines = consultation?.dispenseMedicines || [
    { medicineId: '1', name: 'Paracetamol 500mg', quantity: 10, dosage: 'Twice daily after food' },
    { medicineId: '2', name: 'Cetirizine 10mg', quantity: 5, dosage: 'Once daily at night' },
  ];

  useEffect(() => {
    if (currentMed < medicines.length) {
      const timer = setTimeout(() => {
        setCompleted((prev) => [...prev, medicines[currentMed]]);
        setCurrentMed((prev) => prev + 1);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setDispensing(false);
    }
  }, [currentMed]);

  return (
    <div className="page-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
    }}>
      <div className="animate-slide-up" style={{ width: '100%', maxWidth: 500, textAlign: 'center' }}>
        {dispensing ? (
          <>
            <div style={{
              width: 100,
              height: 100,
              margin: '0 auto 24px',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--bg-card)',
              border: '3px solid var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              animation: 'pulse-glow 1s infinite',
            }}>
              💊
            </div>
            <h1 className="page-title" style={{ fontSize: '1.75rem', marginBottom: 8 }}>
              Dispensing Medicine
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
              Please wait while your medicine is being dispensed...
            </p>

            {/* Progress */}
            <div style={{
              width: '100%',
              height: 6,
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              marginBottom: 24,
            }}>
              <div style={{
                width: `${(currentMed / medicines.length) * 100}%`,
                height: '100%',
                background: 'var(--accent-gradient)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.5s ease',
              }} />
            </div>

            <p style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
              Dispensing: {medicines[currentMed]?.name || 'Complete'}
            </p>
          </>
        ) : (
          <>
            <div style={{
              width: 100,
              height: 100,
              margin: '0 auto 24px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '3px solid var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
            }}>
              ✅
            </div>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--success)',
              marginBottom: 8,
            }}>
              Medicine Dispensed!
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              Please collect your medicine from the tray below.
            </p>
          </>
        )}

        {/* Medicine list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', marginBottom: 24 }}>
          {medicines.map((med, i) => {
            const isDone = completed.includes(med);
            const isCurrent = i === currentMed && dispensing;

            return (
              <div
                key={i}
                className="card animate-fade-in"
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  borderColor: isCurrent ? 'var(--accent-primary)' : isDone ? 'var(--success)' : 'var(--border)',
                  opacity: isDone || isCurrent ? 1 : 0.5,
                }}
              >
                <span style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isDone ? 'rgba(16, 185, 129, 0.15)' : isCurrent ? 'rgba(0, 212, 170, 0.15)' : 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  flexShrink: 0,
                }}>
                  {isDone ? '✓' : isCurrent ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : '○'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{med.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Qty: {med.quantity} • {med.dosage}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!dispensing && (
          <button
            id="continue-after-dispense-btn"
            className="btn btn-primary btn-lg"
            onClick={onComplete}
            style={{ width: '100%' }}
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
}
