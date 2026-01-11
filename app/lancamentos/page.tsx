'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, Button, Input, Select, Badge, Modal, Loading, EmptyState } from '@/components/ui';
import { formatarMoeda, formatarDataCurta } from '@/lib/utils';
import { Lancamento, Fornecedor, Conta, CATEGORIAS_BASE, TipoLancamento, Categoria } from '@/lib/types';
import {
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  Filter,
  Trash2,
  Edit,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  AlertTriangle
} from 'lucide-react';

export default function LancamentosPage() {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [aReceber, setAReceber] = useState<Conta[]>([]);
  const [empresaId, setEmpresaId] = useState<string>('');
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [erroData, setErroData] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Resumo do período
  const [entradasPeriodo, setEntradasPeriodo] = useState(0);
  const [saidasPeriodo, setSaidasPeriodo] = useState(0);
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Lancamento | null>(null);
  
  // Form
  const [tipo, setTipo] = useState<TipoLancamento>('saida');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('outros_despesas');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [fornecedorId, setFornecedorId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    calcularResumoPeriodo();
  }, [lancamentos, dataInicio, dataFim]);

  // Validar datas do filtro
  useEffect(() => {
    if (dataInicio && dataFim && dataInicio > dataFim) {
      setErroData('Data de início não pode ser depois da data de fim');
    } else {
      setErroData('');
    }
  }, [dataInicio, dataFim]);

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

    // Carregar lançamentos
    const { data: lancs } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('data', { ascending: false });
    
    setLancamentos(lancs || []);

    // Carregar fornecedores
    const { data: forns } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('empresa_id', empresa.id);
    
    setFornecedores(forns || []);

    // Carregar A Receber (entradas pendentes)
    const { data: contasReceber } = await supabase
      .from('contas')
      .select('*')
      .eq('empresa_id', empresa.id)
      .eq('tipo', 'entrada')
      .in('status', ['pendente', 'atrasado'])
      .order('data_vencimento', { ascending: true });
    
    setAReceber(contasReceber || []);
    
    setLoading(false);
  }

  function calcularResumoPeriodo() {
    const lancamentosFiltrados = lancamentos.filter(l => {
      if (dataInicio && l.data < dataInicio) return false;
      if (dataFim && l.data > dataFim) return false;
      return true;
    });
    const entradas = lancamentosFiltrados.filter(l => l.tipo === 'entrada').reduce((a, l) => a + Number(l.valor), 0);
    const saidas = lancamentosFiltrados.filter(l => l.tipo === 'saida').reduce((a, l) => a + Number(l.valor), 0);
    setEntradasPeriodo(entradas);
    setSaidasPeriodo(saidas);
  }

  async function handleSalvar() {
    if (!descricao || !valor || !empresaId) return;
    
    setSalvando(true);
    
    const valorNum = parseFloat(valor.replace(',', '.'));
    
    if (editando) {
      await supabase
        .from('lancamentos')
        .update({
          tipo,
          descricao,
          valor: valorNum,
          categoria,
          data,
          fornecedor_id: fornecedorId || null,
          observacao: observacao || null,
        })
        .eq('id', editando.id);
    } else {
      await supabase
        .from('lancamentos')
        .insert({
          empresa_id: empresaId,
          tipo,
          descricao,
          valor: valorNum,
          categoria,
          data,
          fornecedor_id: fornecedorId || null,
          observacao: observacao || null,
        });
    }
    
    setSalvando(false);
    setShowModal(false);
    limparForm();
    carregarDados();
  }

  async function handleExcluir(id: string) {
    if (!confirm('Deseja excluir este lançamento?')) return;
    
    await supabase.from('lancamentos').delete().eq('id', id);
    carregarDados();
  }

  function limparForm() {
    setEditando(null);
    setTipo('saida');
    setDescricao('');
    setValor('');
    setCategoria('outros_despesas');
    setData(new Date().toISOString().split('T')[0]);
    setFornecedorId('');
    setObservacao('');
  }

  function abrirEdicao(lanc: Lancamento) {
    setEditando(lanc);
    setTipo(lanc.tipo);
    setDescricao(lanc.descricao);
    setValor(lanc.valor.toString());
    setCategoria(lanc.categoria as Categoria);
    setData(lanc.data);
    setFornecedorId(lanc.fornecedor_id || '');
    setObservacao(lanc.observacao || '');
    setShowModal(true);
  }

  function abrirNovo(tipoNovo: TipoLancamento) {
    limparForm();
    setTipo(tipoNovo);
    setCategoria(tipoNovo === 'entrada' ? 'vendas' : 'outros_despesas');
    setShowModal(true);
  }

  // Filtrar lançamentos
  const lancamentosFiltrados = lancamentos.filter(l => {
    if (filtroTipo !== 'todos' && l.tipo !== filtroTipo) return false;
    if (filtroBusca && !l.descricao.toLowerCase().includes(filtroBusca.toLowerCase())) return false;
    if (filtroCategoria !== 'todas' && l.categoria !== filtroCategoria) return false;
    if (filtroFornecedor !== 'todos' && l.fornecedor_id !== filtroFornecedor) return false;
    if (dataInicio && l.data < dataInicio) return false;
    if (dataFim && l.data > dataFim) return false;
    return true;
  });

  // Categorias únicas nos lançamentos
  const categoriasUsadas = Array.from(new Set(lancamentos.map(l => l.categoria)));

  // Categorias por tipo
  const categoriasTipo = Object.entries(CATEGORIAS_BASE).filter(([_, c]) => c.tipo === tipo);

  // Calcular resumo dos filtrados
  const entradasFiltradas = lancamentosFiltrados.filter(l => l.tipo === 'entrada').reduce((a, l) => a + Number(l.valor), 0);
  const saidasFiltradas = lancamentosFiltrados.filter(l => l.tipo === 'saida').reduce((a, l) => a + Number(l.valor), 0);

  if (loading) {
    return <AppLayout><Loading /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Lançamentos</h1>
            <p className="text-neutral-500">Registre suas entradas e saídas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="entrada" onClick={() => abrirNovo('entrada')}>
              <ArrowUpCircle className="w-4 h-4" />
              Entrada
            </Button>
            <Button variant="saida" onClick={() => abrirNovo('saida')}>
              <ArrowDownCircle className="w-4 h-4" />
              Saída
            </Button>
          </div>
        </div>

        {/* Resumo */}
        <Card className="bg-gradient-to-r from-neutral-50 to-white">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-entrada-light/50 rounded-xl">
              <p className="text-xs text-neutral-500">Total Entradas</p>
              <p className="text-base sm:text-lg font-bold text-entrada-dark">+{formatarMoeda(entradasFiltradas)}</p>
            </div>
            <div className="p-3 bg-saida-light/50 rounded-xl">
              <p className="text-xs text-neutral-500">Total Saídas</p>
              <p className="text-base sm:text-lg font-bold text-saida-dark">-{formatarMoeda(saidasFiltradas)}</p>
            </div>
            <div className={`p-3 rounded-xl ${entradasFiltradas - saidasFiltradas >= 0 ? 'bg-entrada-light/50' : 'bg-saida-light/50'}`}>
              <p className="text-xs text-neutral-500">Saldo</p>
              <p className={`text-base sm:text-lg font-bold ${entradasFiltradas - saidasFiltradas >= 0 ? 'text-entrada-dark' : 'text-saida-dark'}`}>
                {formatarMoeda(entradasFiltradas - saidasFiltradas)}
              </p>
            </div>
          </div>
          <p className="text-xs text-neutral-400 text-center mt-2">
            {lancamentosFiltrados.length} lançamento(s) encontrado(s)
          </p>
        </Card>

        {/* A Receber */}
        {aReceber.length > 0 && (
          <Card className="bg-gradient-to-r from-entrada-light/30 to-emerald-50/30 border border-entrada/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-entrada-dark">
                <Clock className="w-5 h-5" />
                <span>A Receber</span>
                <Badge variant="entrada" className="ml-2">
                  {formatarMoeda(aReceber.reduce((a, c) => a + Number(c.valor), 0))}
                </Badge>
              </CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {aReceber.slice(0, 3).map((conta) => (
                <div key={conta.id} className="flex items-center justify-between p-2 bg-white/60 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ArrowUpCircle className="w-4 h-4 text-entrada flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-800 truncate">{conta.descricao}</p>
                      <p className="text-xs text-neutral-500">{formatarDataCurta(conta.data_vencimento)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-entrada-dark flex-shrink-0">
                    +{formatarMoeda(Number(conta.valor))}
                  </p>
                </div>
              ))}
              {aReceber.length > 3 && (
                <a href="/contas?tipo=entrada" className="text-xs text-entrada-dark hover:underline block text-center">
                  Ver mais {aReceber.length - 3} entradas pendentes →
                </a>
              )}
            </div>
          </Card>
        )}
          
        {/* Filtros */}
        <Card>
          <div className="flex flex-col gap-4">
            {/* Linha principal de filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Buscar lançamento..."
                  value={filtroBusca}
                  onChange={(e) => setFiltroBusca(e.target.value)}
                  icon={<Search className="w-4 h-4" />}
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  options={[
                    { value: 'todos', label: 'Todos' },
                    { value: 'entrada', label: '↑ Entradas' },
                    { value: 'saida', label: '↓ Saídas' },
                  ]}
                />
                <Button 
                  variant={mostrarFiltros ? 'primary' : 'outline'} 
                  size="sm"
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Filtros avançados */}
            {mostrarFiltros && (
              <div className="space-y-3 pt-4 border-t border-neutral-100">
                {/* Filtros de data */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Data início"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                  <Input
                    label="Data fim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>
                
                {/* Aviso de erro de data */}
                {erroData && (
                  <div className="flex items-center gap-2 p-2 bg-saida-light rounded-lg text-sm text-saida-dark">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{erroData}</span>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select
                    label="Categoria"
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                    options={[
                      { value: 'todas', label: 'Todas categorias' },
                      ...categoriasUsadas.map(cat => ({
                        value: cat,
                        label: CATEGORIAS_BASE[cat as keyof typeof CATEGORIAS_BASE]?.label || cat,
                      }))
                    ]}
                  />
                  {fornecedores.length > 0 && (
                    <Select
                      label="Fornecedor"
                      value={filtroFornecedor}
                      onChange={(e) => setFiltroFornecedor(e.target.value)}
                      options={[
                        { value: 'todos', label: 'Todos fornecedores' },
                        ...fornecedores.map(f => ({ value: f.id, label: f.nome }))
                      ]}
                    />
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setFiltroTipo('todos');
                      setFiltroCategoria('todas');
                      setFiltroFornecedor('todos');
                      setFiltroBusca('');
                      setDataInicio('');
                      setDataFim('');
                    }}
                    className="self-end"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Limpar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Lista */}
        <Card>
          {lancamentosFiltrados.length > 0 ? (
            <div className="space-y-3">
              {lancamentosFiltrados.map((lanc) => (
                <div 
                  key={lanc.id}
                  className="flex items-center justify-between p-3 sm:p-4 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${lanc.tipo === 'entrada' ? 'bg-entrada-light' : 'bg-saida-light'}`}>
                      {lanc.tipo === 'entrada' 
                        ? <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-entrada-dark" />
                        : <ArrowDownCircle className="w-4 h-4 sm:w-5 sm:h-5 text-saida-dark" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-900 truncate">{lanc.descricao}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-neutral-500">{formatarDataCurta(lanc.data)}</span>
                        <Badge variant={lanc.tipo === 'entrada' ? 'entrada' : 'saida'} className="text-xs">
                          {CATEGORIAS_BASE[lanc.categoria as keyof typeof CATEGORIAS_BASE]?.label || lanc.categoria}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <p className={`text-sm sm:text-lg font-bold ${lanc.tipo === 'entrada' ? 'text-entrada-dark' : 'text-saida-dark'}`}>
                      {lanc.tipo === 'entrada' ? '+' : '-'}{formatarMoeda(Number(lanc.valor))}
                    </p>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => abrirEdicao(lanc)}
                        className="p-1.5 sm:p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4 text-neutral-500" />
                      </button>
                      <button 
                        onClick={() => handleExcluir(lanc.id)}
                        className="p-1.5 sm:p-2 hover:bg-saida-light rounded-lg transition-colors"
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
              icon={<ArrowUpCircle className="w-8 h-8" />}
              title="Nenhum lançamento"
              description="Comece registrando suas entradas e saídas"
              action={
                <Button variant="primary" onClick={() => abrirNovo('entrada')}>
                  <Plus className="w-4 h-4" />
                  Novo lançamento
                </Button>
              }
            />
          )}
        </Card>

        {/* Modal de cadastro/edição */}
        <Modal
          isOpen={showModal}
          onClose={() => { setShowModal(false); limparForm(); }}
          title={editando ? 'Editar Lançamento' : 'Novo Lançamento'}
        >
          <div className="space-y-4">
            {/* Tipo */}
            <div className="flex gap-2">
              <button
                onClick={() => { setTipo('entrada'); setCategoria('vendas'); }}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  tipo === 'entrada' 
                    ? 'bg-entrada text-white' 
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <ArrowUpCircle className="w-5 h-5 inline mr-2" />
                Entrada
              </button>
              <button
                onClick={() => { setTipo('saida'); setCategoria('outros_despesas'); }}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  tipo === 'saida' 
                    ? 'bg-saida text-white' 
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <ArrowDownCircle className="w-5 h-5 inline mr-2" />
                Saída
              </button>
            </div>

            <Input
              label="Descrição"
              placeholder="Ex: Venda para cliente X"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
            />

            <Input
              label="Valor (R$)"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
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
              label="Data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
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
                variant={tipo === 'entrada' ? 'entrada' : 'saida'} 
                onClick={handleSalvar}
                disabled={salvando || !descricao || !valor}
                className="flex-1"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
