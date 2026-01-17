'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, Button, Input, Select, Badge, Modal, Loading, EmptyState, CurrencyInput, currencyToNumber, ConfirmModal } from '@/components/ui';
import { formatarMoeda, formatarDataCurta, isAtrasado } from '@/lib/utils';
import { Conta, Fornecedor, CATEGORIAS_BASE, TipoLancamento, Categoria, StatusConta } from '@/lib/types';
import {
  Plus,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  Trash2,
  Edit,
  Check,
  AlertTriangle,
  Clock,
  Filter
} from 'lucide-react';

export default function ContasPage() {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState<Conta[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [empresaId, setEmpresaId] = useState<string>('');
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('pendentes');
  const [filtroBusca, setFiltroBusca] = useState('');
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Conta | null>(null);
  
  // Form
  const [tipo, setTipo] = useState<TipoLancamento>('saida');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('outros_despesas');
  const [dataVencimento, setDataVencimento] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [recorrente, setRecorrente] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Confirm Modal
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; conta: Conta | null }>({
    isOpen: false,
    conta: null,
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: empresa } = await supabase
      .from('empresas')
      .select('id')
      .eq('usuario_id', user.id)
      .single();
    
    if (!empresa) return;
    setEmpresaId(empresa.id);

    // Atualizar status de contas atrasadas
    const hoje = new Date().toISOString().split('T')[0];
    await supabase
      .from('contas')
      .update({ status: 'atrasado' })
      .eq('empresa_id', empresa.id)
      .eq('status', 'pendente')
      .lt('data_vencimento', hoje);

    // Carregar contas
    const { data: cts } = await supabase
      .from('contas')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('data_vencimento', { ascending: true });
    
    setContas(cts || []);

    // Carregar fornecedores
    const { data: forns } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('empresa_id', empresa.id);
    
    setFornecedores(forns || []);
    
    setLoading(false);
  }

  async function handleSalvar() {
    if (!descricao || !valor || !dataVencimento || !empresaId) return;

    setSalvando(true);

    const valorNum = currencyToNumber(valor);
    
    if (editando) {
      await supabase
        .from('contas')
        .update({
          tipo,
          descricao,
          valor: valorNum,
          categoria,
          data_vencimento: dataVencimento,
          fornecedor_id: fornecedorId || null,
          recorrente,
          observacao: observacao || null,
        })
        .eq('id', editando.id);
    } else {
      await supabase
        .from('contas')
        .insert({
          empresa_id: empresaId,
          tipo,
          descricao,
          valor: valorNum,
          categoria,
          data_vencimento: dataVencimento,
          status: 'pendente',
          fornecedor_id: fornecedorId || null,
          recorrente,
          observacao: observacao || null,
        });
    }
    
    setSalvando(false);
    setShowModal(false);
    limparForm();
    carregarDados();
  }

  async function handleMarcarPago(conta: Conta) {
    const hoje = new Date().toISOString().split('T')[0];
    
    // Atualizar status da conta
    await supabase
      .from('contas')
      .update({ 
        status: 'pago',
        data_pagamento: hoje,
      })
      .eq('id', conta.id);

    // Criar lançamento correspondente
    await supabase.from('lancamentos').insert({
      empresa_id: conta.empresa_id,
      tipo: conta.tipo,
      descricao: conta.descricao,
      valor: conta.valor,
      categoria: conta.categoria,
      data: hoje,
      fornecedor_id: conta.fornecedor_id,
      observacao: `Pagamento de conta - Vencimento: ${formatarDataCurta(conta.data_vencimento)}`,
    });

    carregarDados();
  }

  async function handleExcluir(conta: Conta) {
    setConfirmDelete({ isOpen: true, conta });
  }

  async function confirmarExclusao() {
    if (!confirmDelete.conta) return;
    await supabase.from('contas').delete().eq('id', confirmDelete.conta.id);
    setConfirmDelete({ isOpen: false, conta: null });
    carregarDados();
  }

  function limparForm() {
    setEditando(null);
    setTipo('saida');
    setDescricao('');
    setValor('');
    setCategoria('outros_despesas');
    setDataVencimento('');
    setFornecedorId('');
    setRecorrente(false);
    setObservacao('');
  }

  function abrirEdicao(conta: Conta) {
    setEditando(conta);
    setTipo(conta.tipo);
    setDescricao(conta.descricao);
    // Formatar como moeda para o CurrencyInput
    setValor(Number(conta.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setCategoria(conta.categoria as Categoria);
    setDataVencimento(conta.data_vencimento);
    setFornecedorId(conta.fornecedor_id || '');
    setRecorrente(conta.recorrente);
    setObservacao(conta.observacao || '');
    setShowModal(true);
  }

  // Filtrar contas
  const contasFiltradas = contas.filter(c => {
    if (filtroTipo !== 'todos' && c.tipo !== filtroTipo) return false;
    if (filtroStatus === 'pendentes' && !['pendente', 'atrasado'].includes(c.status)) return false;
    if (filtroStatus === 'atrasadas' && c.status !== 'atrasado') return false;
    if (filtroStatus === 'pagas' && c.status !== 'pago') return false;
    if (filtroBusca && !c.descricao.toLowerCase().includes(filtroBusca.toLowerCase())) return false;
    return true;
  });

  // Totais
  const totalAPagar = contas.filter(c => c.tipo === 'saida' && ['pendente', 'atrasado'].includes(c.status)).reduce((a, c) => a + Number(c.valor), 0);
  const totalAReceber = contas.filter(c => c.tipo === 'entrada' && ['pendente', 'atrasado'].includes(c.status)).reduce((a, c) => a + Number(c.valor), 0);
  const totalAtrasado = contas.filter(c => c.status === 'atrasado').reduce((a, c) => a + Number(c.valor), 0);
  const totalPago = contas.filter(c => c.status === 'pago').reduce((a, c) => a + Number(c.valor), 0);
  const qtdPagas = contas.filter(c => c.status === 'pago').length;

  // Categorias por tipo
  const categoriasTipo = Object.entries(CATEGORIAS_BASE).filter(([_, c]) => c.tipo === tipo);

  const getStatusBadge = (status: StatusConta) => {
    switch (status) {
      case 'pago':
        return <Badge variant="entrada"><Check className="w-3 h-3 mr-1" />Pago</Badge>;
      case 'atrasado':
        return <Badge variant="saida"><AlertTriangle className="w-3 h-3 mr-1" />Atrasado</Badge>;
      case 'cancelado':
        return <Badge variant="default">Cancelado</Badge>;
      default:
        return <Badge variant="alerta"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  if (loading) {
    return <AppLayout><Loading /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Contas</h1>
            <p className="text-neutral-500">Gerencie suas contas a pagar e receber</p>
          </div>
          <Button 
            variant="primary" 
            onClick={() => { limparForm(); setShowModal(true); }}
            className="bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova Conta
          </Button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-saida-light to-red-50">
            <p className="text-xs sm:text-sm text-neutral-500">A Pagar</p>
            <p className="text-lg sm:text-2xl font-bold text-saida-dark">{formatarMoeda(totalAPagar)}</p>
          </Card>
          <Card className="bg-gradient-to-br from-entrada-light to-emerald-50">
            <p className="text-xs sm:text-sm text-neutral-500">A Receber</p>
            <p className="text-lg sm:text-2xl font-bold text-entrada-dark">{formatarMoeda(totalAReceber)}</p>
          </Card>
          <Card className="bg-gradient-to-br from-alerta-light to-amber-50">
            <p className="text-xs sm:text-sm text-neutral-500">Atrasadas</p>
            <p className="text-lg sm:text-2xl font-bold text-alerta-dark">{formatarMoeda(totalAtrasado)}</p>
          </Card>
          <Card className="bg-gradient-to-br from-primary-50 to-cyan-50">
            <p className="text-xs sm:text-sm text-neutral-500">Pagas ({qtdPagas})</p>
            <p className="text-lg sm:text-2xl font-bold text-primary-600">{formatarMoeda(totalPago)}</p>
          </Card>
          <Card>
            <p className="text-xs sm:text-sm text-neutral-500">Balanço</p>
            <p className={`text-lg sm:text-2xl font-bold ${totalAReceber - totalAPagar >= 0 ? 'text-entrada-dark' : 'text-saida-dark'}`}>
              {formatarMoeda(totalAReceber - totalAPagar)}
            </p>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar conta..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              options={[
                { value: 'todos', label: 'Todos os tipos' },
                { value: 'saida', label: 'A pagar' },
                { value: 'entrada', label: 'A receber' },
              ]}
            />
            <Select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              options={[
                { value: 'pendentes', label: 'Pendentes' },
                { value: 'atrasadas', label: 'Atrasadas' },
                { value: 'pagas', label: 'Pagas' },
                { value: 'todos', label: 'Todas' },
              ]}
            />
          </div>
        </Card>

        {/* Lista */}
        <Card>
          {contasFiltradas.length > 0 ? (
            <div className="space-y-3">
              {contasFiltradas.map((conta) => (
                <div 
                  key={conta.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-xl transition-colors gap-3 ${
                    conta.status === 'atrasado' 
                      ? 'bg-saida-light/50 border border-saida/20' 
                      : conta.status === 'pago'
                      ? 'bg-entrada-light/30'
                      : 'bg-neutral-50 hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${conta.tipo === 'entrada' ? 'bg-entrada-light' : 'bg-saida-light'}`}>
                      {conta.tipo === 'entrada' 
                        ? <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-entrada-dark" />
                        : <ArrowDownCircle className="w-4 h-4 sm:w-5 sm:h-5 text-saida-dark" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-900 text-sm sm:text-base truncate">{conta.descricao}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs sm:text-sm text-neutral-500">
                          {conta.tipo === 'entrada' ? 'Receber' : 'Pagar'} {formatarDataCurta(conta.data_vencimento)}
                        </span>
                        {getStatusBadge(conta.status)}
                        {conta.recorrente && (
                          <Badge variant="info" className="text-xs">Recorrente</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-10 sm:pl-0">
                    <p className={`text-base sm:text-lg font-bold ${conta.tipo === 'entrada' ? 'text-entrada-dark' : 'text-saida-dark'}`}>
                      {formatarMoeda(Number(conta.valor))}
                    </p>
                    <div className="flex gap-1">
                      {conta.status !== 'pago' && (
                        <button 
                          onClick={() => handleMarcarPago(conta)}
                          className="p-2 hover:bg-entrada-light rounded-lg transition-colors"
                          title="Marcar como pago"
                        >
                          <Check className="w-4 h-4 text-entrada" />
                        </button>
                      )}
                      <button 
                        onClick={() => abrirEdicao(conta)}
                        className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4 text-neutral-500" />
                      </button>
                      <button 
                        onClick={() => handleExcluir(conta)}
                        className="p-2 hover:bg-saida-light rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-saida" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Calendar className="w-8 h-8" />}
              title="Nenhuma conta encontrada"
              description="Cadastre suas contas a pagar e receber"
              action={
                <Button variant="primary" onClick={() => { limparForm(); setShowModal(true); }}>
                  <Plus className="w-4 h-4" />
                  Nova Conta
                </Button>
              }
            />
          )}
        </Card>

        {/* Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => { setShowModal(false); limparForm(); }}
          title={editando ? 'Editar Conta' : 'Nova Conta'}
        >
          <div className="space-y-4">
            {/* Tipo */}
            <div className="flex gap-2">
              <button
                onClick={() => { setTipo('saida'); setCategoria('outros_despesas'); }}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  tipo === 'saida' 
                    ? 'bg-saida text-white' 
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <ArrowDownCircle className="w-5 h-5 inline mr-2" />
                A Pagar
              </button>
              <button
                onClick={() => { setTipo('entrada'); setCategoria('vendas'); }}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  tipo === 'entrada' 
                    ? 'bg-entrada text-white' 
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <ArrowUpCircle className="w-5 h-5 inline mr-2" />
                A Receber
              </button>
            </div>

            <Input
              label="Descrição"
              placeholder="Ex: Conta de luz, Aluguel..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
            />

            <CurrencyInput
              label="Valor"
              value={valor}
              onChange={setValor}
              required
            />

            <Select
              label="Categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as Categoria)}
              options={categoriasTipo.map(([key, cat]) => ({
                value: key,
                label: `${cat.icone} ${cat.label}`,
              }))}
            />

            <Input
              label="Data de vencimento"
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              required
            />

            {tipo === 'saida' && fornecedores.length > 0 && (
              <Select
                label="Fornecedor (opcional)"
                value={fornecedorId}
                onChange={(e) => setFornecedorId(e.target.value)}
                options={[
                  { value: '', label: 'Selecione...' },
                  ...fornecedores.map(f => ({ value: f.id, label: f.nome }))
                ]}
              />
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recorrente}
                onChange={(e) => setRecorrente(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-700">Conta recorrente (mensal)</span>
            </label>

            <Input
              label="Observação (opcional)"
              placeholder="Alguma anotação..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />

            <div className="flex gap-2 pt-4">
              <Button variant="ghost" onClick={() => { setShowModal(false); limparForm(); }} className="flex-1">
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSalvar}
                disabled={salvando || !descricao || !valor || !dataVencimento}
                className="flex-1"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Confirm Delete Modal */}
        <ConfirmModal
          isOpen={confirmDelete.isOpen}
          onClose={() => setConfirmDelete({ isOpen: false, conta: null })}
          onConfirm={confirmarExclusao}
          title="Excluir conta"
          message={`Tem certeza que deseja excluir a conta "${confirmDelete.conta?.descricao}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          variant="danger"
        />
      </div>
    </AppLayout>
  );
}
