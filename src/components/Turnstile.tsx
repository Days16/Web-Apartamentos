import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    isPlaywright?: boolean;
    onTurnstileLoad?: () => void;
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_ID = 'cf-turnstile-script';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // clave test

interface TurnstileProps {
  onVerify?: (token: string) => void;
  onExpire?: () => void;
  theme?: string;
}

export default function Turnstile({ onVerify, onExpire, theme = 'auto' }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    // Bypass para tests E2E o si no hay navegador
    if (typeof window === 'undefined' || window.isPlaywright) {
      onVerify && onVerify('test-token');
      return;
    }

    const loadTurnstileScript = () => {
      if (!document.getElementById(SCRIPT_ID)) {
        window.onTurnstileLoad = () => {
          const event = new CustomEvent('cf-turnstile-loaded');
          window.dispatchEvent(event);
        };

        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    };

    const render = () => {
      if (!containerRef.current || widgetId.current !== null) return;
      if (!window.turnstile) return;

      try {
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme,
          callback: (token: string) => onVerify && onVerify(token),
          'expired-callback': () => {
            widgetId.current = null;
            onExpire && onExpire();
          },
          'error-callback': (err: unknown) => {
            console.error('Turnstile Error:', err);
            widgetId.current = null;
            onExpire && onExpire();
          },
        });
      } catch (e: unknown) {
        console.warn('Failed to render Turnstile:', e);
      }
    };

    const initialize = () => {
      loadTurnstileScript();
      if (window.turnstile) {
        setTimeout(render, 50);
      } else {
        window.addEventListener('cf-turnstile-loaded', render);
      }
    };

    // Use IntersectionObserver to load only when visible
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          initialize();
          observer.disconnect();
        }
      },
      { rootMargin: '150px' }
    ); // Load slightly before it appears

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('cf-turnstile-loaded', render);
      if (widgetId.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch (_e) {
          // ignore
        }
        widgetId.current = null;
      }
    };
  }, [theme]);

  // If theme change occurs after first render, we need to handle it
  useEffect(() => {
    if (widgetId.current !== null && window.turnstile) {
      window.turnstile.remove(widgetId.current);
      widgetId.current = null;
      // Re-initialize if already visible or if script is already loaded
      if (window.turnstile) {
        const render = () => {
          if (!containerRef.current || widgetId.current !== null) return;
          if (!window.turnstile) return;
          widgetId.current = window.turnstile.render(containerRef.current, {
            sitekey: SITE_KEY,
            theme,
            callback: (token: string) => onVerify && onVerify(token),
            'expired-callback': () => {
              widgetId.current = null;
              onExpire && onExpire();
            },
            'error-callback': () => {
              widgetId.current = null;
              onExpire && onExpire();
            },
          });
        };
        render();
      }
    }
  }, [theme]);

  return <div ref={containerRef} className="mt-4 mb-2 min-h-[65px]" />;
}
