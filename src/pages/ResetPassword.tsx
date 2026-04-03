import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event — fired when Supabase processes the hash token
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setReady(true);
      }
    });
    // Also check if session already exists (in case event fired before mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => navigate('/login'), 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy to-teal text-white font-sans">
      <div className="bg-white/5 backdrop-blur-md p-10 rounded-2xl w-full max-w-sm shadow-2xl border border-white/10">
        <h1 className="font-serif text-3xl mt-0 text-center mb-8">Nueva contraseña</h1>

        {success ? (
          <div className="text-center text-green-400">
            <p>✓ Contraseña actualizada correctamente.</p>
            <p className="opacity-60 text-sm">Redirigiendo al login...</p>
          </div>
        ) : !ready ? (
          <div className="text-center opacity-60">{error || 'Verificando token...'}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {['Nueva contraseña', 'Confirmar contraseña'].map((label, i) => (
              <div key={i} className="mb-5">
                <label className="block text-xs font-bold uppercase mb-2 opacity-80">{label}</label>
                <input
                  type="password"
                  value={i === 0 ? password : confirm}
                  onChange={e =>
                    i === 0 ? setPassword(e.target.value) : setConfirm(e.target.value)
                  }
                  required
                  className="w-full px-4 py-3 box-border bg-white/5 border border-white/10 rounded-lg text-white outline-none transition-colors focus:border-gold"
                />
              </div>
            ))}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-3 rounded-lg text-xs mb-5 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gold rounded-lg text-navy font-bold text-lg cursor-pointer transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
