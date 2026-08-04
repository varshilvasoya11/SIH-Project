// ==============================================
// Patient Web Portal API Service
// ==============================================

const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('patient_token');
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

// Patient Auth
export const registerPatient = (data) =>
  request('/auth/patient/register', { method: 'POST', body: JSON.stringify(data) });

export const loginPatient = (phone) =>
  request('/auth/patient/login', { method: 'POST', body: JSON.stringify({ phone }) });

// Medical History & Consultations
export const getPatientConsultations = (patientId) =>
  request(`/consultations?villagerId=${patientId}`);

export const createConsultation = (data) =>
  request('/consultations', { method: 'POST', body: JSON.stringify(data) });

// Medicines Catalog
export const getMedicines = () =>
  request('/medicines');

// Medicine Deliveries & Orders
export const getPatientDeliveries = (patientId) =>
  request(`/deliveries?villagerId=${patientId}`);

export const createMedicineOrder = (data) =>
  request('/deliveries', { method: 'POST', body: JSON.stringify(data) });
