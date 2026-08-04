// ==============================================
// Patient Web Portal — Main Dashboard
// History, Prescriptions, Medicine Ordering & Video Calls
// ==============================================

import { useState, useEffect } from 'react';
import {
  getPatientConsultations,
  getMedicines,
  getPatientDeliveries,
  createMedicineOrder,
  createConsultation,
} from '../services/api';
import { getSocket } from '../services/socket';
import PatientVideoCall from '../components/PatientVideoCall';
import IncomingCallModal from '../components/IncomingCallModal';

export default function Dashboard({ patient, onLogout }) {
  const [tab, setTab] = useState('history'); // history | order | deliveries
  const [consultations, setConsultations] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Video Call state
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [joiningCall, setJoiningCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  // Order state
  const [cart, setCart] = useState([]);
  const [deliveryMethod, setDeliveryMethod] = useState('home'); // home | kiosk
  const [orderAddress, setOrderAddress] = useState(patient.address || 'Rampur Village');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  useEffect(() => {
    loadData();

    // Listen for live prescription, queue updates, incoming doctor calls, and real-time cart push over Socket.io
    const socket = getSocket();
    socket?.on('queue-updated', loadData);
    socket?.on('prescription-updated', loadData);
    socket?.on('order-status-updated', loadData);

    // Feature 6 & 9: Real-Time WebSocket push — Doctor prescribed item lands in Patient Cart automatically
    socket?.on('prescription-added-to-cart', (data) => {
      if (data.villagerId === patient.id && data.medicine) {
        setCart((prev) => {
          const exists = prev.some((item) => item.id === data.medicine.id);
          if (exists) return prev;
          return [...prev, {
            id: data.medicine.id,
            name: data.medicine.name,
            category: data.medicine.category || 'Prescribed Medication',
            unit: data.medicine.unit || 'tablet',
            quantity: data.medicine.quantity || 1,
            instructions: data.medicine.instructions,
          }];
        });
        alert(`💊 Real-Time Push: Dr. prescribed ${data.medicine.name}. It has been added to your cart!`);
      }
    });

    socket?.on('incoming-doctor-call', (callData) => {
      if (
        callData.patientId === patient.id ||
        callData.patientPhone === patient.phone ||
        !callData.patientPhone
      ) {
        setIncomingCall(callData);
      }
    });

    socket?.on('call-ended', () => {
      setIncomingCall(null);
    });

    return () => {
      socket?.off('queue-updated');
      socket?.off('prescription-updated');
      socket?.off('order-status-updated');
      socket?.off('prescription-added-to-cart');
      socket?.off('incoming-doctor-call');
      socket?.off('call-ended');
    };
  }, [patient]);

  async function loadData() {
    setLoading(true);
    try {
      const [cData, mData, dData] = await Promise.all([
        getPatientConsultations(patient.id).catch(() => []),
        getMedicines().catch(() => []),
        getPatientDeliveries(patient.id).catch(() => []),
      ]);
      setConsultations(cData);
      setMedicines(mData);
      setDeliveries(dData);
    } catch (err) {
      console.error('Failed to load patient data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartVideoCall() {
    setJoiningCall(true);
    try {
      const consultation = await createConsultation({
        villagerId: patient.id,
        aiSymptoms: { text: 'Direct online video consultation request from Patient Web Portal' },
      });
      setActiveConsultation(consultation);
      setShowVideoCall(true);
    } catch (err) {
      alert('Failed to start call: ' + err.message);
    } finally {
      setJoiningCall(false);
    }
  }

  async function handleAcceptIncomingCall() {
    if (!incomingCall) return;
    const callData = incomingCall;
    setIncomingCall(null);

    const socket = getSocket();
    socket?.emit('patient-accepts-call', callData);

    try {
      const consultation = await createConsultation({
        villagerId: patient.id,
        aiSymptoms: { text: `Call accepted from Doctor ${callData.doctorName}` },
      });
      setActiveConsultation(consultation);
      setShowVideoCall(true);
    } catch (err) {
      alert('Error joining call: ' + err.message);
    }
  }

  function handleDeclineIncomingCall() {
    if (incomingCall) {
      const socket = getSocket();
      socket?.emit('patient-declines-call', incomingCall);
    }
    setIncomingCall(null);
  }

  function toggleCartItem(medicine) {
    const existing = cart.find((item) => item.id === medicine.id);
    if (existing) {
      setCart(cart.filter((item) => item.id !== medicine.id));
    } else {
      setCart([...cart, { ...medicine, quantity: 1 }]);
    }
  }

  function autoSelectPrescriptionMedicines(prescriptions) {
    if (!prescriptions || prescriptions.length === 0) return;
    const newCart = [...cart];
    prescriptions.forEach((p) => {
      if (p.medicine && !newCart.some((c) => c.id === p.medicine.id)) {
        newCart.push({
          id: p.medicine.id,
          name: p.medicine.name,
          category: p.medicine.category,
          quantity: p.quantity || 1,
        });
      }
    });
    setCart(newCart);
    setTab('order');
  }

  function updateQuantity(id, qty) {
    setCart(cart.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, parseInt(qty) || 1) } : item)));
  }

  async function handlePlaceOrder() {
    if (cart.length === 0) return;
    setPlacingOrder(true);
    setOrderSuccess(null);

    try {
      const lastConsultation = consultations[0];
      const newOrder = await createMedicineOrder({
        villagerId: patient.id,
        consultationId: lastConsultation?.id || null,
        deliveryAddress: deliveryMethod === 'home' ? orderAddress : 'Kiosk Pickup Point (Anandpur-01)',
        specialInstructions: `Order contains ${cart.map((c) => `${c.name} (${c.quantity})`).join(', ')}`,
      });

      setOrderSuccess(newOrder);
      setCart([]);
      loadData();
    } catch (err) {
      alert('Failed to place order: ' + err.message);
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Incoming Call Ringing Modal */}
      {incomingCall && (
        <IncomingCallModal
          callData={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
        />
      )}

      {/* Video Call Modal */}
      {showVideoCall && (
        <PatientVideoCall
          patient={patient}
          consultation={activeConsultation}
          onCallEnd={() => {
            setShowVideoCall(false);
            loadData();
          }}
        />
      )}

      {/* Header Bar */}
      <header className="glass" style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: '1.5rem' }}>🏥</div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              HealthKiosk AI
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patient Web Portal</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            className="btn btn-primary"
            onClick={handleStartVideoCall}
            disabled={joiningCall}
            style={{ fontWeight: 700, padding: '8px 18px', fontSize: '0.85rem' }}
          >
            {joiningCall ? 'Connecting...' : '📹 Start Doctor Video Call'}
          </button>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{patient.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>📞 {patient.phone}</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
          <button
            onClick={() => setTab('history')}
            style={{
              padding: '14px 4px',
              border: 'none',
              background: 'transparent',
              color: tab === 'history' ? '#38bdf8' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.9rem',
              borderBottom: tab === 'history' ? '2px solid #06b6d4' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            📜 Visit History & Prescriptions ({consultations.length})
          </button>
          <button
            onClick={() => setTab('order')}
            style={{
              padding: '14px 4px',
              border: 'none',
              background: 'transparent',
              color: tab === 'order' ? '#38bdf8' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.9rem',
              borderBottom: tab === 'order' ? '2px solid #06b6d4' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            💊 Order Prescribed Medicines ({cart.length})
          </button>
          <button
            onClick={() => setTab('deliveries')}
            style={{
              padding: '14px 4px',
              border: 'none',
              background: 'transparent',
              color: tab === 'deliveries' ? '#38bdf8' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.9rem',
              borderBottom: tab === 'deliveries' ? '2px solid #06b6d4' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            🚚 Order Tracking ({deliveries.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '24px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        {/* Call CTA Banner */}
        <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(16,185,129,0.1) 100%)', border: '1px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>📹 Need a Live Doctor Consultation?</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Connect directly via HD Video Call with an online doctor for instant diagnosis & prescription.
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleStartVideoCall}
            disabled={joiningCall}
            style={{ fontWeight: 700, padding: '10px 20px' }}
          >
            {joiningCall ? 'Connecting...' : '📞 Connect Video Call Now'}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto 16px', width: 40, height: 40 }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading profile & records...</p>
          </div>
        ) : tab === 'history' ? (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16, color: 'white' }}>
              My Medical Records & Prescriptions
            </h2>

            {consultations.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No Visit History Yet</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: 4, marginBottom: 16 }}>
                  Click "Connect Video Call Now" above or visit a village HealthKiosk for a doctor consultation.
                </p>
                <button className="btn btn-primary" onClick={handleStartVideoCall} disabled={joiningCall}>
                  📹 Start First Video Consultation
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {consultations.map((c) => (
                  <div key={c.id} className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <span className="badge badge-info" style={{ marginRight: 8 }}>
                          Status: {c.status}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          📅 {new Date(c.createdAt).toLocaleDateString()} at {new Date(c.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>
                        Doctor: {c.doctor?.name || 'Dr. Priya Sharma'}
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        DOCTOR DIAGNOSIS / NOTES:
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'white', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                        {c.doctorNotes || 'Patient consultation completed. Prescribed medicines added below.'}
                      </p>
                    </div>

                    {c.prescriptions && c.prescriptions.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                            💊 DOCTOR PRESCRIBED MEDICINES:
                          </div>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => autoSelectPrescriptionMedicines(c.prescriptions)}
                          >
                            🛒 1-Click Order All Prescribed
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {c.prescriptions.map((p) => (
                            <div key={p.id} style={{ background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'white' }}>
                              <strong>{p.medicine?.name}</strong> • Qty: {p.quantity} ({p.dosage || '1 tab daily'})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'order' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>
                  Browse & Order Prescribed Medicines
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Order medicines directly for village home delivery or kiosk pickup
                </p>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                🛒 {cart.length} Item(s) in Cart
              </span>
            </div>

            {orderSuccess && (
              <div className="card" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', marginBottom: 20 }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981', marginBottom: 4 }}>✅ Order Placed Successfully!</div>
                <p style={{ fontSize: '0.9rem', color: 'white' }}>
                  Order ID: <code style={{ color: '#38bdf8' }}>{orderSuccess.id}</code> • Status: <strong>{orderSuccess.status}</strong>
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              {/* Medicine Catalog Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {medicines.map((m) => {
                  const inCart = cart.some((c) => c.id === m.id);
                  return (
                    <div key={m.id} className="card" style={{ border: inCart ? '1px solid #06b6d4' : '1px solid var(--border)' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: 4 }}>{m.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                        Category: {m.category || 'General Medicine'}
                      </div>
                      <button
                        className={`btn ${inCart ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                        onClick={() => toggleCartItem(m)}
                        style={{ width: '100%' }}
                      >
                        {inCart ? '✓ Selected' : '+ Add to Order'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Cart & Checkout Panel */}
              <div className="card" style={{ height: 'fit-content', background: 'var(--bg-secondary)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: '#38bdf8' }}>
                  Order Summary
                </h3>

                {cart.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                    Select medicines from the catalog or click "1-Click Order All Prescribed" under Visit History.
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                      {cart.map((item) => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: 'white', fontWeight: 600 }}>{item.name}</span>
                          <input
                            className="input"
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, e.target.value)}
                            style={{ width: 54, padding: '4px 6px', textAlign: 'center' }}
                          />
                        </div>
                      ))}
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                        Fulfillment Option:
                      </label>
                      <select
                        className="input"
                        value={deliveryMethod}
                        onChange={(e) => setDeliveryMethod(e.target.value)}
                        style={{ marginBottom: 12 }}
                      >
                        <option value="home">🏡 Village Home Delivery</option>
                        <option value="kiosk">📍 Kiosk Self-Pickup Point</option>
                      </select>

                      {deliveryMethod === 'home' && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                            Delivery Address:
                          </label>
                          <input
                            className="input"
                            type="text"
                            value={orderAddress}
                            onChange={(e) => setOrderAddress(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={handlePlaceOrder}
                      disabled={placingOrder}
                      style={{ width: '100%', fontWeight: 700, padding: '12px 0' }}
                    >
                      {placingOrder ? 'Submitting Order...' : '🚀 Submit Medicine Order'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16, color: 'white' }}>
              Live Order & Delivery Tracking
            </h2>

            {deliveries.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚚</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No Active Deliveries</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                  Place a medicine order to track status live from dispatch to delivery.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {deliveries.map((d) => (
                  <div key={d.id} className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', marginRight: 12 }}>
                          Order #{d.id.substring(0, 8)}
                        </span>
                        <span className="badge badge-success">
                          Status: {d.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Est. Delivery: {new Date(d.deliveryDate).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '14px 20px', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
                      <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 700, fontSize: '0.8rem' }}>
                        1. Placed ✅
                      </div>
                      <div style={{ flex: 1, height: 2, background: '#10b981', margin: '0 8px' }} />
                      <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 700, fontSize: '0.8rem' }}>
                        2. Preparing ✅
                      </div>
                      <div style={{ flex: 1, height: 2, background: d.status === 'In Transit' || d.status === 'Delivered' ? '#10b981' : 'var(--border)', margin: '0 8px' }} />
                      <div style={{ textAlign: 'center', color: d.status === 'In Transit' || d.status === 'Delivered' ? '#10b981' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.8rem' }}>
                        3. In Transit 🚚
                      </div>
                      <div style={{ flex: 1, height: 2, background: d.status === 'Delivered' ? '#10b981' : 'var(--border)', margin: '0 8px' }} />
                      <div style={{ textAlign: 'center', color: d.status === 'Delivered' ? '#10b981' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.8rem' }}>
                        4. Delivered 🏡
                      </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      📍 <strong>Fulfillment Destination:</strong> {d.deliveryAddress}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
