'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, Button, Input, Select, Badge, Modal, Loading, EmptyState } from '@/components/ui';
import { formatarMoeda, formatarDataCurta } from '@/lib/utils';
import { Fornecedor, Lancamento, Conta } from '@/lib/types';
import {
  Plus,
  Package,
  Search,
  Trash2,
  Edit,
  Phone,
  Mail,
  ChevronRight,
  TrendingDown,
  AlertTriangle,
  Clock
} from 'lucide-react';

export default function FornecedoresPage() {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [lancamentosPorFornecedor, setLancamentosPorFornecedor] = useState<Record<string, number>>({});
  const [contasPorFornecedor, setContasPorFornecedor] = useState<Record<string, number>>({});
  const [empresaId, setEmpresaId] = useState<string>('');
  
  // Filtros
  const [filtroBusca, setFiltroBusca] = useState('');
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [showEditLancamento, setShowEditLancamento] = useState(false);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);
  const [historicoFornecedor, setHistoricoFornecedor] = useState<Lancamento[]>([]);
  const [contasAPagarFornecedor, setContasAPagarFornecedor] = useState<Conta[]>([]);
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [lancamentoEditando, setLancamentoEditando] = useState<Lancamento | null>(null);
  
  // Form edição lançamento
  const [editDescricao, setEditDescricao] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editData, setEditData] = useState('');
  
  // Form
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [contato, setContato] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

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

    // Carregar fornecedores
    const { data: forns } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('nome');
    
    setFornecedores(forns || []);

    // Carregar totais de lançamentos por fornecedor
    const { data: lancamentos } = await supabase
      .from('lancamentos')
      .select('fornecedor_id, valor')
      .eq('empresa_id', empresa.id)
      .not('fornecedor_id', 'is', null);

    const totais: Record<string, number> = {};
    (lancamentos || []).forEach(l => {
      if (l.fornecedor_id) {
        totais[l.fornecedor_id] = (totais[l.fornecedor_id] || 0) + Number(l.valor);
      }
    });
    setLancamentosPorFornecedor(totais);

    // Carregar contas pendentes por fornecedor
    const { data: contas } = await supabase
      .from('contas')
      .select('fornecedor_id, valor')
      .eq('empresa_id', empresa.id)
      .in('status', ['pendente', 'atrasado'])
      .not('fornecedor_id', 'is', null);

    const contasTotais: Record<string, number> = {};
    (contas || []).forEach(c => {
      if (c.fornecedor_id) {
        contasTotais[c.fornecedor_id] = (contasTotais[c.fornecedor_id] || 0) + Number(c.valor);
      }
    });
    setContasPorFornecedor(contasTotais);
    
    setLoading(false);
  }

  async function carregarHistorico(fornecedor: Fornecedor) {
    // Buscar lançamentos pagos
    const { data: lancamentos } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('fornecedor_id', fornecedor.id)
      .order('data', { ascending: false })
      .limit(20);
    
    // Buscar contas a pagar pendentes
    const { data: contasAPagar } = await supabase
      .from('contas')
      .select('*')
      .eq('fornecedor_id', fornecedor.id)
      .in('status', ['pendente', 'atrasado'])
      .order('data_vencimento', { ascending: true });
    
    setHistoricoFornecedor(lancamentos || []);
    setContasAPagarFornecedor(contasAPagar || []);
    setFornecedorSelecionado(fornecedor);
    setShowDetalhes(true);
  }

  async function handleSalvar() {
    if (!nome || !empresaId) return;
    
    setSalvando(true);
    
    if (editando) {
      await supabase
        .from('fornecedores')
        .update({
          nome,
          categoria: categoria || null,
          contato: contato || null,
          telefone: telefone || null,
          email: email || null,
          observacao: observacao || null,
        })
        .eq('id', editando.id);
    } else {
      await supabase
        .from('fornecedores')
        .insert({
          empresa_id: empresaId,
          nome,
          categoria: categoria || null,
          contato: contato || null,
          telefone: telefone || null,
          email: email || null,
          observacao: observacao || null,
        });
    }
    
    setSalvando(false);
    setShowModal(false);
    limparForm();
    carregarDados();
  }

  async function handleExcluir(id: string) {
    if (!confirm('Deseja excluir este fornecedor? Os lançamentos vinculados não serão excluídos.')) return;
    
    await supabase.from('fornecedores').delete().eq('id', id);
    carregarDados();
  }

  // Funções para edição de lançamento no histórico
  function abrirEditarLancamento(lanc: Lancamento) {
    setLancamentoEditando(lanc);
    setEditDescricao(lanc.descricao);
    setEditValor(String(lanc.valor));
    setEditData(lanc.data);
    setShowEditLancamento(true);
  }

  async function salvarEdicaoLancamento() {
    if (!lancamentoEditando) return;
    
    setSalvando(true);
    
    await supabase
      .from('lancamentos')
      .update({
        descricao: editDescricao,
        valor: parseFloat(editValor) || 0,
        data: editData,
      })
      .eq('id', lancamentoEditando.id);
    
    // Recarregar histórico
    if (fornecedorSelecionado) {
      await carregarHistorico(fornecedorSelecionado);
    }
    
    setShowEditLancamento(false);
    setLancamentoEditando(null);
    setSalvando(false);
    carregarDados();
  }

  async function excluirLancamento(id: string) {
    if (!confirm('Deseja excluir este lançamento?')) return;
    
    await supabase.from('lancamentos').delete().eq('id', id);
    
    // Recarregar histórico
    if (fornecedorSelecionado) {
      await carregarHistorico(fornecedorSelecionado);
    }
    carregarDados();
  }

  function limparForm() {
    setEditando(null);
    setNome('');
    setCategoria('');
    setContato('');
    setTelefone('');
    setEmail('');
    setObservacao('');
  }

  function abrirEdicao(forn: Fornecedor) {
    setEditando(forn);
    setNome(forn.nome);
    setCategoria(forn.categoria || '');
    setContato(forn.contato || '');
    setTelefone(forn.telefone || '');
    setEmail(forn.email || '');
    setObservacao(forn.observacao || '');
    setShowModal(true);
  }

  // Filtrar fornecedores
  const fornecedoresFiltrados = fornecedores.filter(f => {
    if (filtroBusca && !f.nome.toLowerCase().includes(filtroBusca.toLowerCase())) return false;
    return true;
  });

  // Totais
  const totalCompras = Object.values(lancamentosPorFornecedor).reduce((a, b) => a + b, 0);
  const totalPendente = Object.values(contasPorFornecedor).reduce((a, b) => a + b, 0);

  if (loading) {
    return <AppLayout><Loading /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Fornecedores</h1>
            <p className="text-neutral-500">Gerencie seus fornecedores e compras</p>
          </div>
          <Button 
            variant="primary" 
            onClick={() => { limparForm(); setShowModal(true); }}
            className="bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Fornecedor
          </Button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-primary-50 to-cyan-50">
            <p className="text-xs sm:text-sm text-neutral-500">Total Fornecedores</p>
            <p className="text-xl sm:text-2xl font-bold text-primary-600">{fornecedores.length}</p>
          </Card>
          <Card className="bg-gradient-to-br from-saida-light to-red-50">
            <p className="text-xs sm:text-sm text-neutral-500">Total Comprado</p>
            <p className="text-xl sm:text-2xl font-bold text-saida-dark">{formatarMoeda(totalCompras)}</p>
          </Card>
          <Card className="bg-gradient-to-br from-alerta-light to-amber-50">
            <p className="text-xs sm:text-sm text-neutral-500">A Pagar</p>
            <p className="text-xl sm:text-2xl font-bold text-alerta-dark">{formatarMoeda(totalPendente)}</p>
          </Card>
          <Card>
            <p className="text-xs sm:text-sm text-neutral-500">Maior Fornecedor</p>
            <p className="text-sm sm:text-lg font-bold text-neutral-900 truncate">
              {fornecedores.length > 0 
                ? fornecedores.reduce((max, f) => 
                    (lancamentosPorFornecedor[f.id] || 0) > (lancamentosPorFornecedor[max.id] || 0) ? f : max
                  ).nome
                : '-'
              }
            </p>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <Input
            placeholder="Buscar fornecedor..."
            value={filtroBusca}
            onChange={(e) => setFiltroBusca(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </Card>

        {/* Lista */}
        <div className="grid gap-3 sm:gap-4">
          {fornecedoresFiltrados.length > 0 ? (
            fornecedoresFiltrados.map((forn) => (
              <Card key={forn.id} className="hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 sm:p-3 bg-primary-50 rounded-xl flex-shrink-0">
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-neutral-900 truncate">{forn.nome}</h3>
                      {forn.categoria && (
                        <Badge variant="info" className="mt-1 text-xs">{forn.categoria}</Badge>
                      )}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-neutral-500">
                        {forn.telefone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {forn.telefone}
                          </span>
                        )}
                        {forn.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{forn.email}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-left sm:text-right flex-shrink-0 pl-11 sm:pl-0">
                    <p className="text-xs sm:text-sm text-neutral-500">Total comprado</p>
                    <p className="text-base sm:text-lg font-bold text-neutral-900">
                      {formatarMoeda(lancamentosPorFornecedor[forn.id] || 0)}
                    </p>
                    {contasPorFornecedor[forn.id] > 0 && (
                      <Badge variant="alerta" className="mt-1 text-xs">
                        A pagar: {formatarMoeda(contasPorFornecedor[forn.id])}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-neutral-100">
                  <button 
                    onClick={() => carregarHistorico(forn)}
                    className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    Ver histórico
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicao(forn)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleExcluir(forn.id)} className="text-saida hover:bg-saida-light">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <EmptyState
                icon={<Package className="w-8 h-8" />}
                title="Nenhum fornecedor"
                description="Cadastre seus fornecedores para controlar melhor as compras"
                action={
                  <Button variant="primary" onClick={() => { limparForm(); setShowModal(true); }}>
                    <Plus className="w-4 h-4" />
                    Adicionar Fornecedor
                  </Button>
                }
              />
            </Card>
          )}
        </div>

        {/* Modal de cadastro/edição */}
        <Modal
          isOpen={showModal}
          onClose={() => { setShowModal(false); limparForm(); }}
          title={editando ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        >
          <div className="space-y-4">
            <Input
              label="Nome do fornecedor"
              placeholder="Ex: Distribuidora XYZ"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />

            <Input
              label="Categoria (opcional)"
              placeholder="Ex: Cosméticos, Alimentos, etc."
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />

            <Input
              label="Pessoa de contato (opcional)"
              placeholder="Nome do vendedor/representante"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Telefone"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                placeholder="fornecedor@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Input
              label="Observação"
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
                disabled={salvando || !nome}
                className="flex-1"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal de detalhes/histórico */}
        <Modal
          isOpen={showDetalhes}
          onClose={() => setShowDetalhes(false)}
          title={`Histórico - ${fornecedorSelecionado?.nome}`}
          size="lg"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Contas A Pagar */}
            {contasAPagarFornecedor.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-saida-dark flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  A Pagar ({contasAPagarFornecedor.length})
                </h4>
                {contasAPagarFornecedor.map((conta) => (
                  <div 
                    key={conta.id} 
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      conta.status === 'atrasado' ? 'bg-saida-light/50 border border-saida/20' : 'bg-alerta-light/50'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{conta.descricao}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-neutral-500">Vence: {formatarDataCurta(conta.data_vencimento)}</p>
                        {conta.status === 'atrasado' && (
                          <Badge variant="saida" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Atrasado
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="font-bold text-saida-dark">{formatarMoeda(Number(conta.valor))}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Histórico de compras */}
            {historicoFornecedor.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-neutral-700">
                  Compras realizadas ({historicoFornecedor.length})
                </h4>
                {historicoFornecedor.map((lanc) => (
                  <div key={lanc.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl group hover:bg-neutral-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">{lanc.descricao}</p>
                      <p className="text-sm text-neutral-500">{formatarDataCurta(lanc.data)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-neutral-700">{formatarMoeda(Number(lanc.valor))}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => abrirEditarLancamento(lanc)}
                          className="p-1.5 hover:bg-primary-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4 text-primary-600" />
                        </button>
                        <button
                          onClick={() => excluirLancamento(lanc.id)}
                          className="p-1.5 hover:bg-saida-light rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-saida" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {historicoFornecedor.length === 0 && contasAPagarFornecedor.length === 0 && (
              <EmptyState
                icon={<TrendingDown className="w-8 h-8" />}
                title="Nenhuma movimentação"
                description="As compras e contas aparecerão aqui quando você vincular a este fornecedor"
              />
            )}
          </div>
        </Modal>

        {/* Modal de edição de lançamento */}
        <Modal
          isOpen={showEditLancamento}
          onClose={() => { setShowEditLancamento(false); setLancamentoEditando(null); }}
          title="Editar Lançamento"
        >
          <div className="space-y-4">
            <Input
              label="Descrição"
              value={editDescricao}
              onChange={(e) => setEditDescricao(e.target.value)}
              placeholder="Descrição do lançamento"
            />
            <Input
              label="Valor"
              type="number"
              step="0.01"
              value={editValor}
              onChange={(e) => setEditValor(e.target.value)}
              placeholder="0,00"
            />
            <Input
              label="Data"
              type="date"
              value={editData}
              onChange={(e) => setEditData(e.target.value)}
            />
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowEditLancamento(false); setLancamentoEditando(null); }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={salvarEdicaoLancamento}
                disabled={salvando}
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
