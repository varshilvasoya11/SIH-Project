// ==============================================
// Doctor Portal — Main App
// ==============================================

import { useState, useEffect } from 'react';
import './index.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { connectSocket, joinDoctorRoom } from './services/socket';

export default function App() {
  const [doctor, setDoctor] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('doctor_token');
    const savedDoctor = localStorage.getItem('doctor_data');
    if (savedToken && savedDoctor) {
      setToken(savedToken);
      setDoctor(JSON.parse(savedDoctor));
      const socket = connectSocket();
      joinDoctorRoom(JSON.parse(savedDoctor).id);
    }
  }, []);

  function handleLogin(data) {
    setToken(data.token);
    setDoctor(data.doctor);
    localStorage.setItem('doctor_token', data.token);
    localStorage.setItem('doctor_data', JSON.stringify(data.doctor));
    const socket = connectSocket();
    joinDoctorRoom(data.doctor.id);
  }

  function handleLogout() {
    setToken(null);
    setDoctor(null);
    localStorage.removeItem('doctor_token');
    localStorage.removeItem('doctor_data');
  }

  if (!doctor) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard doctor={doctor} onLogout={handleLogout} />;
}
