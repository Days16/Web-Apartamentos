/* eslint-disable */
// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { fetchActiveOffers } from '../services/supabaseService';
import { useLang } from '../contexts/LangContext';
import { useDiscount } from '../contexts/DiscountContext';
import { useLocation } from 'react-router-dom';
import Ico, { paths } from './Ico';

export default function OffersBanner() {
  const [offers, setOffers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [closed, setClosed] = useState(false);
  const [copied, setCopied] = useState(false);
  const { lang, t } = useLang();
  const { activeDiscount, applyDiscount, removeDiscount } = useDiscount();
  const location = useLocation();
  const isAdminPage =
    location.pathname.startsWith('/admin') || location.pathname.startsWith('/gestion');
  const bannerRef = useRef(null);

  useEffect(() => {
    fetchActiveOffers().then(data => {
      if (data && data.length > 0) {
        setOffers(data);

        // VALIDATION: If we have an active discount, check if it's still in the active list
        if (activeDiscount) {
          const isValid = data.some(o => o.id === activeDiscount.id);
          if (!isValid) {
            removeDiscount();
          }
        }
      } else {
        setOffers([]);
        // No active offers found, clear any applied discount
        if (activeDiscount) {
          removeDiscount();
        }
      }
    });

    // Add keyframes for animation if not present
    if (!document.getElementById('banner-animations')) {
      const style = document.createElement('style');
      style.id = 'banner-animations';
      style.innerHTML = `
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(212, 168, 67, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(212, 168, 67, 0); }
          100% { box-shadow: 0 0 0 0 rgba(212, 168, 67, 0); }
        }
        .offer-slide {
          animation: slideUpFade 5s infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }, [location.pathname]); // Re-fetch on navigation to ensure sync with DB

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  useEffect(() => {
    if (offers.length > 1 && !closed) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % offers.length);
      }, 5000); // 5 seconds per offer
      return () => clearInterval(interval);
    }
  }, [offers.length, closed]);

  // Auto-apply if no code
  useEffect(() => {
    if (offers.length > 0) {
      const current = offers[currentIndex];
      if (!current.discount_code && activeDiscount?.id !== current.id) {
        applyDiscount(current);
      }
    }
  }, [currentIndex, offers, activeDiscount, applyDiscount]);

  // Layout synchronization
  useEffect(() => {
    const updateHeight = () => {
      if (offers.length > 0 && !closed && !isAdminPage) {
        const h = bannerRef.current?.offsetHeight || 48;
        document.documentElement.style.setProperty('--banner-height', `${h}px`);
      } else {
        document.documentElement.style.setProperty('--banner-height', '0px');
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
      document.documentElement.style.setProperty('--banner-height', '0px');
    };
  }, [offers.length, closed, isAdminPage]);

  // SEC: Clear discount when entering admin/gestion to avoid manual booking interference
  useEffect(() => {
    if (isAdminPage && activeDiscount) {
      removeDiscount();
    }
  }, [isAdminPage, activeDiscount, removeDiscount]);

  if (offers.length === 0 || closed || isAdminPage) return null;

  const offer = offers[currentIndex];
  const title = lang === 'es' || !offer.title_en ? offer.title_es : offer.title_en;

  const handleApplyDiscount = off => {
    applyDiscount(off);
    if (off.discount_code) {
      navigator.clipboard.writeText(off.discount_code);
      setCopied(true);
    }
  };

  return (
    <div
      ref={bannerRef}
      className="fixed top-0 left-0 right-0 z-[1000] bg-gradient-to-r from-navy to-teal text-white px-12 py-3 flex items-center justify-center text-sm font-medium min-h-12 shadow-md"
    >
      {/* Sliding Container */}
      <div
        key={currentIndex}
        className={`flex flex-wrap items-center justify-center gap-4 w-full max-w-5xl pr-8 md:pr-4 ${offers.length > 1 ? 'offer-slide' : ''}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="bg-white/20 text-white px-2 py-1 rounded text-xs font-black tracking-widest uppercase flex items-center gap-1 shadow-sm">
            <Ico d={paths.star} size={12} />
            {t('OFERTA', 'OFFER')}
          </div>

          <span className="font-semibold tracking-tight">{title}</span>

          {offer.discount_percentage > 0 && (
            <span className="text-white font-black text-base">-{offer.discount_percentage}%</span>
          )}
        </div>

        {!offer.discount_code && (
          <div className="bg-white/10 border border-white/30 text-white px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5">
            <Ico d={paths.check} size={14} />
            {t('DESCUENTO APLICADO', 'DISCOUNT APPLIED')}
          </div>
        )}

        {offer.discount_code && (
          <div className="flex items-center gap-2">
            <span className="opacity-80 text-sm">{t('Usa el código:', 'Use code:')}</span>
            <button
              onClick={() => handleApplyDiscount(offer)}
              title={t('Aplicar y copiar código', 'Apply and copy code')}
              className={`px-3 py-1 rounded-md font-mono text-sm font-bold cursor-pointer flex items-center gap-1.5 transition-all ${activeDiscount?.id === offer.id ? 'bg-white/30 border border-solid border-white/50' : 'bg-white/10 border border-dashed border-white/40 hover:bg-white/20 hover:border-white pulseGlow'}`}
            >
              {offer.discount_code}
              {activeDiscount?.id === offer.id ? (
                <span className="text-white">
                  <Ico d={paths.check} size={14} />
                </span>
              ) : (
                <span className="opacity-70">
                  <Ico d={paths.copy} size={14} />
                </span>
              )}
            </button>
            {copied && (
              <span className="absolute text-xs font-bold text-white -translate-y-5 transform">
                {t('¡Copiado!', 'Copied!')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Pagination Dots */}
      {offers.length > 1 && (
        <div className="absolute bottom-1 flex gap-1">
          {offers.map((_, idx) => (
            <div
              key={idx}
              className={`w-1 h-1 rounded-full transition-colors ${idx === currentIndex ? 'bg-white' : 'bg-white/30'}`}
            />
          ))}
        </div>
      )}

      {/* Close Button */}
      <button
        onClick={() => {
          setClosed(true);
          removeDiscount(); // User wants it removed if banner is gone
        }}
        className="absolute right-4 bg-white/10 border-0 text-white rounded-full p-1.5 flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-white/20 transition-all cursor-pointer"
      >
        <Ico d={paths.close} size={14} />
      </button>
    </div>
  );
}
