'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, Button, Select, Badge, Modal, Loading } from '@/components/ui';
import { formatarMoeda, formatarDataCurta } from '@/lib/utils';
import { TipoLancamento, Categoria, CATEGORIAS_BASE } from '@/lib/types';
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

interface LinhaImportada {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: TipoLancamento;
  categoria: Categoria;
  selecionada: boolean;
  confianca: number;
  original: Record<string, string>;
}

interface ColunaDetectada {
  nome: string;
  tipo: 'descricao' | 'valor' | 'data' | 'tipo' | 'categoria' | 'ignorar';
  exemplos: string[];
}

export default function ImportarPage() {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState<string>('');
  const [xaiApiKey, setXaiApiKey] = useState<string>('');
  
  // Steps
  const [step, setStep] = useState(1);
  
  // Step 1: Upload
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dadosBrutos, setDadosBrutos] = useState<string[][]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  
  // Step 2: Mapeamento
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({});
  
  // Step 3: Preview
  const [linhas, setLinhas] = useState<LinhaImportada[]>([]);
  const [processando, setProcessando] = useState(false);
  
  // Step 4: Resultado
  const [importados, setImportados] = useState(0);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: empresa } = await supabase
      .from('empresas')
      .select('id')
      .eq('usuario_id', user.id)
      .single();
    
    if (empresa) setEmpresaId(empresa.id);

    // Carregar API key
    const { data: config } = await supabase
      .from('configuracoes')
      .select('xai_api_key')
      .eq('empresa_id', empresa?.id)
      .single();
    
    if (config?.xai_api_key) setXaiApiKey(config.xai_api_key);
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setArquivo(file);
    setLoading(true);
    
    try {
      const fileName = file.name.toLowerCase();
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      
      if (isExcel) {
        // Usar nova API para Excel complexo
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/importar-planilha', {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        
        if (data.error) {
          alert(data.error + (data.dica ? '\n\n' + data.dica : ''));
          setLoading(false);
          return;
        }
        
        if (data.sucesso && data.lancamentos) {
          // Converter para o formato esperado
          const linhasProcessadas: LinhaImportada[] = data.lancamentos.map((l: any, idx: number) => ({
            id: `import-${idx}`,
            descricao: l.descricao,
            valor: l.valor,
            data: l.data,
            tipo: l.tipo,
            categoria: detectarCategoria(l.descricao, l.tipo, l.categoria),
            selecionada: true,
            confianca: 0.8,
            original: { descricao: l.descricao, valor: String(l.valor), data: l.data },
          }));
          
          setLinhas(linhasProcessadas);
          setStep(3); // Pular direto para preview
          setLoading(false);
          return;
        }
      }
      
      // Fallback para CSV simples
      const text = await file.text();
      const linhasTexto = text.split('\n').filter(l => l.trim());
      
      // Detectar separador
      const primeiraLinha = linhasTexto[0];
      const separador = primeiraLinha.includes(';') ? ';' : 
                        primeiraLinha.includes('\t') ? '\t' : ',';
      
      // Parsear CSV
      const dados = linhasTexto.map(linha => {
        const valores: string[] = [];
        let atual = '';
        let dentroAspas = false;
        
        for (const char of linha) {
          if (char === '"') {
            dentroAspas = !dentroAspas;
          } else if (char === separador && !dentroAspas) {
            valores.push(atual.trim());
            atual = '';
          } else {
            atual += char;
          }
        }
        valores.push(atual.trim());
        return valores;
      });
      
      // Primeira linha = cabeçalhos
      const headers = dados[0];
      setColunas(headers);
      setDadosBrutos(dados.slice(1));
      
      // Auto-detectar mapeamento
      const mapAuto: Record<string, string> = {};
      headers.forEach((col, i) => {
        const colLower = col.toLowerCase();
        if (colLower.includes('descri') || colLower.includes('historico') || colLower.includes('nome') || colLower.includes('memo')) {
          mapAuto[i.toString()] = 'descricao';
        } else if (colLower.includes('valor') || colLower.includes('quantia') || colLower.includes('total') || colLower.includes('montante')) {
          mapAuto[i.toString()] = 'valor';
        } else if (colLower.includes('data') || colLower.includes('date') || colLower.includes('vencimento')) {
          mapAuto[i.toString()] = 'data';
        } else if (colLower.includes('tipo') || colLower.includes('natureza')) {
          mapAuto[i.toString()] = 'tipo';
        } else if (colLower.includes('categoria') || colLower.includes('classificacao')) {
          mapAuto[i.toString()] = 'categoria';
        }
      });
      setMapeamento(mapAuto);
      
      setStep(2);
    } catch (error) {
      console.error('Erro ao ler arquivo:', error);
      alert('Erro ao ler o arquivo. Verifique se é um arquivo válido (CSV, XLS, XLSX).');
    }
    
    setLoading(false);
  };

  // Função auxiliar para detectar categoria
  function detectarCategoria(descricao: string, tipo: TipoLancamento, categoriaOriginal?: string): Categoria {
    const descLower = descricao.toLowerCase();
    
    // Se já tem categoria válida
    if (categoriaOriginal && CATEGORIAS_BASE[categoriaOriginal as Categoria]) {
      return categoriaOriginal as Categoria;
    }
    
    // Auto-detectar
    if (tipo === 'entrada') {
      if (descLower.includes('venda')) return 'vendas';
      if (descLower.includes('serviço') || descLower.includes('servico')) return 'servicos';
      if (descLower.includes('freela') || descLower.includes('job')) return 'freela_entrada';
      return 'vendas';
    } else {
      if (descLower.includes('luz') || descLower.includes('energia') || descLower.includes('cpfl') || descLower.includes('eletro')) return 'energia';
      if (descLower.includes('água') || descLower.includes('agua') || descLower.includes('sabesp') || descLower.includes('saneamento')) return 'agua';
      if (descLower.includes('internet') || descLower.includes('telefone') || descLower.includes('celular') || descLower.includes('vivo') || descLower.includes('claro') || descLower.includes('tim')) return 'internet';
      if (descLower.includes('aluguel')) return 'aluguel';
      if (descLower.includes('salário') || descLower.includes('salario') || descLower.includes('funcionário') || descLower.includes('funcionario')) return 'salarios';
      if (descLower.includes('imposto') || descLower.includes('das') || descLower.includes('simples') || descLower.includes('icms')) return 'impostos';
      if (descLower.includes('uber') || descLower.includes('99') || descLower.includes('combustível') || descLower.includes('combustivel') || descLower.includes('gasolina')) return 'transporte';
      if (descLower.includes('adobe') || descLower.includes('netflix') || descLower.includes('spotify') || descLower.includes('assinatura') || descLower.includes('mensal')) return 'assinaturas';
      if (descLower.includes('marketing') || descLower.includes('anúncio') || descLower.includes('anuncio') || descLower.includes('google ads') || descLower.includes('facebook')) return 'marketing';
      if (descLower.includes('fornecedor')) return 'fornecedores';
      return 'outros_despesas';
    }
  }

  const processarDados = async () => {
    setProcessando(true);
    
    const linhasProcessadas: LinhaImportada[] = [];
    
    // Encontrar índices das colunas mapeadas
    const idxDescricao = Object.entries(mapeamento).find(([_, v]) => v === 'descricao')?.[0];
    const idxValor = Object.entries(mapeamento).find(([_, v]) => v === 'valor')?.[0];
    const idxData = Object.entries(mapeamento).find(([_, v]) => v === 'data')?.[0];
    const idxTipo = Object.entries(mapeamento).find(([_, v]) => v === 'tipo')?.[0];
    
    for (const linha of dadosBrutos) {
      if (!linha || linha.length === 0) continue;
      
      const descricao = idxDescricao ? linha[parseInt(idxDescricao)] : '';
      let valorStr = idxValor ? linha[parseInt(idxValor)] : '0';
      const dataStr = idxData ? linha[parseInt(idxData)] : '';
      const tipoStr = idxTipo ? linha[parseInt(idxTipo)]?.toLowerCase() : '';
      
      if (!descricao || !valorStr) continue;
      
      // Processar valor
      valorStr = valorStr.replace(/[^\d,.-]/g, '').replace(',', '.');
      let valor = parseFloat(valorStr) || 0;
      
      // Determinar tipo
      let tipo: TipoLancamento = 'saida';
      if (valor < 0) {
        tipo = 'saida';
        valor = Math.abs(valor);
      } else if (tipoStr.includes('entrada') || tipoStr.includes('crédito') || tipoStr.includes('receita')) {
        tipo = 'entrada';
      } else if (tipoStr.includes('saída') || tipoStr.includes('débito') || tipoStr.includes('despesa')) {
        tipo = 'saida';
      } else if (valor > 0 && !tipoStr) {
        // Se não tem indicador de tipo e valor é positivo, assumir entrada
        tipo = 'entrada';
      }
      
      // Processar data
      let data = '';
      if (dataStr) {
        // Tentar vários formatos
        const partes = dataStr.split(/[\/\-\.]/);
        if (partes.length === 3) {
          const [p1, p2, p3] = partes;
          if (p1.length === 4) {
            data = `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
          } else if (p3.length === 4) {
            data = `${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
          } else {
            data = `20${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
          }
        }
      }
      if (!data) data = new Date().toISOString().split('T')[0];
      
      // Categorizar (regras locais simples)
      let categoria: Categoria = tipo === 'entrada' ? 'vendas' : 'outros_despesas';
      let confianca = 0.5;
      
      const descLower = descricao.toLowerCase();
      if (descLower.includes('uber') || descLower.includes('99') || descLower.includes('combustível') || descLower.includes('gasolina')) {
        categoria = 'transporte'; confianca = 0.9;
      } else if (descLower.includes('luz') || descLower.includes('energia') || descLower.includes('enel') || descLower.includes('cpfl')) {
        categoria = 'energia'; confianca = 0.95;
      } else if (descLower.includes('água') || descLower.includes('saneamento') || descLower.includes('sabesp')) {
        categoria = 'agua'; confianca = 0.95;
      } else if (descLower.includes('aluguel') || descLower.includes('locação')) {
        categoria = 'aluguel'; confianca = 0.9;
      } else if (descLower.includes('internet') || descLower.includes('telefone') || descLower.includes('vivo') || descLower.includes('claro') || descLower.includes('tim')) {
        categoria = 'internet'; confianca = 0.9;
      } else if (descLower.includes('das') || descLower.includes('imposto') || descLower.includes('tributo')) {
        categoria = 'impostos'; confianca = 0.9;
      } else if (descLower.includes('salário') || descLower.includes('funcionário') || descLower.includes('folha')) {
        categoria = 'salarios'; confianca = 0.85;
      } else if (descLower.includes('venda') || descLower.includes('cliente') || descLower.includes('serviço')) {
        categoria = tipo === 'entrada' ? 'servicos' : 'outros_despesas'; confianca = 0.7;
      }
      
      linhasProcessadas.push({
        id: Math.random().toString(36).substring(7),
        descricao,
        valor,
        data,
        tipo,
        categoria,
        selecionada: true,
        confianca,
        original: linha.reduce((acc, v, i) => ({ ...acc, [colunas[i]]: v }), {}),
      });
    }
    
    setLinhas(linhasProcessadas);
    setProcessando(false);
    setStep(3);
  };

  const handleImportar = async () => {
    setLoading(true);
    
    const selecionadas = linhas.filter(l => l.selecionada);
    
    for (const linha of selecionadas) {
      await supabase.from('lancamentos').insert({
        empresa_id: empresaId,
        tipo: linha.tipo,
        descricao: linha.descricao,
        valor: linha.valor,
        categoria: linha.categoria,
        data: linha.data,
      });
    }
    
    setImportados(selecionadas.length);
    setStep(4);
    setLoading(false);
  };

  const toggleSelecao = (id: string) => {
    setLinhas(linhas.map(l => 
      l.id === id ? { ...l, selecionada: !l.selecionada } : l
    ));
  };

  const toggleTodos = () => {
    const todosSelecionados = linhas.every(l => l.selecionada);
    setLinhas(linhas.map(l => ({ ...l, selecionada: !todosSelecionados })));
  };

  const alterarCategoria = (id: string, categoria: Categoria) => {
    setLinhas(linhas.map(l => 
      l.id === id ? { ...l, categoria } : l
    ));
  };

  // Totais
  const totalEntradas = linhas.filter(l => l.selecionada && l.tipo === 'entrada').reduce((a, l) => a + l.valor, 0);
  const totalSaidas = linhas.filter(l => l.selecionada && l.tipo === 'saida').reduce((a, l) => a + l.valor, 0);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Importar Dados</h1>
          <p className="text-neutral-500">Importe lançamentos de CSV ou Excel</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                s < step ? 'bg-entrada text-white' :
                s === step ? 'bg-primary-500 text-white' :
                'bg-neutral-200 text-neutral-500'
              }`}>
                {s < step ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-16 h-1 mx-2 rounded ${s < step ? 'bg-entrada' : 'bg-neutral-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <Card className="text-center py-12">
            <FileSpreadsheet className="w-16 h-16 mx-auto text-primary-400 mb-4" />
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Selecione seu arquivo</h2>
            <p className="text-neutral-500 mb-6">Formatos aceitos: CSV, Excel (XLS, XLSX)</p>
            
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium cursor-pointer hover:bg-primary-600 transition-colors">
              <Upload className="w-5 h-5" />
              Escolher arquivo
              <input
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {loading && (
              <div className="mt-4">
                <Loading />
              </div>
            )}

            <div className="mt-8 p-4 bg-neutral-50 rounded-xl text-left max-w-md mx-auto">
              <h3 className="font-medium text-neutral-900 mb-2">💡 Dicas</h3>
              <ul className="text-sm text-neutral-600 space-y-1">
                <li>• O arquivo deve ter cabeçalhos na primeira linha</li>
                <li>• Colunas recomendadas: Descrição, Valor, Data</li>
                <li>• Valores negativos serão tratados como saídas</li>
                <li>• A IA vai categorizar automaticamente</li>
              </ul>
            </div>
          </Card>
        )}

        {/* Step 2: Mapeamento */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Mapeie as colunas</CardTitle>
            </CardHeader>
            
            <p className="text-neutral-500 mb-6">
              Identifique qual coluna do seu arquivo corresponde a cada informação.
              Detectamos automaticamente algumas colunas ✨
            </p>

            <div className="space-y-4 mb-6">
              {colunas.map((col, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900">{col}</p>
                    <p className="text-sm text-neutral-500 truncate">
                      Ex: {dadosBrutos[0]?.[idx] || '-'}, {dadosBrutos[1]?.[idx] || '-'}
                    </p>
                  </div>
                  <Select
                    value={mapeamento[idx.toString()] || 'ignorar'}
                    onChange={(e) => setMapeamento({ ...mapeamento, [idx.toString()]: e.target.value })}
                    options={[
                      { value: 'ignorar', label: 'Ignorar' },
                      { value: 'descricao', label: '📝 Descrição' },
                      { value: 'valor', label: '💰 Valor' },
                      { value: 'data', label: '📅 Data' },
                      { value: 'tipo', label: '↕️ Tipo (entrada/saída)' },
                      { value: 'categoria', label: '🏷️ Categoria' },
                    ]}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Button 
                variant="primary" 
                onClick={processarDados}
                disabled={!mapeamento[Object.keys(mapeamento).find(k => mapeamento[k] === 'descricao') || ''] || 
                          !mapeamento[Object.keys(mapeamento).find(k => mapeamento[k] === 'valor') || '']}
              >
                Processar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {processando && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="max-w-sm text-center">
                  <Sparkles className="w-12 h-12 mx-auto text-primary-500 mb-4 animate-pulse" />
                  <p className="font-medium">Processando com IA...</p>
                  <p className="text-sm text-neutral-500">Categorizando {dadosBrutos.length} linhas</p>
                </Card>
              </div>
            )}
          </Card>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-entrada-light">
                <p className="text-sm text-neutral-500">Entradas</p>
                <p className="text-xl font-bold text-entrada-dark">{formatarMoeda(totalEntradas)}</p>
                <p className="text-xs text-neutral-500">{linhas.filter(l => l.selecionada && l.tipo === 'entrada').length} itens</p>
              </Card>
              <Card className="bg-saida-light">
                <p className="text-sm text-neutral-500">Saídas</p>
                <p className="text-xl font-bold text-saida-dark">{formatarMoeda(totalSaidas)}</p>
                <p className="text-xs text-neutral-500">{linhas.filter(l => l.selecionada && l.tipo === 'saida').length} itens</p>
              </Card>
              <Card>
                <p className="text-sm text-neutral-500">Selecionados</p>
                <p className="text-xl font-bold text-neutral-900">{linhas.filter(l => l.selecionada).length}/{linhas.length}</p>
                <button onClick={toggleTodos} className="text-xs text-primary-600">
                  {linhas.every(l => l.selecionada) ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </Card>
            </div>

            {/* Lista */}
            <Card>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {linhas.map((linha) => (
                  <div 
                    key={linha.id}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                      linha.selecionada ? 'bg-neutral-50' : 'bg-neutral-100 opacity-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={linha.selecionada}
                      onChange={() => toggleSelecao(linha.id)}
                      className="w-5 h-5 rounded border-neutral-300 text-primary-600"
                    />
                    
                    <div className={`p-2 rounded-lg ${linha.tipo === 'entrada' ? 'bg-entrada-light' : 'bg-saida-light'}`}>
                      {linha.tipo === 'entrada' ? '↑' : '↓'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 truncate">{linha.descricao}</p>
                      <p className="text-sm text-neutral-500">{formatarDataCurta(linha.data)}</p>
                    </div>
                    
                    <Select
                      value={linha.categoria}
                      onChange={(e) => alterarCategoria(linha.id, e.target.value as Categoria)}
                      options={Object.entries(CATEGORIAS_BASE)
                        .filter(([_, c]) => c.tipo === linha.tipo)
                        .map(([key, cat]) => ({
                          value: key,
                          label: `${cat.icone} ${cat.label}`,
                        }))}
                    />
                    
                    {linha.confianca < 0.7 && (
                      <Badge variant="alerta" className="text-xs">Revisar</Badge>
                    )}
                    
                    <p className={`font-bold w-28 text-right ${linha.tipo === 'entrada' ? 'text-entrada-dark' : 'text-saida-dark'}`}>
                      {formatarMoeda(linha.valor)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Ações */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Button 
                variant="primary" 
                onClick={handleImportar}
                disabled={loading || linhas.filter(l => l.selecionada).length === 0}
              >
                {loading ? 'Importando...' : `Importar ${linhas.filter(l => l.selecionada).length} itens`}
                <Check className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Sucesso */}
        {step === 4 && (
          <Card className="text-center py-12">
            <div className="w-20 h-20 bg-entrada-light rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-entrada-dark" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Importação concluída!</h2>
            <p className="text-neutral-500 mb-6">
              {importados} lançamentos foram importados com sucesso.
            </p>
            
            <div className="flex gap-4 justify-center">
              <Button variant="ghost" onClick={() => { setStep(1); setLinhas([]); setArquivo(null); }}>
                Importar outro arquivo
              </Button>
              <Button variant="primary" onClick={() => window.location.href = '/lancamentos'}>
                Ver lançamentos
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
