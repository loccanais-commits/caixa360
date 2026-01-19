'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import { createClient } from '@/lib/supabase/client';
import { Lancamento, Conta, Fornecedor, Empresa, Produto } from '@/lib/types';

// Configuração global do SWR
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,      // Não recarrega ao voltar na aba
  revalidateOnReconnect: false,  // Não recarrega ao reconectar
  dedupingInterval: 10000,       // Deduplica requests em 10s
  errorRetryCount: 2,            // Tenta 2x em caso de erro
};

// Cliente Supabase singleton
const getSupabase = () => createClient();

// ============================================
// HOOKS CUSTOMIZADOS
// ============================================

/**
 * Hook para buscar empresa do usuário
 */
export function useEmpresa() {
  const { data, error, isLoading, mutate: refresh } = useSWR(
    'empresa',
    async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: empresa } = await supabase
        .from('empresas')
        .select('*')
        .eq('usuario_id', user.id)
        .single();
      
      return empresa as Empresa | null;
    },
    swrConfig
  );

  return {
    empresa: data,
    isLoading,
    error,
    refresh
  };
}

/**
 * Hook para buscar lançamentos
 */
export function useLancamentos(empresaId: string | null, mes?: number, ano?: number) {
  const currentDate = new Date();
  const mesAtual = mes ?? currentDate.getMonth() + 1;
  const anoAtual = ano ?? currentDate.getFullYear();
  
  const { data, error, isLoading, mutate: refresh } = useSWR(
    empresaId ? `lancamentos-${empresaId}-${mesAtual}-${anoAtual}` : null,
    async () => {
      const supabase = getSupabase();
      
      // Calcular período
      const inicioMes = new Date(anoAtual, mesAtual - 1, 1).toISOString().split('T')[0];
      const fimMes = new Date(anoAtual, mesAtual, 0).toISOString().split('T')[0];
      
      const { data: lancamentos } = await supabase
        .from('lancamentos')
        .select('*')
        .eq('empresa_id', empresaId)
        .gte('data', inicioMes)
        .lte('data', fimMes)
        .order('data', { ascending: false });
      
      return (lancamentos || []) as Lancamento[];
    },
    swrConfig
  );

  return {
    lancamentos: data || [],
    isLoading: isLoading && !data,
    error,
    refresh
  };
}

/**
 * Hook para buscar todos os lançamentos (sem filtro de mês)
 */
