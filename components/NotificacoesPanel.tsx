'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatarMoeda, formatarDataCurta } from '@/lib/utils';
import { Notificacao, Conta } from '@/lib/types';
import { Bell, X, Check, AlertTriangle, Clock, Calendar, Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface NotificacoesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
}

export function NotificacoesPanel({ isOpen, onClose, empresaId }: NotificacoesPanelProps) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [contasProximas, setContasProximas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && empresaId) {
      carregarNotificacoes();
    }
  }, [isOpen, empresaId]);

  async function carregarNotificacoes() {
    setLoading(true);

    // Buscar notificações não lidas
    const { data: notifs } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('lida', false)
      .order('created_at', { ascending: false })
      .limit(20);

    setNotificacoes(notifs || []);

    // Buscar configuração de dias de alerta
    const { data: config } = await supabase
      .from('configuracoes')
      .select('alerta_dias_antes')
      .eq('empresa_id', empresaId)
      .single();

    const diasAlerta = config?.alerta_dias_antes || 3;

    // Calcular data limite
    const hoje = new Date();
    const dataLimite = new Date(hoje);
    dataLimite.setDate(dataLimite.getDate() + diasAlerta);

    // Buscar contas que vencem nos próximos X dias
    const { data: contas } = await supabase
      .from('contas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('status', 'pendente')
      .lte('data_vencimento', dataLimite.toISOString().split('T')[0])
      .order('data_vencimento', { ascending: true });

    setContasProximas(contas || []);
    setLoading(false);

    // Criar notificações para contas próximas (se não existirem)
    if (contas && contas.length > 0) {
      for (const conta of contas) {
        const venceHoje = conta.data_vencimento === hoje.toISOString().split('T')[0];
        const venceAmanha = conta.data_vencimento === new Date(hoje.getTime() + 86400000).toISOString().split('T')[0];
        
        // Verificar se já existe notificação
        const jaExiste = notifs?.some(n => n.conta_id === conta.id);
        
        if (!jaExiste) {
          let titulo = '';
          let tipo: 'conta_vencer' | 'conta_atrasada' = 'conta_vencer';
          
          if (conta.status === 'atrasado') {
            titulo = '⚠️ Conta atrasada!';
            tipo = 'conta_atrasada';
          } else if (venceHoje) {
            titulo = '⏰ Conta vence HOJE!';
          } else if (venceAmanha) {
            titulo = '📅 Conta vence amanhã';
          } else {
            const diasRestantes = Math.ceil((new Date(conta.data_vencimento).getTime() - hoje.getTime()) / 86400000);
            titulo = `📋 Conta vence em ${diasRestantes} dias`;
          }

          // Inserir notificação
          await supabase.from('notificacoes').insert({
            empresa_id: empresaId,
            tipo,
            titulo,
            mensagem: `${conta.descricao} - ${formatarMoeda(Number(conta.valor))}`,
            conta_id: conta.id,
            data_referencia: conta.data_vencimento,
          });
        }
      }

      // Recarregar notificações após criar novas
      const { data: notifsAtualizadas } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('lida', false)
        .order('created_at', { ascending: false })
        .limit(20);

      setNotificacoes(notifsAtualizadas || []);
    }
  }

  async function marcarComoLida(id: string) {
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id);

    setNotificacoes(prev => prev.filter(n => n.id !== id));
  }

  async function marcarTodasComoLidas() {
    const ids = notificacoes.map(n => n.id);
    if (ids.length === 0) return;

    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .in('id', ids);

    setNotificacoes([]);
  }

  const getIcone = (tipo: string) => {
    switch (tipo) {
      case 'conta_atrasada':
        return <AlertTriangle className="w-5 h-5 text-saida" />;
      case 'conta_vencer':
        return <Clock className="w-5 h-5 text-alerta-dark" />;
      case 'meta_atingida':
        return <Sparkles className="w-5 h-5 text-entrada" />;
      default:
        return <Bell className="w-5 h-5 text-neutral-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Panel */}
      <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-neutral-200 z-50 max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <h3 className="font-semibold text-neutral-900">Notificações</h3>
          {notificacoes.length > 0 && (
            <button 
              onClick={marcarTodasComoLidas}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
          {loading ? (
            <div className="p-8 text-center text-neutral-500">
              Carregando...
            </div>
          ) : notificacoes.length === 0 && contasProximas.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500">Nenhuma notificação</p>
              <p className="text-xs text-neutral-400 mt-1">
                Você será notificado sobre contas a vencer
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {/* Contas atrasadas primeiro */}
              {contasProximas.filter(c => c.status === 'atrasado').map((conta) => (
                <div 
                  key={`conta-${conta.id}`}
                  className="p-4 bg-saida-light/30 hover:bg-saida-light/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-saida flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-saida-dark">Conta ATRASADA!</p>
                      <p className="text-sm text-neutral-700 truncate">{conta.descricao}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-neutral-500">
                          Venceu {formatarDataCurta(conta.data_vencimento)}
                        </span>
                        <span className="font-bold text-saida-dark">
                          {formatarMoeda(Number(conta.valor))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Contas que vencem hoje */}
              {contasProximas.filter(c => {
                const hoje = new Date().toISOString().split('T')[0];
                return c.data_vencimento === hoje && c.status !== 'atrasado';
              }).map((conta) => (
                <div 
                  key={`conta-${conta.id}`}
                  className="p-4 bg-alerta-light/30 hover:bg-alerta-light/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-alerta-dark flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-alerta-dark">Vence HOJE!</p>
                      <p className="text-sm text-neutral-700 truncate">{conta.descricao}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-neutral-500">
                          {conta.tipo === 'entrada' ? 'A receber' : 'A pagar'}
                        </span>
                        <span className="font-bold text-neutral-900">
                          {formatarMoeda(Number(conta.valor))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Outras contas próximas */}
              {contasProximas.filter(c => {
                const hoje = new Date().toISOString().split('T')[0];
                return c.data_vencimento > hoje && c.status !== 'atrasado';
              }).map((conta) => (
                <div 
                  key={`conta-${conta.id}`}
                  className="p-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-700">
                        Vence {formatarDataCurta(conta.data_vencimento)}
                      </p>
                      <p className="text-sm text-neutral-600 truncate">{conta.descricao}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-neutral-500">
                          {conta.tipo === 'entrada' ? 'A receber' : 'A pagar'}
                        </span>
                        <span className="font-medium text-neutral-900">
                          {formatarMoeda(Number(conta.valor))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Notificações salvas */}
              {notificacoes.filter(n => !contasProximas.some(c => c.id === n.conta_id)).map((notif) => (
                <div 
                  key={notif.id}
                  className="p-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {getIcone(notif.tipo)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900">{notif.titulo}</p>
                      <p className="text-sm text-neutral-600 truncate">{notif.mensagem}</p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {formatarDataCurta(notif.created_at)}
                      </p>
                    </div>
                    <button 
                      onClick={() => marcarComoLida(notif.id)}
                      className="p-1 hover:bg-neutral-200 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-neutral-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Hook para contar notificações
export function useNotificacoesCount(empresaId: string) {
  const [count, setCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (!empresaId) return;

    async function buscarCount() {
      // Buscar configuração
      const { data: config } = await supabase
        .from('configuracoes')
        .select('alerta_dias_antes')
        .eq('empresa_id', empresaId)
        .single();

      const diasAlerta = config?.alerta_dias_antes || 3;

      // Calcular data limite
      const hoje = new Date();
      const dataLimite = new Date(hoje);
      dataLimite.setDate(dataLimite.getDate() + diasAlerta);

      // Contar contas que vencem em breve + atrasadas
      const { count: contasCount } = await supabase
        .from('contas')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .in('status', ['pendente', 'atrasado'])
        .lte('data_vencimento', dataLimite.toISOString().split('T')[0]);

      setCount(contasCount || 0);
    }

    buscarCount();

    // Atualizar a cada 5 minutos
    const interval = setInterval(buscarCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [empresaId]);

  return count;
}
