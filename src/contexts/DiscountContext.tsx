import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface Discount {
  discount_percentage: number;
  code?: string;
  [key: string]: unknown;
}

interface DiscountContextValue {
  activeDiscount: Discount | null;
  applyDiscount: (offer: Discount) => void;
  removeDiscount: () => void;
}

const DiscountContext = createContext<DiscountContextValue | null>(null);

export function DiscountProvider({ children }: { children: ReactNode }) {
  const [activeDiscount, setActiveDiscount] = useState<Discount | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('active_discount');
    if (saved) {
      try {
        setActiveDiscount(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing saved discount:', e);
      }
    }
  }, []);

  const applyDiscount = useCallback((offer: Discount) => {
    setActiveDiscount(offer);
    sessionStorage.setItem('active_discount', JSON.stringify(offer));
  }, []);

  const removeDiscount = useCallback(() => {
    setActiveDiscount(null);
    sessionStorage.removeItem('active_discount');
  }, []);

  return (
    <DiscountContext.Provider value={{ activeDiscount, applyDiscount, removeDiscount }}>
      {children}
    </DiscountContext.Provider>
  );
}

export function useDiscount(): DiscountContextValue {
  const ctx = useContext(DiscountContext);
  if (!ctx) throw new Error('useDiscount must be used within a DiscountProvider');
  return ctx;
}
