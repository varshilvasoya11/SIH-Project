// ==============================================
// KIOSK Portal — Main App
// ==============================================

import { useState, useEffect } from 'react';
import './index.css';
import KioskLogin from './pages/KioskLogin';
import FaceScan from './pages/FaceScan';
import SymptomChat from './pages/SymptomChat';
import WaitingRoom from './pages/WaitingRoom';
import VideoCall from './pages/VideoCall';
import Dispense from './pages/Dispense';
import ReviewPage from './pages/ReviewPage';
import { connectSocket, joinKioskRoom, getSocket } from './services/socket';
import { syncOfflineQueue } from './services/api';

const STEPS = {
  LOGIN: 'login',
  FACE_SCAN: 'face_scan',
  SYMPTOM_CHAT: 'symptom_chat',
  WAITING: 'waiting',
  VIDEO_CALL: 'video_call',
  DISPENSE: 'dispense',
  REVIEW: 'review',
};

export default function App() {
  const [step, setStep] = useState(STEPS.LOGIN);
  const [kioskData, setKioskData] = useState(null);
  const [villager, setVillager] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Online/offline detection
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Check stored kiosk session
  useEffect(() => {
    const token = localStorage.getItem('kiosk_token');
    const stored = localStorage.getItem('kiosk_data');
    if (token && stored) {
      const data = JSON.parse(stored);
      setKioskData(data);
      setStep(STEPS.FACE_SCAN);

      const socket = connectSocket();
      joinKioskRoom(data.id);

      // Listen for doctor ready event
      socket.on('doctor-ready', (data) => {
        setStep(STEPS.VIDEO_CALL);
      });

      // Listen for dispense command
      socket.on('dispense-command', (data) => {
        setConsultation((prev) => ({ ...prev, dispenseMedicines: data.medicines }));
        setStep(STEPS.DISPENSE);
      });
    }
  }, []);

  function handleKioskLogin(data) {
    setKioskData(data.kiosk);
    localStorage.setItem('kiosk_token', data.token);
    localStorage.setItem('kiosk_data', JSON.stringify(data.kiosk));

    const socket = connectSocket();
    joinKioskRoom(data.kiosk.id);

    socket.on('doctor-ready', () => setStep(STEPS.VIDEO_CALL));
    socket.on('dispense-command', (cmdData) => {
      setConsultation((prev) => ({ ...prev, dispenseMedicines: cmdData.medicines }));
      setStep(STEPS.DISPENSE);
    });

    setStep(STEPS.FACE_SCAN);
  }

  function handleVillagerIdentified(v) {
    setVillager(v);
    setStep(STEPS.SYMPTOM_CHAT);
  }

  function handleSymptomsComplete(consultationData) {
    setConsultation(consultationData);
    setStep(STEPS.WAITING);
  }

  function handleCallEnd() {
    setStep(STEPS.DISPENSE);
  }

  function handleDispenseComplete() {
    setStep(STEPS.REVIEW);
  }

  function handleReviewComplete() {
    // Reset for next villager
    setVillager(null);
    setConsultation(null);
    setStep(STEPS.FACE_SCAN);
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Connection status bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '6px 16px',
        background: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.2)',
        borderBottom: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.3)'}`,
        backdropFilter: 'blur(10px)',
        fontSize: '0.8rem',
        fontWeight: 500,
      }}>
        <span className={`status-dot ${isOnline ? 'status-online' : 'status-offline'}`} />
        <span style={{ color: isOnline ? 'var(--success)' : 'var(--danger)' }}>
          {isOnline ? 'Connected' : 'Offline — Actions will sync when connected'}
        </span>
        {kioskData && (
          <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {kioskData.machineCode} • {kioskData.village?.name}
          </span>
        )}
      </div>

      <div style={{ paddingTop: 36 }}>
        {step === STEPS.LOGIN && (
          <KioskLogin onLogin={handleKioskLogin} />
        )}
        {step === STEPS.FACE_SCAN && kioskData && (
          <FaceScan
            kioskData={kioskData}
            onIdentified={handleVillagerIdentified}
          />
        )}
        {step === STEPS.SYMPTOM_CHAT && villager && kioskData && (
          <SymptomChat
            villager={villager}
            kioskData={kioskData}
            onComplete={handleSymptomsComplete}
          />
        )}
        {step === STEPS.WAITING && consultation && (
          <WaitingRoom
            consultation={consultation}
            kioskData={kioskData}
            onDoctorReady={() => setStep(STEPS.VIDEO_CALL)}
          />
        )}
        {step === STEPS.VIDEO_CALL && (
          <VideoCall
            consultation={consultation}
            onCallEnd={handleCallEnd}
          />
        )}
        {step === STEPS.DISPENSE && (
          <Dispense
            consultation={consultation}
            onComplete={handleDispenseComplete}
          />
        )}
        {step === STEPS.REVIEW && consultation && (
          <ReviewPage
            consultation={consultation}
            onComplete={handleReviewComplete}
          />
        )}
      </div>
    </div>
  );
}
