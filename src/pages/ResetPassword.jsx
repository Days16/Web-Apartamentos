import { useState, useEffect } from 'react';
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
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
        if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
        setError('');
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);
        if (error) { setError(error.message); return; }
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
    };

    return (
        <div style={{
            height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1a5f6e 100%)', color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
                padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '400px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', marginTop: 0, textAlign: 'center' }}>
                    Nueva contraseña
                </h1>

                {success ? (
                    <div style={{ textAlign: 'center', color: '#4ade80' }}>
                        <p>✓ Contraseña actualizada correctamente.</p>
                        <p style={{ opacity: 0.6, fontSize: '13px' }}>Redirigiendo al login...</p>
                    </div>
                ) : !ready ? (
                    <div style={{ textAlign: 'center', opacity: 0.6 }}>
                        {error || 'Verificando token...'}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {['Nueva contraseña', 'Confirmar contraseña'].map((label, i) => (
                            <div key={i} style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.8 }}>
                                    {label}
                                </label>
                                <input
                                    type="password"
                                    value={i === 0 ? password : confirm}
                                    onChange={(e) => i === 0 ? setPassword(e.target.value) : setConfirm(e.target.value)}
                                    required
                                    style={{
                                        width: '100%', padding: '12px 16px', boxSizing: 'border-box',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px', color: '#fff', outline: 'none'
                                    }}
                                />
                            </div>
                        ))}

                        {error && (
                            <div style={{
                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                color: '#f87171', padding: '12px', borderRadius: '8px',
                                fontSize: '13px', marginBottom: '20px', textAlign: 'center'
                            }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '14px', background: '#D4A843', border: 'none',
                            borderRadius: '8px', color: '#0f172a', fontWeight: 'bold', fontSize: '16px',
                            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
                        }}>
                            {loading ? 'Guardando...' : 'Guardar contraseña'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
