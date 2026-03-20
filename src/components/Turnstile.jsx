import { useEffect, useRef } from 'react';

const SCRIPT_ID = 'cf-turnstile-script';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // clave test

/**
 * Cloudflare Turnstile CAPTCHA widget.
 * Llama a onVerify(token) cuando el usuario pasa el challenge.
 * Llama a onExpire() si el token caduca.
 */
export default function Turnstile({ onVerify, onExpire, theme = 'auto' }) {
  const containerRef = useRef(null);
  const widgetId = useRef(null);

  useEffect(() => {
    // Cargar el script de Turnstile una sola vez
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const render = () => {
      if (!containerRef.current || widgetId.current !== null) return;
      if (typeof window.turnstile === 'undefined') return;
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme,
        callback: (token) => onVerify && onVerify(token),
        'expired-callback': () => {
          widgetId.current = null;
          onExpire && onExpire();
        },
      });
    };

    // Si ya está cargado, renderizar ahora; si no, esperar al evento load
    if (typeof window.turnstile !== 'undefined') {
      render();
    } else {
      const script = document.getElementById(SCRIPT_ID);
      script.addEventListener('load', render);
      return () => script.removeEventListener('load', render);
    }

    return () => {
      if (widgetId.current !== null && typeof window.turnstile !== 'undefined') {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="mt-4 mb-2" />;
}
