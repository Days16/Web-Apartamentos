/* eslint-disable */
// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1a5f6e 100%)',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)',
          padding: '40px',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '26px',
            marginTop: 0,
            textAlign: 'center',
          }}
        >
          Recuperar contraseña
        </h1>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#4ade80' }}>✓ Revisa tu correo electrónico.</p>
            <p style={{ opacity: 0.6, fontSize: '13px' }}>
              Si la dirección está registrada recibirás un enlace para restablecer tu contraseña.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                marginTop: '16px',
                background: 'none',
                border: 'none',
                color: '#D4A843',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Volver al login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p
              style={{
                opacity: 0.6,
                fontSize: '14px',
                marginTop: 0,
                marginBottom: '24px',
                textAlign: 'center',
              }}
            >
              Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  opacity: 0.8,
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = '#D4A843')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: '#D4A843',
                border: 'none',
                borderRadius: '8px',
                color: '#0f172a',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  opacity: 0.5,
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
                onMouseEnter={e => (e.target.style.opacity = 0.8)}
                onMouseLeave={e => (e.target.style.opacity = 0.5)}
              >
                Volver al login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
