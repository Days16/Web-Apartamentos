/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { PanelPageHeader, PanelConfirm, PanelModal, PanelBadge } from '../../components/panel';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const ROLES = ['admin', 'gestion'] as const;
type Role = (typeof ROLES)[number];

interface PanelUser {
  id: string;
  email: string;
  role: Role | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Ahora mismo';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `Hace ${d}d`;
  return new Date(iso).toLocaleDateString('es-ES');
}

function initials(email: string) {
  return email?.slice(0, 2).toUpperCase() || '?';
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-800',
  gestion: 'bg-slate-100 text-slate-800',
};

export default function Usuarios() {
  const toast = useToast();
  const [users, setUsers] = useState<PanelUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('gestion');
  const [inviting, setInviting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmBan, setConfirmBan] = useState<PanelUser | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function callApi(method: string, body?: object) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
        apikey: ANON_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Error desconocido');
    return json;
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const { users: data } = await callApi('GET');
      setUsers(data ?? []);
    } catch (err: any) {
      toast.error('Error cargando usuarios: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await callApi('POST', { email: inviteEmail.trim(), role: inviteRole });
      toast.success(`Invitación enviada a ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('gestion');
      loadUsers();
    } catch (err: any) {
      toast.error('Error al invitar: ' + err.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(user: PanelUser, newRole: Role) {
    setUpdatingId(user.id);
    try {
      await callApi('PATCH', { id: user.id, role: newRole });
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, role: newRole } : u)));
      toast.success('Rol actualizado');
    } catch (err: any) {
      toast.error('Error al cambiar rol: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleActive(user: PanelUser) {
    const isActive = !user.banned_until || new Date(user.banned_until) < new Date();
    setUpdatingId(user.id);
    try {
      await callApi('PATCH', { id: user.id, active: !isActive });
      setUsers(prev =>
        prev.map(u =>
          u.id === user.id ? { ...u, banned_until: isActive ? '2126-01-01T00:00:00Z' : null } : u
        )
      );
      toast.success(isActive ? 'Usuario desactivado' : 'Usuario activado');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setUpdatingId(null);
      setConfirmBan(null);
    }
  }

  const isActive = (u: PanelUser) => !u.banned_until || new Date(u.banned_until) < new Date();

  return (
    <div className="panel-page-content">
      <PanelPageHeader
        title="Usuarios del panel"
        subtitle="Gestiona accesos y roles de administradores y gestores."
        actions={
          <button
            onClick={() => setInviteOpen(true)}
            className="panel-btn panel-btn-primary panel-btn-sm"
          >
            + Invitar usuario
          </button>
        }
      />

      <div className="space-y-4">
        {/* Tabla de usuarios */}
        <div className="panel-card overflow-hidden !p-0">
          {loading ? (
            <div className="divide-y panel-border-color">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-48" />
                    <div className="h-2.5 bg-slate-100 rounded w-32" />
                  </div>
                  <div className="h-6 w-20 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 panel-text-muted text-sm">
              No hay usuarios registrados.
            </div>
          ) : (
            users.map((u, i) => {
              const active = isActive(u);
              const busy = updatingId === u.id;
              return (
                <div
                  key={u.id}
                  className={`flex flex-wrap items-center gap-4 px-6 py-4 border-b panel-border-color transition-colors hover:bg-slate-50/50 ${active ? '' : 'opacity-55'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${active ? 'bg-[#1a5f6e]' : 'bg-slate-400'}`}
                  >
                    {initials(u.email)}
                  </div>

                  {/* Email + fechas */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate panel-text-main">{u.email}</div>
                    <div className="text-[11px] mt-0.5 panel-text-muted">
                      Último acceso: {timeAgo(u.last_sign_in_at)}
                      <span className="mx-1.5 opacity-40">·</span>
                      Creado: {new Date(u.created_at).toLocaleDateString('es-ES')}
                    </div>
                  </div>

                  {/* Estado */}
                  <PanelBadge variant={active ? 'success' : 'neutral'}>
                    {active ? 'Activo' : 'Inactivo'}
                  </PanelBadge>

                  {/* Selector de rol */}
                  <select
                    value={u.role ?? ''}
                    disabled={busy}
                    onChange={e => handleRoleChange(u, e.target.value as Role)}
                    className="panel-input text-xs py-1.5 w-auto cursor-pointer disabled:opacity-50"
                    aria-label="Rol del usuario"
                  >
                    <option value="">Sin rol</option>
                    {ROLES.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  {/* Toggle activo */}
                  <button
                    disabled={busy}
                    onClick={() => (active ? setConfirmBan(u) : handleToggleActive(u))}
                    className="text-xs px-2.5 py-1.5 rounded-lg border panel-border-color panel-text-muted transition-colors disabled:opacity-40"
                  >
                    {busy ? '…' : active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Role descriptions */}
        <div className="panel-card">
          <div className="panel-h3 mb-4">Roles disponibles</div>
          {[
            {
              role: 'admin',
              desc: 'Acceso total. Puede configurar pagos, precios, cancelaciones y usuarios.',
            },
            {
              role: 'gestion',
              desc: 'Puede gestionar reservas, mensajes y el calendario. Sin acceso a configuración.',
            },
          ].map((r, i) => (
            <div
              key={r.role}
              className={`flex gap-4 py-3 items-start panel-border-color ${i === 0 ? 'border-b' : ''}`}
            >
              <span
                className={`px-2 py-0.5 mt-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${ROLE_COLORS[r.role]}`}
              >
                {r.role}
              </span>
              <div className="text-sm panel-text-muted leading-relaxed">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal invitar */}
      <PanelModal open={inviteOpen} title="Invitar usuario" onClose={() => setInviteOpen(false)}>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="invite-email"
              className="block text-xs font-bold text-slate-500 uppercase mb-1.5"
            >
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              className="panel-input w-full"
              placeholder="usuario@ejemplo.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Rol</label>
            <select
              className="panel-input w-full"
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as Role)}
              aria-label="Rol del nuevo usuario"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="panel-btn panel-btn-ghost flex-1"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="panel-btn panel-btn-primary flex-1 disabled:opacity-50"
            >
              {inviting ? 'Enviando…' : 'Enviar invitación'}
            </button>
          </div>
        </div>
      </PanelModal>

      {/* Confirmar desactivar */}
      <PanelConfirm
        open={!!confirmBan}
        variant="destructive"
        title="¿Desactivar este usuario?"
        description={`${confirmBan?.email} no podrá acceder al panel hasta que lo reactives.`}
        confirmLabel="Desactivar"
        onConfirm={() => confirmBan && handleToggleActive(confirmBan)}
        onCancel={() => setConfirmBan(null)}
      />
    </div>
  );
}
