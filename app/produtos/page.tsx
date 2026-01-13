'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, Button, Input, Select, Badge, Modal, Loading, EmptyState } from '@/components/ui';
import { formatarMoeda } from '@/lib/utils';
import { Produto, TipoProduto } from '@/lib/types';
import {
  Plus,
  ShoppingBag,
  Search,
  Trash2,
  Edit,
  Package,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  BarChart3
} from 'lucide-react';

export default function ProdutosPage() {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendasPorProduto, setVendasPorProduto] = useState<Record<string, { qtd: number; total: number }>>({});
  const [empresaId, setEmpresaId] = useState<string>('');
  
  // Filtros
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoProduto>('todos');
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  
  // Form
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoProduto>('servico');
  const [preco, setPreco] = useState('');
  const [custo, setCusto] = useState('');
  const [estoque, setEstoque] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [fornecedores, setFornecedores] = useState<any[]>([]);
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

    // Carregar produtos e fornecedores em paralelo
    const [produtosRes, fornecedoresRes] = await Promise.all([
      supabase.from('produtos').select('*').eq('empresa_id', empresa.id).order('nome'),
      supabase.from('fornecedores').select('id, nome').eq('empresa_id', empresa.id).order('nome')
    ]);
    
    setProdutos(produtosRes.data || []);
    setFornecedores(fornecedoresRes.data || []);

    // Carregar vendas por produto (lançamentos vinculados)
    const { data: lancamentos } = await supabase
      .from('lancamentos')
      .select('produto_id, valor')
      .eq('empresa_id', empresa.id)
      .eq('tipo', 'entrada')
      .not('produto_id', 'is', null);

    const vendas: Record<string, { qtd: number; total: number }> = {};
    lancamentos?.forEach(l => {
      if (l.produto_id) {
        if (!vendas[l.produto_id]) {
          vendas[l.produto_id] = { qtd: 0, total: 0 };
        }
        vendas[l.produto_id].qtd += 1;
        vendas[l.produto_id].total += Number(l.valor);
      }
    });
    setVendasPorProduto(vendas);

    setLoading(false);
  }

  async function handleSalvar() {
    if (!nome.trim() || !preco) {
      alert('Preencha nome e preço');
      return;
    }

    setSalvando(true);

    const dados = {
      empresa_id: empresaId,
      nome: nome.trim(),
      tipo,
      preco: parseFloat(preco) || 0,
      custo: custo ? parseFloat(custo) : null,
      estoque: tipo === 'produto' && estoque ? parseInt(estoque) : null,
      estoque_minimo: tipo === 'produto' && estoqueMinimo ? parseInt(estoqueMinimo) : null,
      categoria: categoria || null,
      descricao: descricao || null,
      fornecedor_id: fornecedorId || null,
      ativo: true,
    };

    if (editando) {
      await supabase
        .from('produtos')
        .update(dados)
        .eq('id', editando.id);
    } else {
      await supabase.from('produtos').insert(dados);
    }

    setSalvando(false);
    setShowModal(false);
    limparForm();
    carregarDados();
  }

  async function handleExcluir(id: string) {
    if (!confirm('Deseja excluir este item? O histórico de vendas será mantido.')) return;
    
    await supabase.from('produtos').delete().eq('id', id);
    carregarDados();
  }

  async function toggleAtivo(produto: Produto) {
    await supabase
      .from('produtos')
      .update({ ativo: !produto.ativo })
      .eq('id', produto.id);
    carregarDados();
  }

  function limparForm() {
    setEditando(null);
    setNome('');
    setTipo('servico');
    setPreco('');
    setCusto('');
    setEstoque('');
    setEstoqueMinimo('');
    setCategoria('');
    setDescricao('');
    setFornecedorId('');
  }

  function abrirEdicao(prod: Produto) {
    setEditando(prod);
    setNome(prod.nome);
    setTipo(prod.tipo);
    setPreco(String(prod.preco));
    setCusto(prod.custo ? String(prod.custo) : '');
    setEstoque(prod.estoque ? String(prod.estoque) : '');
    setEstoqueMinimo(prod.estoque_minimo ? String(prod.estoque_minimo) : '');
    setCategoria(prod.categoria || '');
    setDescricao(prod.descricao || '');
    setFornecedorId(prod.fornecedor_id || '');
    setShowModal(true);
  }

  // Filtrar produtos
  const produtosFiltrados = produtos.filter(p => {
    if (filtroBusca && !p.nome.toLowerCase().includes(filtroBusca.toLowerCase())) return false;
    if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false;
    return true;
  });

  // Totais
  const totalProdutos = produtos.filter(p => p.tipo === 'produto').length;
  const totalServicos = produtos.filter(p => p.tipo === 'servico').length;
  const produtosEstoqueBaixo = produtos.filter(p => 
    p.tipo === 'produto' && 
    p.estoque !== null && 
    p.estoque_minimo !== null && 
    p.estoque <= p.estoque_minimo
  ).length;

  // Calcular lucro potencial
  const calcularLucro = (prod: Produto) => {
    if (!prod.custo) return null;
    return prod.preco - prod.custo;
  };

  const calcularMargemLucro = (prod: Produto) => {
    if (!prod.custo || prod.preco === 0) return null;
    return ((prod.preco - prod.custo) / prod.preco) * 100;
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
            <h1 className="text-2xl font-bold text-neutral-900">Produtos e Serviços</h1>
            <p className="text-neutral-500">Cadastre o que você vende para acompanhar melhor</p>
          </div>
          <Button 
            variant="primary" 
            onClick={() => { limparForm(); setShowModal(true); }}
            className="bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Item
          </Button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-primary-50 to-cyan-50">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-600" />
              <p className="text-xs sm:text-sm text-neutral-500">Produtos</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-primary-600">{totalProdutos}</p>
          </Card>
          <Card className="bg-gradient-to-br from-secondary-50 to-teal-50">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-secondary-600" />
              <p className="text-xs sm:text-sm text-neutral-500">Serviços</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-secondary-600">{totalServicos}</p>
          </Card>
          <Card className={`bg-gradient-to-br ${produtosEstoqueBaixo > 0 ? 'from-saida-light to-red-50' : 'from-entrada-light to-emerald-50'}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${produtosEstoqueBaixo > 0 ? 'text-saida' : 'text-entrada'}`} />
              <p className="text-xs sm:text-sm text-neutral-500">Estoque Baixo</p>
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${produtosEstoqueBaixo > 0 ? 'text-saida-dark' : 'text-entrada-dark'}`}>
              {produtosEstoqueBaixo}
            </p>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar produto ou serviço..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFiltroTipo('todos')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filtroTipo === 'todos'
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroTipo('produto')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filtroTipo === 'produto'
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Produtos
              </button>
              <button
                onClick={() => setFiltroTipo('servico')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filtroTipo === 'servico'
                    ? 'bg-secondary-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Serviços
              </button>
            </div>
          </div>
        </Card>

        {/* Lista */}
        <Card>
          {produtosFiltrados.length > 0 ? (
            <div className="space-y-3">
              {produtosFiltrados.map((prod) => {
                const vendas = vendasPorProduto[prod.id];
                const lucro = calcularLucro(prod);
                const margem = calcularMargemLucro(prod);
                const estoqueBaixo = prod.tipo === 'produto' && 
                  prod.estoque !== null && 
                  prod.estoque_minimo !== null && 
                  prod.estoque <= prod.estoque_minimo;

                return (
                  <div 
                    key={prod.id} 
                    className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                      !prod.ativo 
                        ? 'bg-neutral-50 border-neutral-200 opacity-60' 
                        : estoqueBaixo
                        ? 'bg-saida-light/30 border-saida/20'
                        : 'bg-white border-neutral-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          prod.tipo === 'produto' 
                            ? 'bg-primary-100 text-primary-600' 
                            : 'bg-secondary-100 text-secondary-600'
                        }`}>
                          {prod.tipo === 'produto' ? <Package className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-neutral-900">{prod.nome}</h3>
                            <Badge variant={prod.tipo === 'produto' ? 'primary' : 'neutral'} className="text-xs">
                              {prod.tipo === 'produto' ? 'Produto' : 'Serviço'}
                            </Badge>
                            {!prod.ativo && (
                              <Badge variant="neutral" className="text-xs">Inativo</Badge>
                            )}
                            {estoqueBaixo && (
                              <Badge variant="saida" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Estoque baixo
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-neutral-500">
                            <span className="font-semibold text-neutral-900">{formatarMoeda(prod.preco)}</span>
                            {prod.custo && (
                              <span>Custo: {formatarMoeda(prod.custo)}</span>
                            )}
                            {lucro !== null && (
                              <span className="text-entrada-dark">
                                Lucro: {formatarMoeda(lucro)} ({margem?.toFixed(0)}%)
                              </span>
                            )}
                            {prod.tipo === 'produto' && prod.estoque !== null && (
                              <span className={estoqueBaixo ? 'text-saida-dark font-medium' : ''}>
                                Estoque: {prod.estoque} un.
                              </span>
                            )}
                          </div>

                          {vendas && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-entrada-dark">
                              <BarChart3 className="w-3 h-3" />
                              <span>{vendas.qtd} vendas • {formatarMoeda(vendas.total)} faturado</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleAtivo(prod)}
                          className={`p-2 rounded-lg transition-colors ${
                            prod.ativo 
                              ? 'hover:bg-neutral-100 text-neutral-400' 
                              : 'hover:bg-entrada-light text-entrada'
                          }`}
                          title={prod.ativo ? 'Desativar' : 'Ativar'}
                        >
                          {prod.ativo ? '👁️' : '👁️‍🗨️'}
                        </button>
                        <button
                          onClick={() => abrirEdicao(prod)}
                          className="p-2 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4 text-primary-600" />
                        </button>
                        <button
                          onClick={() => handleExcluir(prod.id)}
                          className="p-2 hover:bg-saida-light rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-saida" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<ShoppingBag className="w-8 h-8" />}
              title="Nenhum item cadastrado"
              description="Cadastre seus produtos e serviços para acompanhar vendas"
              action={
                <Button variant="primary" onClick={() => { limparForm(); setShowModal(true); }}>
                  <Plus className="w-4 h-4" />
                  Novo Item
                </Button>
              }
            />
          )}
        </Card>

        {/* Modal de cadastro/edição */}
        <Modal
          isOpen={showModal}
          onClose={() => { setShowModal(false); limparForm(); }}
          title={editando ? 'Editar Item' : 'Novo Produto ou Serviço'}
        >
          <div className="space-y-4">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Tipo</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTipo('servico')}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    tipo === 'servico' 
                      ? 'bg-secondary-500 text-white' 
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Serviço
                </button>
                <button
                  onClick={() => setTipo('produto')}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    tipo === 'produto' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Produto
                </button>
              </div>
            </div>

            <Input
              label="Nome"
              placeholder={tipo === 'produto' ? 'Ex: Shampoo Profissional' : 'Ex: Corte de cabelo'}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Preço de Venda"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                required
              />
              <Input
                label="Custo (opcional)"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={custo}
                onChange={(e) => setCusto(e.target.value)}
              />
            </div>

            {/* Campos de estoque só para produtos */}
            {tipo === 'produto' && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Estoque atual"
                  type="number"
                  placeholder="0"
                  value={estoque}
                  onChange={(e) => setEstoque(e.target.value)}
                />
                <Input
                  label="Estoque mínimo"
                  type="number"
                  placeholder="0"
                  value={estoqueMinimo}
                  onChange={(e) => setEstoqueMinimo(e.target.value)}
                />
              </div>
            )}

            <Input
              label="Categoria (opcional)"
              placeholder="Ex: Cabelo, Unha, Eletrônicos..."
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />

            {/* Fornecedor */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Fornecedor (opcional)</label>
              <select
                value={fornecedorId}
                onChange={(e) => setFornecedorId(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500"
              >
                <option value="">-- Nenhum --</option>
                {fornecedores.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Descrição (opcional)</label>
              <textarea
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows={2}
                placeholder="Detalhes adicionais..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            {/* Preview de lucro */}
            {preco && custo && parseFloat(preco) > 0 && parseFloat(custo) > 0 && (
              <div className="p-3 bg-entrada-light rounded-xl">
                <p className="text-sm text-entrada-dark">
                  <strong>Lucro por unidade:</strong> {formatarMoeda(parseFloat(preco) - parseFloat(custo))}
                  {' '}({(((parseFloat(preco) - parseFloat(custo)) / parseFloat(preco)) * 100).toFixed(0)}% de margem)
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowModal(false); limparForm(); }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSalvar}
                disabled={salvando}
                className="flex-1"
              >
                {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
