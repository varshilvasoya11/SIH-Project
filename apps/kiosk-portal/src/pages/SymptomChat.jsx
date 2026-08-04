// ==============================================
// Symptom Chat — AI-powered symptom collection
// ==============================================

import { useState, useRef, useEffect } from 'react';
import { sendAIChat, createConsultation, requestTriage } from '../services/api';

export default function SymptomChat({ villager, kioskData, onComplete }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${villager.name}! 👋 I'm your health assistant. Please tell me, what is bothering you today? Describe your symptoms.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [canFinish, setCanFinish] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // After 3 user messages, allow finishing
  useEffect(() => {
    const userMsgCount = messages.filter((m) => m.role === 'user').length;
    if (userMsgCount >= 2) setCanFinish(true);
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        content: m.content,
      }));

      const data = await sendAIChat(userMsg, history, villager.name);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Any other symptoms and any other illness?' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish() {
    setSubmitting(true);

    try {
      const symptoms = messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content);

      // Create consultation
      const consultation = await createConsultation({
        villagerId: villager.id,
        kioskId: kioskData.id,
        aiSymptoms: { messages, symptoms },
      });

      // Request AI triage
      try {
        await requestTriage(consultation.id, { symptoms, chatHistory: messages });
      } catch {
        // Triage failure shouldn't block the flow
        console.warn('Triage failed, continuing with default priority');
      }

      onComplete(consultation);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 36px)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
        paddingBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          fontWeight: 700,
          color: '#0a0e1a',
        }}>
          {villager.name.charAt(0)}
        </div>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{villager.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Tell us about your health concern</p>
        </div>
        {canFinish && (
          <button
            id="finish-chat-btn"
            className="btn btn-primary"
            onClick={handleFinish}
            disabled={submitting}
            style={{ marginLeft: 'auto' }}
          >
            {submitting ? 'Submitting...' : '✓ Join Queue'}
          </button>
        )}
      </div>

      {/* Chat messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        paddingBottom: 16,
      }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className="animate-fade-in"
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '75%',
              padding: '12px 18px',
              borderRadius: msg.role === 'user'
                ? '16px 16px 4px 16px'
                : '16px 16px 16px 4px',
              background: msg.role === 'user'
                ? 'var(--accent-gradient)'
                : 'var(--bg-card)',
              color: msg.role === 'user' ? '#0a0e1a' : 'var(--text-primary)',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '12px 18px',
              borderRadius: '16px 16px 16px 4px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--text-muted)',
                      animation: `pulse-glow 1s ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} style={{
        display: 'flex',
        gap: 8,
        paddingTop: 16,
        borderTop: '1px solid var(--border)',
      }}>
        <input
          id="symptom-input"
          className="input"
          type="text"
          placeholder="Type your symptoms here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || submitting}
          autoFocus
          style={{ flex: 1 }}
        />
        <button
          id="send-symptom-btn"
          className="btn btn-primary"
          type="submit"
          disabled={!input.trim() || loading || submitting}
        >
          Send →
        </button>
      </form>
    </div>
  );
}
