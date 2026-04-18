/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { fetchSettings, updateSetting } from '../../services/supabaseService';
import { useToast } from '../../contexts/ToastContext';
import { PanelPageHeader, PanelCard } from '../../components/panel';

const TABS = [
  { id: 'confirmaciones', label: 'Confirmaciones' },
  { id: 'recordatorios', label: 'Recordatorios' },
  { id: 'resenas', label: 'Reseñas' },
  { id: 'propietario', label: 'Propietario' },
] as const;

const DAYS_OPTIONS = [1, 2, 3, 5, 7];

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="panel-toggle-row">
      <span className="text-sm panel-text-main">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!on)}
        className={`panel-toggle${on ? ' panel-toggle--on' : ''}`}
        aria-label={label}
        role="switch"
        aria-checked={on}
      >
        <span className="panel-toggle-track" />
        <span className="panel-toggle-thumb" />
      </button>
    </div>
  );
}

export default function EmailConfig() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<
    'confirmaciones' | 'recordatorios' | 'resenas' | 'propietario'
  >('confirmaciones');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    email_booking_confirmation: true,
    email_checkin_reminder: true,
    email_checkin_reminder_days: 2,
    email_post_stay_review: true,
    email_post_stay_review_days: 2,
    email_owner_notification: true,
    email_weekly_summary: false,
    email_owner_address: '',
  });

  useEffect(() => {
    fetchSettings()
      .then(data => {
        setSettings({
          email_booking_confirmation: data.email_booking_confirmation ?? true,
          email_checkin_reminder: data.email_checkin_reminder ?? true,
          email_checkin_reminder_days: data.email_checkin_reminder_days ?? 2,
          email_post_stay_review: data.email_post_stay_review ?? true,
          email_post_stay_review_days: data.email_post_stay_review_days ?? 2,
          email_owner_notification: data.email_owner_notification ?? true,
          email_weekly_summary: data.email_weekly_summary ?? false,
          email_owner_address: data.email_owner_address ?? '',
        });
      })
      .catch(() => {
        toast.error('Error cargando configuración');
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting('email_booking_confirmation', settings.email_booking_confirmation, 'boolean'),
        updateSetting('email_checkin_reminder', settings.email_checkin_reminder, 'boolean'),
        updateSetting(
          'email_checkin_reminder_days',
          settings.email_checkin_reminder_days,
          'number'
        ),
        updateSetting('email_post_stay_review', settings.email_post_stay_review, 'boolean'),
        updateSetting(
          'email_post_stay_review_days',
          settings.email_post_stay_review_days,
          'number'
        ),
        updateSetting('email_owner_notification', settings.email_owner_notification, 'boolean'),
        updateSetting('email_weekly_summary', settings.email_weekly_summary, 'boolean'),
        updateSetting('email_owner_address', settings.email_owner_address, 'string'),
      ]);
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error guardando configuración');
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="panel-page-content">
        <div className="panel-skeleton h-[200px]" />
      </div>
    );

  return (
    <div className="panel-page-content">
      <PanelPageHeader
        title="Emails automáticos"
        subtitle="Configura qué emails se envían y cuándo"
      />

      {/* Tabs */}
      <div className="panel-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`panel-tab${activeTab === tab.id ? ' panel-tab--active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-[600px]">
        {activeTab === 'confirmaciones' && (
          <PanelCard>
            <h3 className="panel-h3 mb-4">Confirmación de reserva</h3>
            <p className="text-sm mb-4 panel-text-muted">
              Email enviado al huésped inmediatamente tras completar la reserva y el pago.
            </p>
            <Toggle
              on={settings.email_booking_confirmation}
              onChange={v => set('email_booking_confirmation', v)}
              label="Enviar email de confirmación al huésped"
            />
          </PanelCard>
        )}

        {activeTab === 'recordatorios' && (
          <PanelCard>
            <h3 className="panel-h3 mb-4">Recordatorio de check-in</h3>
            <p className="text-sm mb-4 panel-text-muted">
              Email enviado al huésped con información de acceso y normas de la casa.
            </p>
            <Toggle
              on={settings.email_checkin_reminder}
              onChange={v => set('email_checkin_reminder', v)}
              label="Enviar recordatorio de check-in"
            />
            {settings.email_checkin_reminder && (
              <div className="flex items-center gap-3 mt-4 pt-3 border-t panel-border-color">
                <span className="text-sm panel-text-main">Días antes del check-in</span>
                <select
                  className="panel-input w-auto"
                  aria-label="Días antes del check-in"
                  value={settings.email_checkin_reminder_days}
                  onChange={e => set('email_checkin_reminder_days', +e.target.value)}
                >
                  {DAYS_OPTIONS.map(d => (
                    <option key={d} value={d}>
                      {d} día{d !== 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </PanelCard>
        )}

        {activeTab === 'resenas' && (
          <PanelCard>
            <h3 className="panel-h3 mb-4">Solicitud de reseña post-estancia</h3>
            <p className="text-sm mb-4 panel-text-muted">
              Email enviado al huésped para invitarle a dejar una reseña tras su estancia.
            </p>
            <Toggle
              on={settings.email_post_stay_review}
              onChange={v => set('email_post_stay_review', v)}
              label="Enviar solicitud de reseña"
            />
            {settings.email_post_stay_review && (
              <div className="flex items-center gap-3 mt-4 pt-3 border-t panel-border-color">
                <span className="text-sm panel-text-main">Días después del checkout</span>
                <select
                  className="panel-input w-auto"
                  aria-label="Días después del checkout"
                  value={settings.email_post_stay_review_days}
                  onChange={e => set('email_post_stay_review_days', +e.target.value)}
                >
                  {DAYS_OPTIONS.map(d => (
                    <option key={d} value={d}>
                      {d} día{d !== 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </PanelCard>
        )}

        {activeTab === 'propietario' && (
          <div className="space-y-4">
            <PanelCard>
              <h3 className="panel-h3 mb-1">Email del propietario</h3>
              <p className="text-sm mb-4 panel-text-muted">
                Dirección de email para recibir notificaciones. Si se deja vacío se usa la cuenta de
                login del admin.
              </p>
              <label className="panel-label block mb-1.5" htmlFor="owner-email">
                Email de notificaciones
              </label>
              <input
                id="owner-email"
                type="email"
                className="panel-input max-w-[340px]"
                value={settings.email_owner_address}
                onChange={e => set('email_owner_address', e.target.value)}
                placeholder="propietario@ejemplo.com"
              />
            </PanelCard>
            <PanelCard>
              <h3 className="panel-h3 mb-2">Notificaciones al propietario</h3>
              <Toggle
                on={settings.email_owner_notification}
                onChange={v => set('email_owner_notification', v)}
                label="Notificar al propietario en cada reserva nueva"
              />
              <Toggle
                on={settings.email_weekly_summary}
                onChange={v => set('email_weekly_summary', v)}
                label="Resumen semanal automático (lunes 8:00 AM)"
              />
            </PanelCard>
          </div>
        )}

        <div className="mt-6">
          <button className="panel-btn panel-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
