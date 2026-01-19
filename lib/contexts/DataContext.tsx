'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lancamento, Fornecedor, Conta, Empresa, Produto } from '@/lib/types';

interface DataCache {
  lancamentos: Lancamento[];
  fornecedores: Fornecedor[];
  contas: Conta[];
  produtos: Produto[];
  empresa: Empresa | null;
  empresaId: string;
  lastUpdated: {
    lancamentos: number;
    fornecedores: number;
    contas: number;
    produtos: number;
    empresa: number;
  };
}

interface DataContextType {
  // Data
  lancamentos: Lancamento[];
  fornecedores: Fornecedor[];
  contas: Conta[];
  produtos: Produto[];
  empresa: Empresa | null;
  empresaId: string;
  
  // Loading states
  loading: boolean;
  
  // Actions
  refreshLancamentos: (force?: boolean) => Promise<void>;
  refreshFornecedores: (force?: boolean) => Promise<void>;
  refreshContas: (force?: boolean) => Promise<void>;
  refreshProdutos: (force?: boolean) => Promise<void>;
  refreshAll: (force?: boolean) => Promise<void>;
  invalidateCache: (type?: 'lancamentos' | 'fornecedores' | 'contas' | 'produtos' | 'all') => void;
  
  // Initialize
  initializeData: () => Promise<void>;
  isInitialized: boolean;
}

const CACHE_DURATION = 60000; // 1 minute
const MAX_CACHE_ITEMS = 1000; // Limite máximo de itens por coleção

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  
  const [cache, setCache] = useState<DataCache>({
    lancamentos: [],
    fornecedores: [],
    contas: [],
    produtos: [],
    empresa: null,
    empresaId: '',
    lastUpdated: {
      lancamentos: 0,
      fornecedores: 0,
      contas: 0,
      produtos: 0,
      empresa: 0,
    },
  });
  
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if cache is stale
  const isCacheStale = (type: keyof DataCache['lastUpdated']) => {
    return Date.now() - cache.lastUpdated[type] > CACHE_DURATION;
  };

  // Get empresa ID first
  const getEmpresaId = async () => {
    if (cache.empresaId) return cache.empresaId;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return '';
    
    const { data: empresa } = await supabase
      .from('empresas')
      .select('*')
      .eq('usuario_id', user.id)
      .single();
    
    if (empresa) {
      setCache(prev => ({
        ...prev,
        empresa,
        empresaId: empresa.id,
        lastUpdated: { ...prev.lastUpdated, empresa: Date.now() }
      }));
      return empresa.id;
    }
    return '';
  };

  // Refresh lancamentos
  const refreshLancamentos = useCallback(async (force = false) => {
    const empresaId = await getEmpresaId();
    if (!empresaId) return;

    // Verificar cache apenas se não forçado
    if (!force) {
      const cacheStale = isCacheStale('lancamentos');
      if (!cacheStale) return;
    }

    const { data } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data', { ascending: false })
      .limit(MAX_CACHE_ITEMS);

    setCache(prev => ({
      ...prev,
      lancamentos: data || [],
      lastUpdated: { ...prev.lastUpdated, lancamentos: Date.now() }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Refresh fornecedores
  const refreshFornecedores = useCallback(async (force = false) => {
    const empresaId = await getEmpresaId();
    if (!empresaId) return;

    if (!force) {
      const cacheStale = isCacheStale('fornecedores');
      if (!cacheStale) return;
    }

    const { data } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome')
      .limit(MAX_CACHE_ITEMS);

    setCache(prev => ({
      ...prev,
      fornecedores: data || [],
      lastUpdated: { ...prev.lastUpdated, fornecedores: Date.now() }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Refresh contas
  const refreshContas = useCallback(async (force = false) => {
    const empresaId = await getEmpresaId();
    if (!empresaId) return;

    if (!force) {
      const cacheStale = isCacheStale('contas');
      if (!cacheStale) return;
    }

    const { data } = await supabase
      .from('contas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: true })
      .limit(MAX_CACHE_ITEMS);

    setCache(prev => ({
      ...prev,
      contas: data || [],
      lastUpdated: { ...prev.lastUpdated, contas: Date.now() }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Refresh produtos
  const refreshProdutos = useCallback(async (force = false) => {
    const empresaId = await getEmpresaId();
    if (!empresaId) return;

    if (!force) {
      const cacheStale = isCacheStale('produtos');
      if (!cacheStale) return;
    }

    const { data } = await supabase
      .from('produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome')
      .limit(MAX_CACHE_ITEMS);

    setCache(prev => ({
      ...prev,
      produtos: data || [],
      lastUpdated: { ...prev.lastUpdated, produtos: Date.now() }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Refresh all
  const refreshAll = useCallback(async (force = false) => {
    setLoading(true);
    await Promise.all([
      refreshLancamentos(force),
      refreshFornecedores(force),
      refreshContas(force),
      refreshProdutos(force),
    ]);
    setLoading(false);
  }, [refreshLancamentos, refreshFornecedores, refreshContas, refreshProdutos]);

  // Invalidate cache
  const invalidateCache = useCallback((type?: 'lancamentos' | 'fornecedores' | 'contas' | 'produtos' | 'all') => {
    if (!type || type === 'all') {
      setCache(prev => ({
        ...prev,
        lastUpdated: {
          lancamentos: 0,
          fornecedores: 0,
          contas: 0,
          produtos: 0,
          empresa: prev.lastUpdated.empresa,
        }
      }));
    } else {
      setCache(prev => ({
        ...prev,
        lastUpdated: { ...prev.lastUpdated, [type]: 0 }
      }));
    }
  }, []);

  // Initialize data
  const initializeData = useCallback(async () => {
    if (isInitialized) return;
    
    setLoading(true);
    await getEmpresaId();
    await refreshAll(true);
    setIsInitialized(true);
    setLoading(false);
  }, [isInitialized, refreshAll]);

  return (
    <DataContext.Provider
      value={{
        lancamentos: cache.lancamentos,
        fornecedores: cache.fornecedores,
        contas: cache.contas,
        produtos: cache.produtos,
        empresa: cache.empresa,
        empresaId: cache.empresaId,
        loading,
        refreshLancamentos,
        refreshFornecedores,
        refreshContas,
        refreshProdutos,
        refreshAll,
        invalidateCache,
        initializeData,
        isInitialized,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
