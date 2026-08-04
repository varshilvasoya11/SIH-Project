
// ==============================================
// Review Page — Post-consultation feedback
// ==============================================

import { useState } from 'react';
import { submitReview } from '../services/api';

export default function ReviewPage({ consultation, onComplete }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitReview({
        consultationId: consultation.id,
        rating,
        feedbackText: feedback || null,
      });
      setSubmitted(true);
      setTimeout(() => onComplete(), 2500);
    } catch (err) {
      console.error('Review failed:', err);
      // Don't block flow if review fails
      onComplete();
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="page-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <div className="animate-slide-up" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🙏</div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8,
          }}>
            Thank You!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Your feedback helps us serve you better.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 16 }}>
            Returning to home screen...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
    }}>
      <div className="animate-slide-up" style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
        <h1 className="page-title" style={{ fontSize: '1.75rem', marginBottom: 8 }}>
          How was your visit?
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
          Rate your experience with the doctor
        </p>

        {/* Star rating */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              style={{
                width: 56,
                height: 56,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: (hoverRating || rating) >= star
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'var(--bg-card)',
                cursor: 'pointer',
                fontSize: '1.8rem',
                transition: 'all 0.2s',
                transform: (hoverRating || rating) >= star ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {(hoverRating || rating) >= star ? '⭐' : '☆'}
            </button>
          ))}
        </div>

        {rating > 0 && (
          <p style={{
            color: 'var(--accent-primary)',
            fontWeight: 600,
            marginBottom: 24,
            fontSize: '1.05rem',
          }}>
            {rating === 5 ? 'Excellent!' : rating === 4 ? 'Very Good!' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
          </p>
        )}

        {/* Text feedback */}
        <div style={{ marginBottom: 24 }}>
          <textarea
            id="feedback-text"
            className="input"
            placeholder="Any additional feedback? (Optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={onComplete}
            style={{ flex: 1 }}
          >
            Skip
          </button>
          <button
            id="submit-review-btn"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            style={{ flex: 2 }}
          >
            {submitting ? 'Submitting...' : 'Submit Review ✓'}
          </button>
        </div>
      </div>
    </div>
  );
}
