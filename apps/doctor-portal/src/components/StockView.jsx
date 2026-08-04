// ==============================================
// Stock View — Medicine inventory dashboard
// ==============================================

import { useState, useEffect } from 'react';
import { getMedicineStock, checkReorders, restockMedicine } from '../services/api';

export default function StockView({ kioskId, kioskName }) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reorderResult, setReorderResult] = useState(null);

  useEffect(() => {
    loadStock();
  }, [kioskId]);

  async function loadStock() {
    try {
      const data = await getMedicineStock(kioskId);
      setStock(data);
    } catch (err) {
      console.error('Stock load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReorderCheck() {
    try {
      const result = await checkReorders(kioskId);
      setReorderResult(result);
      loadStock();
    } catch (err) {
      alert('Reorder check failed: ' + err.message);
    }
  }

  async function handleRestock(stockId) {
    try {
      await restockMedicine(stockId);
      loadStock();
    } catch (err) {
      alert('Restock failed: ' + err.message);
    }
  }

  const lowStockCount = stock.filter((s) => s.isLowStock).length;
  const outOfStockCount = stock.filter((s) => s.isOutOfStock).length;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Medicine Stock</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{kioskName}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleReorderCheck}>
          🔄 Check & Reorder
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stock.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Items</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16, borderColor: lowStockCount > 0 ? 'rgba(245, 158, 11, 0.3)' : 'var(--border)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>{lowStockCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Low Stock</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16, borderColor: outOfStockCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'var(--border)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>{outOfStockCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Out of Stock</div>
        </div>
      </div>

      {reorderResult && reorderResult.reordersPlaced > 0 && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          color: 'var(--success)',
          fontSize: '0.8rem',
          marginBottom: 16,
        }}>
          ✅ {reorderResult.reordersPlaced} reorder(s) placed: {reorderResult.reorders.map((r) => r.medicine).join(', ')}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {stock.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderColor: item.isOutOfStock ? 'rgba(239, 68, 68, 0.3)' : item.isLowStock ? 'rgba(245, 158, 11, 0.2)' : 'var(--border)',
              }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                background: item.isOutOfStock ? 'rgba(239, 68, 68, 0.1)' : item.isLowStock ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
              }}>
                💊
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{item.medicine.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {item.medicine.category} • Threshold: {item.lowThreshold}
                </div>
              </div>

              {/* Stock bar */}
              <div style={{ width: 100 }}>
                <div style={{
                  width: '100%',
                  height: 6,
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.min((item.quantity / (item.lowThreshold * 3)) * 100, 100)}%`,
                    height: '100%',
                    background: item.isOutOfStock ? 'var(--danger)' : item.isLowStock ? 'var(--warning)' : 'var(--success)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>

              <span style={{
                fontWeight: 700,
                fontSize: '0.9rem',
                minWidth: 36,
                textAlign: 'right',
                color: item.isOutOfStock ? 'var(--danger)' : item.isLowStock ? 'var(--warning)' : 'var(--text-primary)',
              }}>
                {item.quantity}
              </span>

              {item.isLowStock && !item.isOutOfStock && <span className="badge badge-warning">LOW</span>}
              {item.isOutOfStock && <span className="badge badge-danger">OUT</span>}

              {/* Manual Restock Button for testing convenience */}
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                onClick={() => handleRestock(item.id)}
                title="Instantly top up stock to full capacity for demo testing"
              >
                ⚡ Restock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
