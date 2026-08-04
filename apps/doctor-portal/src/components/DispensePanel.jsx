// ==============================================
// Dispense Panel — Doctor prescribes medicine
// ==============================================

import { useState, useEffect } from 'react';
import { getMedicineStock, dispenseMedicines } from '../services/api';

export default function DispensePanel({ consultation, kioskId, onClose, onDispensed }) {
  const [stock, setStock] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispensing, setDispensing] = useState(false);

  useEffect(() => {
    loadStock();
  }, []);

  async function loadStock() {
    try {
      const targetKiosk = kioskId || consultation?.kioskId || consultation?.kiosk?.id || 'all';
      const data = await getMedicineStock(targetKiosk);
      setStock(data);

      if (data && data.length > 0) {
        // Auto-select the first available in-stock medicine as default prescription
        const available = data.find((item) => !item.isOutOfStock) || data[0];
        if (available && available.medicine) {
          setSelected([
            {
              medicineId: available.medicineId,
              name: available.medicine.name,
              quantity: 1,
              dosage: '1 tab twice daily',
              instructions: 'Take after meals',
              maxQty: available.quantity,
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Stock load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  function toggleMedicine(item) {
    const idx = selected.findIndex((s) => s.medicineId === item.medicineId);
    if (idx >= 0) {
      setSelected(selected.filter((_, i) => i !== idx));
    } else {
      setSelected([
        ...selected,
        {
          medicineId: item.medicineId,
          name: item.medicine.name,
          quantity: 1,
          dosage: '1 tab twice daily',
          instructions: 'Take after meals',
          maxQty: item.quantity,
        },
      ]);
    }
  }

  function updateSelected(medicineId, field, value) {
    setSelected(selected.map((s) =>
      s.medicineId === medicineId ? { ...s, [field]: value } : s
    ));
  }

  async function handleDispense() {
    if (selected.length === 0) return;
    setDispensing(true);

    try {
      const medicines = selected.map((s) => ({
        medicineId: s.medicineId,
        quantity: parseInt(s.quantity) || 1,
        dosage: s.dosage || '1 tab twice daily',
        instructions: s.instructions || 'After meals',
      }));

      await dispenseMedicines(consultation.id, medicines);
      onDispensed();
    } catch (err) {
      alert('Dispense error: ' + err.message);
    } finally {
      setDispensing(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
    }}>
      <div className="card animate-slide-up" style={{
        width: '100%',
        maxWidth: 620,
        maxHeight: '85vh',
        overflow: 'auto',
        background: '#0e1626',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white' }}>
            💊 Dispense Medicine — {consultation.villager?.name || 'Patient'}
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Loading medicine stock...</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
              Select medicines from kiosk stock to prescribe and dispense to patient:
            </p>

            {/* Stock grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10, marginBottom: 18 }}>
              {stock.map((item) => {
                const isSelected = selected.some((s) => s.medicineId === item.medicineId);
                return (
                  <button
                    key={item.id}
                    onClick={() => !item.isOutOfStock && toggleMedicine(item)}
                    disabled={item.isOutOfStock}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isSelected ? '#06b6d4' : item.isLowStock ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                      background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-secondary)',
                      cursor: item.isOutOfStock ? 'not-allowed' : 'pointer',
                      opacity: item.isOutOfStock ? 0.4 : 1,
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 4, color: isSelected ? '#38bdf8' : 'white' }}>
                      {item.medicine?.name || 'Medicine'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: item.isLowStock ? 'var(--warning)' : 'var(--text-muted)' }}>
                      Stock: {item.quantity} {item.medicine?.unit || 'units'}s
                      {item.isLowStock && ' ⚠️'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected medicines detail */}
            {selected.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: '#38bdf8' }}>
                  📋 PRESCRIPTION ITEMS ({selected.length})
                </h3>
                {selected.map((s) => (
                  <div key={s.medicineId} style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    marginBottom: 10,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>{s.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Qty:</span>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        max={s.maxQty}
                        value={s.quantity}
                        onChange={(e) => updateSelected(s.medicineId, 'quantity', e.target.value)}
                        style={{ width: 64, padding: '5px 8px', fontSize: '0.85rem', textAlign: 'center' }}
                      />
                    </div>
                    <input
                      className="input"
                      type="text"
                      placeholder="Dosage (e.g. 1 tab twice daily)"
                      value={s.dosage}
                      onChange={(e) => updateSelected(s.medicineId, 'dosage', e.target.value)}
                      style={{ width: 170, padding: '5px 10px', fontSize: '0.85rem' }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, padding: '12px 0' }}>
                Cancel
              </button>
              <button
                id="dispense-btn"
                className="btn btn-primary"
                onClick={handleDispense}
                disabled={selected.length === 0 || dispensing}
                style={{ flex: 2, padding: '12px 0', fontWeight: 700, fontSize: '0.95rem' }}
              >
                {dispensing ? 'Dispensing...' : `💊 Dispense ${selected.length} Medicine(s)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
