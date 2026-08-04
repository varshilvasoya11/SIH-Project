import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('patient_user');
    if (saved) {
      try {
        setPatient(JSON.parse(saved));
      } catch {
        localStorage.removeItem('patient_user');
      }
    }
  }, []);

  function handleLogin(patientData) {
    setPatient(patientData);
  }

  function handleLogout() {
    localStorage.removeItem('patient_token');
    localStorage.removeItem('patient_user');
    setPatient(null);
  }

  return (
    <div>
      {patient ? (
        <Dashboard patient={patient} onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLogin} />
      )}
    </div>
  );
}
