'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, Button, Input, Modal, Loading, EmptyState, Badge } from '@/components/ui';
import { CategoriaPersonalizada, TipoLancamento, ICONES_CATEGORIAS, CATEGORIAS_BASE } from '@/lib/types';
import {
  Plus,
  Tag,
  Trash2,
  Edit,
  ArrowUpCircle,
  ArrowDownCircle,
  Check
} from 'lucide-react';

export default function CategoriasPage() {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<CategoriaPersonalizada[]>([]);
  const [empresaId, setEmpresaId] = useState<string>('');
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<CategoriaPersonalizada | null>(null);
  
  // Form
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoLancamento>('saida');
  const [icone, setIcone] = useState('📌');
  const [cor, setCor] = useState('#0d9488');
  const [salvando, setSalvando] = useState(false);

  const cores = [
    '#0d9488', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
    '#f59e0b', '#ef4444', '#6b7280', '#1f2937', '#14b8a6'
  ];

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

    const { data: cats } = await supabase
      .from('categorias_personalizadas')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('nome');
    
    setCategorias(cats || []);
    setLoading(false);
  }

  async function handleSalvar() {
    if (!nome || !empresaId) return;
    
    setSalvando(true);
    
    if (editando) {
      await supabase
        .from('categorias_personalizadas')
        .update({ nome, tipo, icone, cor })
        .eq('id', editando.id);
    } else {
      await supabase
        .from('categorias_personalizadas')
        .insert({
          empresa_id: empresaId,
          nome,
          tipo,
          icone,
          cor,
        });
    }
    
    setSalvando(false);
    setShowModal(false);
    limparForm();
    carregarDados();
  }

  async function handleExcluir(id: string) {
    if (!confirm('Deseja excluir esta categoria?')) return;
    await supabase.from('categorias_personalizadas').delete().eq('id', id);
    carregarDados();
  }

  async function toggleAtiva(cat: CategoriaPersonalizada) {
    await supabase
      .from('categorias_personalizadas')
      .update({ ativa: !cat.ativa })
      .eq('id', cat.id);
    carregarDados();
  }

  function abrirEdicao(cat: CategoriaPersonalizada) {
    setEditando(cat);
    setNome(cat.nome);
    setTipo(cat.tipo);
    setIcone(cat.icone);
    setCor(cat.cor);
    setShowModal(true);
  }

  function limparForm() {
    setEditando(null);
    setNome('');
    setTipo('saida');
    setIcone('📌');
    setCor('#0d9488');
  }

  // Separar por tipo
  const categoriasEntrada = categorias.filter(c => c.tipo === 'entrada');
  const categoriasSaida = categorias.filter(c => c.tipo === 'saida');

  if (loading) {
    return <AppLayout><Loading /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Categorias</h1>
            <p className="text-neutral-500">Crie categorias personalizadas para organizar seus lançamentos</p>
          </div>
          <Button variant="primary" onClick={() => { limparForm(); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            Nova Categoria
          </Button>
        </div>

        {/* Categorias padrão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-500">
              Categorias Padrão do Sistema
            </CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORIAS_BASE).map(([key, cat]) => (
              <Badge 
                key={key} 
                variant={cat.tipo === 'entrada' ? 'entrada' : 'saida'}
                className="text-sm"
              >
                {cat.icone} {cat.label}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Categorias de entrada personalizadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-entrada" />
              Categorias de Entrada
            </CardTitle>
          </CardHeader>
          
          {categoriasEntrada.length > 0 ? (
            <div className="space-y-2">
              {categoriasEntrada.map((cat) => (
                <div 
                  key={cat.id} 
                  className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                    cat.ativa ? 'bg-entrada-light/50' : 'bg-neutral-100 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: cat.cor + '20' }}
                    >
                      {cat.icone}
                    </span>
                    <div>
                      <p className="font-medium text-neutral-900">{cat.nome}</p>
                      <p className="text-xs text-neutral-500">
                        {cat.ativa ? 'Ativa' : 'Desativada'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => toggleAtiva(cat)}
                      className={`p-2 rounded-lg transition-colors ${
                        cat.ativa ? 'bg-entrada-light text-entrada-dark' : 'bg-neutral-200 text-neutral-500'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => abrirEdicao(cat)}
                      className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-neutral-500" />
                    </button>
                    <button 
                      onClick={() => handleExcluir(cat.id)}
                      className="p-2 hover:bg-saida-light rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-saida" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 text-center py-4">
              Nenhuma categoria de entrada personalizada
            </p>
          )}
        </Card>

        {/* Categorias de saída personalizadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-saida" />
              Categorias de Saída
            </CardTitle>
          </CardHeader>
          
          {categoriasSaida.length > 0 ? (
            <div className="space-y-2">
              {categoriasSaida.map((cat) => (
                <div 
                  key={cat.id} 
                  className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                    cat.ativa ? 'bg-saida-light/50' : 'bg-neutral-100 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: cat.cor + '20' }}
                    >
                      {cat.icone}
                    </span>
                    <div>
                      <p className="font-medium text-neutral-900">{cat.nome}</p>
                      <p className="text-xs text-neutral-500">
                        {cat.ativa ? 'Ativa' : 'Desativada'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => toggleAtiva(cat)}
                      className={`p-2 rounded-lg transition-colors ${
                        cat.ativa ? 'bg-saida-light text-saida-dark' : 'bg-neutral-200 text-neutral-500'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => abrirEdicao(cat)}
                      className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-neutral-500" />
                    </button>
                    <button 
                      onClick={() => handleExcluir(cat.id)}
                      className="p-2 hover:bg-saida-light rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-saida" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 text-center py-4">
              Nenhuma categoria de saída personalizada
            </p>
          )}
        </Card>

        {/* Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => { setShowModal(false); limparForm(); }}
          title={editando ? 'Editar Categoria' : 'Nova Categoria'}
        >
          <div className="space-y-4">
            {/* Tipo */}
            <div className="flex gap-2">
              <button
                onClick={() => setTipo('entrada')}
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
                onClick={() => setTipo('saida')}
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
              label="Nome da categoria"
              placeholder="Ex: Serviços de Marketing"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />

            {/* Seletor de ícone */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Ícone
              </label>
              <div className="grid grid-cols-10 gap-1 p-2 bg-neutral-50 rounded-xl max-h-32 overflow-y-auto">
                {ICONES_CATEGORIAS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setIcone(emoji)}
                    className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                      icone === emoji 
                        ? 'bg-primary-500 scale-110' 
                        : 'hover:bg-neutral-200'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor de cor */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Cor
              </label>
              <div className="flex gap-2 flex-wrap">
                {cores.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      cor === c ? 'ring-2 ring-offset-2 ring-neutral-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-neutral-50 rounded-xl">
              <p className="text-xs text-neutral-500 mb-2">Preview</p>
              <div className="flex items-center gap-3">
                <span 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: cor + '20' }}
                >
                  {icone}
                </span>
                <span className="font-medium">{nome || 'Nome da categoria'}</span>
                <Badge variant={tipo === 'entrada' ? 'entrada' : 'saida'}>
                  {tipo === 'entrada' ? 'Entrada' : 'Saída'}
                </Badge>
              </div>
            </div>

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
                {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
