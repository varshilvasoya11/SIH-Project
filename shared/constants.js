// ========================================
// Shared Constants — KIOSK Healthcare
// ========================================

const CONSULTATION_STATUS = {
  WAITING: 'waiting',
  IN_TRIAGE: 'in_triage',
  TRIAGED: 'triaged',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const PRIORITY_LEVELS = {
  EMERGENCY: 10,
  HIGH: 7,
  MEDIUM: 5,
  LOW: 3,
  ROUTINE: 1,
};

const KIOSK_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance',
};

const DISPENSE_STATUS = {
  PENDING: 'pending',
  DISPENSING: 'dispensing',
  DISPENSED: 'dispensed',
  FAILED: 'failed',
};

const BLOOD_TEST_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

const AI_PROVIDERS = {
  GROK: 'grok',
  GEMINI: 'gemini',
};

module.exports = {
  CONSULTATION_STATUS,
  PRIORITY_LEVELS,
  KIOSK_STATUS,
  DISPENSE_STATUS,
  BLOOD_TEST_STATUS,
  AI_PROVIDERS,
};
