'use client';

import { useState, useEffect, useCallback } from 'react';

// ==================== HOOK DE FILTROS SALVOS ====================

interface FilterConfig {
  key: string;           // Chave única para localStorage
  defaultValues: Record<string, any>;
  expirationMs?: number; // Tempo de expiração (default: 7 dias)
}

interface StoredFilter {
  values: Record<string, any>;
  savedAt: number;
}

export function useFilters<T extends Record<string, any>>({
  key,
  defaultValues,
  expirationMs = 7 * 24 * 60 * 60 * 1000, // 7 dias
}: FilterConfig) {
  const [filters, setFilters] = useState<T>(defaultValues as T);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar filtros salvos do localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(`filters:${key}`);
      if (stored) {
        const parsed: StoredFilter = JSON.parse(stored);

        // Verifica se não expirou
        if (Date.now() - parsed.savedAt < expirationMs) {
          // Merge com valores padrão para garantir que novos campos existam
          setFilters({ ...defaultValues, ...parsed.values } as T);
        } else {
          // Expirado, remove
          localStorage.removeItem(`filters:${key}`);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar filtros:', e);
    }

    setIsLoaded(true);
  }, [key, expirationMs]);

  // Salvar filtros quando mudarem
  const saveFilters = useCallback((newFilters: T) => {
    if (typeof window === 'undefined') return;

    try {
      const toStore: StoredFilter = {
        values: newFilters,
        savedAt: Date.now(),
      };
      localStorage.setItem(`filters:${key}`, JSON.stringify(toStore));
    } catch (e) {
      console.error('Erro ao salvar filtros:', e);
    }
  }, [key]);

  // Atualizar um filtro específico
  const setFilter = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      saveFilters(newFilters);
      return newFilters;
    });
  }, [saveFilters]);

  // Atualizar múltiplos filtros
  const setMultipleFilters = useCallback((updates: Partial<T>) => {
    setFilters(prev => {
      const newFilters = { ...prev, ...updates };
      saveFilters(newFilters);
      return newFilters;
    });
  }, [saveFilters]);

  // Resetar para valores padrão
  const resetFilters = useCallback(() => {
    setFilters(defaultValues as T);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`filters:${key}`);
    }
  }, [key, defaultValues]);

  // Verifica se há filtros ativos (diferentes do padrão)
  const hasActiveFilters = useCallback(() => {
    return Object.keys(defaultValues).some(
      k => filters[k] !== defaultValues[k]
    );
  }, [filters, defaultValues]);

  return {
    filters,
    setFilter,
    setMultipleFilters,
    resetFilters,
    hasActiveFilters,
    isLoaded,
  };
}

// ==================== HOOK DE CONFIRMAÇÃO ====================

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  variant: 'danger' | 'warning' | 'info';
  confirmText: string;
  onConfirm: () => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    confirmText: 'Confirmar',
    onConfirm: () => {},
  });
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((options: {
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    onConfirm: () => void | Promise<void>;
  }) => {
    setState({
      isOpen: true,
      title: options.title,
      message: options.message,
      variant: options.variant || 'danger',
      confirmText: options.confirmText || 'Confirmar',
      onConfirm: async () => {
        setLoading(true);
        try {
          await options.onConfirm();
        } finally {
          setLoading(false);
          setState(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  }, []);

  const close = useCallback(() => {
    if (!loading) {
      setState(prev => ({ ...prev, isOpen: false }));
    }
  }, [loading]);

  return {
    confirmState: state,
    confirm,
    closeConfirm: close,
    confirmLoading: loading,
  };
}

// ==================== HOOK DE PREFERÊNCIAS LOCAIS ====================

export function useLocalPreference<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(`pref:${key}`);
      if (stored) {
        setValue(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Erro ao carregar preferência:', e);
    }

    setIsLoaded(true);
  }, [key]);

  const setPreference = useCallback((newValue: T) => {
    setValue(newValue);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`pref:${key}`, JSON.stringify(newValue));
      } catch (e) {
        console.error('Erro ao salvar preferência:', e);
      }
    }
  }, [key]);

  return [value, setPreference, isLoaded] as const;
}
