// ==============================================
// API Service — Doctor Portal
// ==============================================

const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('doctor_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth ─────────────────────────────────────
export const loginDoctor = (email, password) =>
  request('/auth/doctor/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const registerDoctor = (doctorData) =>
  request('/auth/doctor/register', {
    method: 'POST',
    body: JSON.stringify(doctorData),
  });

export const getMe = () => request('/auth/me');

// ── Queue ────────────────────────────────────
export const getQueue = (kioskId) => request(`/queue/${kioskId}`);
export const getAvailableDoctors = () => request('/queue/doctors/available');

// ── Kiosks ───────────────────────────────────
export const getKiosks = () => request('/kiosk');

// ── Consultations ────────────────────────────
export const getConsultations = (params) => {
  const query = new URLSearchParams(params).toString();
  return request(`/consultations?${query}`);
};
export const createConsultation = (data) =>
  request('/consultations', { method: 'POST', body: JSON.stringify(data) });
export const assignConsultation = (id) =>
  request(`/consultations/${id}/assign`, { method: 'PUT' });
export const completeConsultation = (id, doctorNotes) =>
  request(`/consultations/${id}/complete`, {
    method: 'PUT',
    body: JSON.stringify({ doctorNotes }),
  });

// ── Villagers ────────────────────────────────
export const getVillager = (id) => request(`/villagers/${id}`);
export const getVillagers = (villageId) => request(`/villagers?villageId=${villageId}`);

// ── Medicines ────────────────────────────────
export const getMedicines = () => request('/medicines');
export const getMedicineStock = (kioskId) => request(`/medicines/stock/${kioskId}`);
export const checkReorders = (kioskId) =>
  request(`/medicines/reorder-check/${kioskId}`, { method: 'POST' });
export const restockMedicine = (stockId, quantity) =>
  request(`/medicines/restock/${stockId}`, { method: 'POST', body: JSON.stringify({ quantity }) });

// ── Dispense ─────────────────────────────────
export const dispenseMedicines = (consultationId, medicines) =>
  request('/dispense', {
    method: 'POST',
    body: JSON.stringify({ consultationId, medicines }),
  });

// ── In-Call Chat Messages ────────────────────
export const getCallMessages = (consultationId) => request(`/consultations/${consultationId}/messages`);
export const sendCallMessage = (consultationId, data) =>
  request(`/consultations/${consultationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ── Reviews ──────────────────────────────────
export const getDoctorReviews = (doctorId) => request(`/reviews/doctor/${doctorId}`);

// ── Deliveries ───────────────────────────────
export const createDelivery = (data) =>
  request('/deliveries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const getDeliveries = (params) => {
  const query = new URLSearchParams(params || {}).toString();
  return request(`/deliveries?${query}`);
};
export const updateDeliveryStatus = (id, data) =>
  request(`/deliveries/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

