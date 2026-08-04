// ==============================================
// API Service — KIOSK Portal
// ==============================================

const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('kiosk_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function request(url, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: { ...getHeaders(), ...options.headers },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }

    return res.json();
  } catch (err) {
    // Offline fallback — save to queue
    if (!navigator.onLine) {
      saveToOfflineQueue({ url, options });
      throw new Error('Offline — action queued for sync');
    }
    throw err;
  }
}

function saveToOfflineQueue(action) {
  const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
  queue.push({ ...action, timestamp: Date.now() });
  localStorage.setItem('offline_queue', JSON.stringify(queue));
}

export async function syncOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
  if (queue.length === 0) return;

  const remaining = [];
  for (const action of queue) {
    try {
      await fetch(`${API_BASE}${action.url}`, {
        ...action.options,
        headers: { ...getHeaders(), ...action.options?.headers },
      });
    } catch {
      remaining.push(action);
    }
  }
  localStorage.setItem('offline_queue', JSON.stringify(remaining));
}

// ── Auth ─────────────────────────────────────
export const loginKiosk = (machineCode) =>
  request('/auth/kiosk/login', {
    method: 'POST',
    body: JSON.stringify({ machineCode }),
  });

// ── Villagers ────────────────────────────────
export const getVillagers = (villageId) =>
  request(`/villagers?villageId=${villageId}`);

export const getVillager = (id) =>
  request(`/villagers/${id}`);

export const registerVillager = (data) =>
  request('/villagers', { method: 'POST', body: JSON.stringify(data) });

export const updateFace = (id, faceEncoding) =>
  request(`/villagers/${id}/face`, {
    method: 'PUT',
    body: JSON.stringify({ faceEncoding }),
  });

export const getFaceData = (villageId) =>
  request('/villagers/identify', {
    method: 'POST',
    body: JSON.stringify({ faceEncoding: [], villageId }),
  });

// ── Consultations ────────────────────────────
export const createConsultation = (data) =>
  request('/consultations', { method: 'POST', body: JSON.stringify(data) });

export const getConsultations = (params) => {
  const query = new URLSearchParams(params).toString();
  return request(`/consultations?${query}`);
};

// ── Queue ────────────────────────────────────
export const getQueue = (kioskId) =>
  request(`/queue/${kioskId}`);

// ── AI ───────────────────────────────────────
export const sendAIChat = (message, history, villagerName) =>
  request('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history, villagerName }),
  });

export const requestTriage = (consultationId, symptoms) =>
  request('/ai/triage', {
    method: 'POST',
    body: JSON.stringify({ consultationId, symptoms }),
  });

// ── Reviews ──────────────────────────────────
export const submitReview = (data) =>
  request('/reviews', { method: 'POST', body: JSON.stringify(data) });
