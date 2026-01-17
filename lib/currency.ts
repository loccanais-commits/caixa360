// Sistema de Multi-Moeda com Conversão

// ==================== TIPOS ====================

export type CurrencyCode = 'BRL' | 'USD' | 'EUR' | 'GBP' | 'ARS' | 'PYG' | 'UYU';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimalPlaces: number;
}

export interface ExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  updatedAt: string;
}

// ==================== MOEDAS SUPORTADAS ====================

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Real Brasileiro',
    locale: 'pt-BR',
    decimalPlaces: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'Dólar Americano',
    locale: 'en-US',
    decimalPlaces: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
    decimalPlaces: 2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'Libra Esterlina',
    locale: 'en-GB',
    decimalPlaces: 2,
  },
  ARS: {
    code: 'ARS',
    symbol: '$',
    name: 'Peso Argentino',
    locale: 'es-AR',
    decimalPlaces: 2,
  },
  PYG: {
    code: 'PYG',
    symbol: '₲',
    name: 'Guarani Paraguaio',
    locale: 'es-PY',
    decimalPlaces: 0,
  },
  UYU: {
    code: 'UYU',
    symbol: '$U',
    name: 'Peso Uruguaio',
    locale: 'es-UY',
    decimalPlaces: 2,
  },
};

// ==================== FORMATAÇÃO ====================

export function formatCurrency(value: number, currencyCode: CurrencyCode = 'BRL'): string {
  const currency = CURRENCIES[currencyCode];

  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces,
  }).format(value);
}

export function formatCurrencyShort(value: number, currencyCode: CurrencyCode = 'BRL'): string {
  const currency = CURRENCIES[currencyCode];

  if (Math.abs(value) >= 1000000) {
    return `${currency.symbol} ${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${currency.symbol} ${(value / 1000).toFixed(1)}k`;
  }

  return formatCurrency(value, currencyCode);
}

// ==================== CONVERSÃO ====================

// Cache de taxas de câmbio
let exchangeRatesCache: Record<string, ExchangeRate> = {};
let lastFetchTime: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora

// Taxas padrão (fallback caso a API falhe)
const DEFAULT_RATES: Record<string, number> = {
  'USD_BRL': 5.0,
  'EUR_BRL': 5.5,
  'GBP_BRL': 6.3,
  'ARS_BRL': 0.005,
  'PYG_BRL': 0.0007,
  'UYU_BRL': 0.12,
  'BRL_USD': 0.2,
  'BRL_EUR': 0.18,
  'BRL_GBP': 0.16,
  'BRL_ARS': 200,
  'BRL_PYG': 1400,
  'BRL_UYU': 8.3,
};

export async function fetchExchangeRates(baseCurrency: CurrencyCode = 'BRL'): Promise<Record<string, ExchangeRate>> {
  // Verifica cache
  if (Date.now() - lastFetchTime < CACHE_DURATION && Object.keys(exchangeRatesCache).length > 0) {
    return exchangeRatesCache;
  }

  try {
    // Usa API gratuita de câmbio
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`,
      { next: { revalidate: 3600 } } // Cache de 1 hora
    );

    if (!response.ok) throw new Error('Falha ao buscar taxas');

    const data = await response.json();
    const now = new Date().toISOString();

    // Atualiza cache
    exchangeRatesCache = {};
    Object.entries(data.rates).forEach(([code, rate]) => {
      if (code in CURRENCIES) {
        const key = `${baseCurrency}_${code}`;
        exchangeRatesCache[key] = {
          from: baseCurrency,
          to: code as CurrencyCode,
          rate: rate as number,
          updatedAt: now,
        };
      }
    });

    lastFetchTime = Date.now();
    return exchangeRatesCache;
  } catch (error) {
    console.error('Erro ao buscar taxas de câmbio:', error);

    // Retorna taxas padrão
    const now = new Date().toISOString();
    const fallbackRates: Record<string, ExchangeRate> = {};

    Object.entries(DEFAULT_RATES).forEach(([key, rate]) => {
      const [from, to] = key.split('_') as [CurrencyCode, CurrencyCode];
      fallbackRates[key] = { from, to, rate, updatedAt: now };
    });

    return fallbackRates;
  }
}

export async function convertCurrency(
  value: number,
  from: CurrencyCode,
  to: CurrencyCode
): Promise<{ converted: number; rate: number }> {
  if (from === to) {
    return { converted: value, rate: 1 };
  }

  const rates = await fetchExchangeRates(from);
  const key = `${from}_${to}`;
  const rate = rates[key]?.rate || DEFAULT_RATES[key] || 1;

  return {
    converted: value * rate,
    rate,
  };
}

// Conversão síncrona usando taxas cacheadas ou padrão
export function convertCurrencySync(
  value: number,
  from: CurrencyCode,
  to: CurrencyCode
): { converted: number; rate: number } {
  if (from === to) {
    return { converted: value, rate: 1 };
  }

  const key = `${from}_${to}`;
  const rate = exchangeRatesCache[key]?.rate || DEFAULT_RATES[key] || 1;

  return {
    converted: value * rate,
    rate,
  };
}

// ==================== PARSING ====================

export function parseCurrencyInput(input: string, currencyCode: CurrencyCode = 'BRL'): number {
  const currency = CURRENCIES[currencyCode];

  // Remove símbolo da moeda e espaços
  let cleaned = input.replace(currency.symbol, '').trim();

  // Detecta formato baseado no locale
  if (currency.locale.startsWith('pt') || currency.locale.startsWith('es')) {
    // Formato brasileiro/espanhol: 1.234,56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Formato americano/inglês: 1,234.56
    cleaned = cleaned.replace(/,/g, '');
  }

  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

// ==================== HOOK DE MOEDA ====================

import { useState, useEffect, useCallback } from 'react';

export function useCurrency(defaultCurrency: CurrencyCode = 'BRL') {
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [rates, setRates] = useState<Record<string, ExchangeRate>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Carrega taxas ao montar
  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = useCallback(async () => {
    setLoading(true);
    try {
      const newRates = await fetchExchangeRates(currency);
      setRates(newRates);
      setLastUpdate(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, [currency]);

  const format = useCallback((value: number, code?: CurrencyCode) => {
    return formatCurrency(value, code || currency);
  }, [currency]);

  const convert = useCallback(async (value: number, from: CurrencyCode, to: CurrencyCode) => {
    return convertCurrency(value, from, to);
  }, []);

  const convertSync = useCallback((value: number, from: CurrencyCode, to: CurrencyCode) => {
    return convertCurrencySync(value, from, to);
  }, []);

  return {
    currency,
    setCurrency,
    rates,
    loading,
    lastUpdate,
    loadRates,
    format,
    convert,
    convertSync,
  };
}
