import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import Ico, { paths } from '../components/Ico';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { lang } = useLang();
  const T = useT(lang);
  const L = T.login;
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/gestion');
    } catch (err) {
      setError(L.error);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy to-teal text-white font-sans">
      <div className="bg-white/5 backdrop-blur-md p-10 rounded-2xl w-full max-w-sm shadow-2xl border border-white/10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gold rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_10px_15px_-3px_rgba(212,168,67,0.3)]">
            <Ico d={paths.lock} size={32} color="#0f172a" />
          </div>
          <h1 className="font-serif text-4xl tracking-wide m-0">{L.title}</h1>
          <p className="text-sm opacity-60 mt-2 mb-0">{L.sub}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="email" className="block text-xs font-bold uppercase mb-2 opacity-80">
              {L.email}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white outline-none transition-colors focus:border-gold"
            />
          </div>

          <div className="mb-8">
            <label htmlFor="password" className="block text-xs font-bold uppercase mb-2 opacity-80">
              {L.password}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white outline-none transition-colors focus:border-gold"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-3 rounded-lg text-xs mb-5 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gold rounded-lg text-navy font-bold text-lg cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(212,168,67,0.3)] disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading ? L.loading : L.button}
          </button>
        </form>

        <div className="mt-8 text-center flex flex-col gap-3">
          <button
            onClick={() => navigate('/forgot-password')}
            className="bg-transparent border-none text-gold/80 cursor-pointer text-sm hover:text-gold transition-opacity"
          >
            ¿Olvidaste tu contraseña?
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-transparent border-none text-white/50 cursor-pointer text-sm hover:text-white/80 transition-opacity"
          >
            {L.back}
          </button>
        </div>
      </div>
    </div>
  );
}