export function useAllLancamentos(empresaId: string | null) {
  const { data, error, isLoading, mutate: refresh } = useSWR(
    empresaId ? `all-lancamentos-${empresaId}` : null,
    async () => {
      const supabase = getSupabase();
      
      const { data: lancamentos } = await supabase
        .from('lancamentos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('data', { ascending: false });
      
      return (lancamentos || []) as Lancamento[];
    },
    swrConfig
  );

  return {
    lancamentos: data || [],
    isLoading: isLoading && !data,
    error,
    refresh
  };
}

/**
 * Hook para buscar contas a pagar/receber
 */
export function useContas(empresaId: string | null, tipo?: 'entrada' | 'saida') {
  const { data, error, isLoading, mutate: refresh } = useSWR(
    empresaId ? `contas-${empresaId}-${tipo || 'all'}` : null,
    async () => {
      const supabase = getSupabase();
      
      let query = supabase
        .from('contas')
        .select('*')
        .eq('empresa_id', empresaId)
        .in('status', ['pendente', 'atrasado'])
        .order('data_vencimento', { ascending: true });
      
      if (tipo) {
        query = query.eq('tipo', tipo);
      }
      
      const { data: contas } = await query;
      
      return (contas || []) as Conta[];
    },
    swrConfig
  );

  return {
    contas: data || [],
    isLoading: isLoading && !data,
    error,
    refresh
  };
}

/**
 * Hook para buscar fornecedores
 */
export function useFornecedores(empresaId: string | null) {
  const { data, error, isLoading, mutate: refresh } = useSWR(
    empresaId ? `fornecedores-${empresaId}` : null,
    async () => {
      const supabase = getSupabase();
      
      const { data: fornecedores } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');
      
      return (fornecedores || []) as Fornecedor[];
    },
    swrConfig
  );

  return {
    fornecedores: data || [],
    isLoading: isLoading && !data,
    error,
    refresh
  };
}

/**
 * Hook para buscar produtos
 */
export function useProdutos(empresaId: string | null) {
  const { data, error, isLoading, mutate: refresh } = useSWR(
    empresaId ? `produtos-${empresaId}` : null,
    async () => {
      const supabase = getSupabase();
      
      const { data: produtos } = await supabase
        .from('produtos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');
      
      return (produtos || []) as Produto[];
    },
    swrConfig
  );

  return {
    produtos: data || [],
    isLoading: isLoading && !data,
    error,
    refresh
  };
}

/**
 * Hook para dashboard - dados agregados
 */
export function useDashboardData(empresaId: string | null) {
  const { data, error, isLoading, mutate: refresh } = useSWR(
    empresaId ? `dashboard-${empresaId}` : null,
    async () => {
      const supabase = getSupabase();
      // Usar formatação local para evitar bug de timezone (UTC vs local)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      const hoje = `${year}-${month}-${day}`;
      const inicioMes = `${year}-${month}-01`;
      const fimMes = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      
      // Buscar tudo em paralelo
      const [
        { data: lancamentosMes },
        { data: contasPagar },
        { data: contasReceber },
        { data: contasAtrasadas },
        { data: todosLancamentos }
      ] = await Promise.all([
        // Lançamentos do mês
        supabase
          .from('lancamentos')
          .select('*')
          .eq('empresa_id', empresaId)
          .gte('data', inicioMes)
          .lte('data', fimMes)
          .order('data', { ascending: false }),
        
        // Contas a pagar (próximos 30 dias)
        supabase
          .from('contas')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('tipo', 'saida')
          .in('status', ['pendente', 'atrasado'])
          .gte('data_vencimento', hoje)
          .order('data_vencimento')
          .limit(10),
        
        // Contas a receber
        supabase
          .from('contas')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('tipo', 'entrada')
          .in('status', ['pendente'])
          .order('data_vencimento')
          .limit(10),
        
        // Contas atrasadas
        supabase
          .from('contas')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('status', 'atrasado'),
        
        // Todos os lançamentos (para gráficos)
        supabase
          .from('lancamentos')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('data', { ascending: false })
          .limit(500)
      ]);

      // Calcular métricas
      const entradas = (lancamentosMes || [])
        .filter((l: Lancamento) => l.tipo === 'entrada')
        .reduce((acc: number, l: Lancamento) => acc + Number(l.valor), 0);
      
      const saidas = (lancamentosMes || [])
        .filter((l: Lancamento) => l.tipo === 'saida')
        .reduce((acc: number, l: Lancamento) => acc + Number(l.valor), 0);
      
      const prolabore = (lancamentosMes || [])
        .filter((l: Lancamento) => l.categoria === 'prolabore')
        .reduce((acc: number, l: Lancamento) => acc + Number(l.valor), 0);

      return {
        lancamentosMes: lancamentosMes || [],
        todosLancamentos: todosLancamentos || [],
        contasPagar: contasPagar || [],
        contasReceber: contasReceber || [],
        contasAtrasadas: contasAtrasadas || [],
        metricas: {
          entradas,
          saidas,
          resultado: entradas - saidas,
          prolabore
        }
      };
    },
    { 
      ...swrConfig,
      revalidateOnFocus: false,
      dedupingInterval: 30000 // 30s para dashboard
    }
  );

  return {
    data,
    isLoading: isLoading && !data,
    error,
    refresh
  };
}

// ============================================
// FUNÇÕES DE INVALIDAÇÃO DE CACHE
// ============================================

/**
 * Invalida cache de lançamentos (chamar após criar/editar/deletar)
 */
export function invalidateLancamentos(empresaId: string) {
  // Invalida todos os caches relacionados a lançamentos
  mutate(key => typeof key === 'string' && (
    key.startsWith(`lancamentos-${empresaId}`) ||
    key.startsWith(`all-lancamentos-${empresaId}`) ||
    key.startsWith(`dashboard-${empresaId}`)
  ), undefined, { revalidate: true });
}

/**
 * Invalida cache de contas (chamar após criar/editar/deletar)
 */
export function invalidateContas(empresaId: string) {
  mutate(key => typeof key === 'string' && (
    key.startsWith(`contas-${empresaId}`) ||
    key.startsWith(`dashboard-${empresaId}`)
  ), undefined, { revalidate: true });
}

/**
 * Invalida cache de fornecedores
 */
export function invalidateFornecedores(empresaId: string) {
  mutate(`fornecedores-${empresaId}`, undefined, { revalidate: true });
}

/**
 * Invalida cache de produtos
 */
export function invalidateProdutos(empresaId: string) {
  mutate(`produtos-${empresaId}`, undefined, { revalidate: true });
}

/**
 * Invalida todo o cache do usuário
 */
export function invalidateAll(empresaId: string) {
  mutate(key => typeof key === 'string' && key.includes(empresaId), undefined, { revalidate: true });
}
