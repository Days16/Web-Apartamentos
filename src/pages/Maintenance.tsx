/* eslint-disable */
// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import { useSettings } from '../contexts/SettingsContext';

export default function Maintenance() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const T = useT(lang);
  const M = T.maintenance;
  const { settings } = useSettings();
  const contactEmail = settings?.site_email || 'info@apartamentosillapancha.com';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-5 py-10">
      <div className="w-full max-w-xl">
        {/* Un icono o ilustración elegante */}
        <div className="text-6xl mb-6 text-amber-400">🚧</div>

        <h1 className="font-serif text-5xl text-navy mb-4 font-medium">{M.title}</h1>

        <p className="text-lg text-slate-600 leading-relaxed mb-8">{M.desc}</p>

        <div className="h-px bg-gray-200 w-20 mx-auto mb-8" />

        <p className="text-sm text-slate-500 mb-10">
          {M.contact}
          <br />
          <strong>{contactEmail}</strong>
        </p>

        <button
          onClick={() => window.location.reload()}
          className="bg-navy text-white border-0 px-7 py-3 rounded-lg text-sm font-medium cursor-pointer hover:bg-slate-800 transition-all"
        >
          {M.retry}
        </button>
      </div>

      <div className="absolute bottom-10 text-xs text-slate-300 tracking-widest uppercase">
        {T.footer.rights}
      </div>
    </div>
  );
}
