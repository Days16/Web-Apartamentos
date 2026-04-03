import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type Currency = 'EUR' | 'GBP' | 'USD' | 'CHF' | 'SEK';

export interface CurrencyOption {
  code: Currency;
  symbol: string;
  label: string;
  locale: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'EUR', symbol: '€', label: 'Euro', locale: 'es-ES' },
  { code: 'GBP', symbol: '£', label: 'Libra', locale: 'en-GB' },
  { code: 'USD', symbol: '$', label: 'Dólar USD', locale: 'en-US' },
  { code: 'CHF', symbol: 'Fr', label: 'Franco suizo', locale: 'de-CH' },
  { code: 'SEK', symbol: 'kr', label: 'Corona sueca', locale: 'sv-SE' },
];

const FALLBACK_RATES: Record<Currency, number> = {
  EUR: 1,
  GBP: 0.86,
  USD: 1.08,
  CHF: 0.97,
  SEK: 11.5,
};

interface CurrencyContextValue {
  currency: Currency;
  rate: number;
  setCurrency: (c: Currency) => void;
  convertPrice: (eurPrice: number | null | undefined) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(
    () => (localStorage.getItem('currency') as Currency) || 'EUR'
  );
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK_RATES);

  useEffect(() => {
    const targets = CURRENCIES.map(c => c.code)
      .filter(c => c !== 'EUR')
      .join(',');
    fetch(`/api/frankfurter/latest?from=EUR&to=${targets}`)
      .then(r => r.json())
      .then((data: { rates?: Partial<Record<Currency, number>> }) => {
        if (data?.rates) {
          setRates({ ...FALLBACK_RATES, ...data.rates, EUR: 1 });
        }
      })
      .catch(() => {
        /* usa fallback */
      });
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('currency', c);
  };

  const rate = rates[currency] ?? 1;

  const convertPrice = (eurPrice: number | null | undefined): string => {
    if (!eurPrice && eurPrice !== 0) return '';
    const option = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0];
    return new Intl.NumberFormat(option.locale, {
      style: 'currency',
      currency: option.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(eurPrice * rate));
  };

  return (
    <CurrencyContext.Provider value={{ currency, rate, setCurrency, convertPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
