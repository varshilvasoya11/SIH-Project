// ==============================================
// Incoming Call Modal Component — Patient Web Portal
// Displays incoming call ring overlay when doctor calls
// ==============================================

export default function IncomingCallModal({ callData, onAccept, onDecline }) {
  if (!callData) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(4, 7, 17, 0.88)',
      backdropFilter: 'blur(12px)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div className="card animate-slide-up" style={{
        width: '100%',
        maxWidth: 420,
        textAlign: 'center',
        padding: 32,
        background: '#0e1626',
        border: '2px solid #06b6d4',
        boxShadow: '0 0 50px rgba(6, 182, 212, 0.4)',
      }}>
        {/* Ringing pulse icon */}
        <div style={{
          width: 84,
          height: 84,
          borderRadius: '50%',
          background: 'rgba(6, 182, 212, 0.15)',
          border: '2px solid #06b6d4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          margin: '0 auto 20px',
          animation: 'pulse 1.5s infinite',
        }}>
          📲
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: 6 }}>
          Incoming Video Call
        </h2>
        <p style={{ fontSize: '1.05rem', color: '#38bdf8', fontWeight: 700, marginBottom: 4 }}>
          {callData.doctorName || 'Dr. Priya Sharma'}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 28 }}>
          Doctor is calling for a live telemedicine consultation.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button
            onClick={onDecline}
            className="btn btn-danger"
            style={{
              flex: 1,
              padding: '14px 0',
              borderRadius: 'var(--radius-full)',
              fontWeight: 700,
              fontSize: '0.95rem',
            }}
          >
            🔴 Decline
          </button>
          <button
            onClick={onAccept}
            className="btn btn-primary"
            style={{
              flex: 1.3,
              padding: '14px 0',
              borderRadius: 'var(--radius-full)',
              fontWeight: 700,
              fontSize: '0.95rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.5)',
            }}
          >
            🟢 Accept Call
          </button>
        </div>
      </div>
    </div>
  );
}
