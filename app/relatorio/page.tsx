'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, Button, Select, Loading, Badge } from '@/components/ui';
import { formatarMoeda, formatarDataCurta, formatarMesAno, formatarPercentual } from '@/lib/utils';
import { Empresa, Lancamento, CATEGORIAS_BASE } from '@/lib/types';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Sparkles,
  Send
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const CORES = ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

export default function RelatorioPage() {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  
  // Período
  const [periodo, setPeriodo] = useState('mes_atual');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  // Métricas
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalSaidas, setTotalSaidas] = useState(0);
  const [resultado, setResultado] = useState(0);
  const [entradasPorCategoria, setEntradasPorCategoria] = useState<any[]>([]);
  const [saidasPorCategoria, setSaidasPorCategoria] = useState<any[]>([]);
  const [evolucaoDiaria, setEvolucaoDiaria] = useState<any[]>([]);
  
  // IA
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [relatorioIA, setRelatorioIA] = useState('');
  const [xaiApiKey, setXaiApiKey] = useState('');

  useEffect(() => {
    // Definir período inicial (mês atual)
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    setDataInicio(inicioMes.toISOString().split('T')[0]);
    setDataFim(hoje.toISOString().split('T')[0]);
    
    carregarDados();
  }, []);

  useEffect(() => {
    if (dataInicio && dataFim) {
      processarDados();
    }
  }, [lancamentos, dataInicio, dataFim]);

  async function carregarDados() {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: emp } = await supabase
      .from('empresas')
      .select('*')
      .eq('usuario_id', user.id)
      .single();
    
    if (!emp) return;
    setEmpresa(emp);

    // Carregar todos os lançamentos
    const { data: lancs } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('empresa_id', emp.id)
      .order('data', { ascending: true });
    
    setLancamentos(lancs || []);

    // Carregar API key
    const { data: config } = await supabase
      .from('configuracoes')
      .select('xai_api_key')
      .eq('empresa_id', emp.id)
      .single();
    
    if (config?.xai_api_key) setXaiApiKey(config.xai_api_key);
    
    setLoading(false);
  }

  function processarDados() {
    // Filtrar por período
    const filtrados = lancamentos.filter(l => 
      l.data >= dataInicio && l.data <= dataFim
    );

    // Totais
    const entradas = filtrados.filter(l => l.tipo === 'entrada').reduce((a, l) => a + Number(l.valor), 0);
    const saidas = filtrados.filter(l => l.tipo === 'saida').reduce((a, l) => a + Number(l.valor), 0);
    
    setTotalEntradas(entradas);
    setTotalSaidas(saidas);
    setResultado(entradas - saidas);

    // Por categoria
    const entradasCat: Record<string, number> = {};
    const saidasCat: Record<string, number> = {};
    
    filtrados.forEach(l => {
      const cat = CATEGORIAS_BASE[l.categoria as keyof typeof CATEGORIAS_BASE]?.label || l.categoria;
      if (l.tipo === 'entrada') {
        entradasCat[cat] = (entradasCat[cat] || 0) + Number(l.valor);
      } else {
        saidasCat[cat] = (saidasCat[cat] || 0) + Number(l.valor);
      }
    });

    setEntradasPorCategoria(
      Object.entries(entradasCat)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    );

    setSaidasPorCategoria(
      Object.entries(saidasCat)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    );

    // Evolução diária
    const porDia: Record<string, { entradas: number; saidas: number }> = {};
    
    filtrados.forEach(l => {
      if (!porDia[l.data]) {
        porDia[l.data] = { entradas: 0, saidas: 0 };
      }
      if (l.tipo === 'entrada') {
        porDia[l.data].entradas += Number(l.valor);
      } else {
        porDia[l.data].saidas += Number(l.valor);
      }
    });

    setEvolucaoDiaria(
      Object.entries(porDia)
        .map(([data, valores]) => ({
          data: formatarDataCurta(data),
          ...valores,
        }))
        .slice(-15) // Últimos 15 dias
    );
  }

  function handlePeriodoChange(novoPeriodo: string) {
    setPeriodo(novoPeriodo);
    const hoje = new Date();
    
    switch (novoPeriodo) {
      case 'mes_atual':
        setDataInicio(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]);
        setDataFim(hoje.toISOString().split('T')[0]);
        break;
      case 'mes_passado':
        setDataInicio(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split('T')[0]);
        setDataFim(new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().split('T')[0]);
        break;
      case 'trimestre':
        setDataInicio(new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1).toISOString().split('T')[0]);
        setDataFim(hoje.toISOString().split('T')[0]);
        break;
      case 'ano':
        setDataInicio(new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0]);
        setDataFim(hoje.toISOString().split('T')[0]);
        break;
    }
  }

  async function gerarRelatorioIA() {
    if (!xaiApiKey) {
      alert('Configure sua API Key nas configurações para usar a IA');
      return;
    }
    
    setGerandoRelatorio(true);
    
    try {
      const resumo = {
        periodo: `${formatarDataCurta(dataInicio)} a ${formatarDataCurta(dataFim)}`,
        totalEntradas,
        totalSaidas,
        resultado,
        margemLucro: totalEntradas > 0 ? ((resultado / totalEntradas) * 100).toFixed(1) : 0,
        topEntradas: entradasPorCategoria.slice(0, 5),
        topSaidas: saidasPorCategoria.slice(0, 5),
        tipoNegocio: empresa?.tipo_negocio,
      };

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${xaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'grok-3-fast',
          messages: [
            {
              role: 'system',
              content: `Você é um consultor financeiro especializado em MEIs e pequenas empresas brasileiras.
                Analise os dados financeiros fornecidos e gere um relatório executivo de 3-4 parágrafos.
                Use linguagem simples e direta. Inclua:
                1. Resumo da situação financeira do período
                2. Principais pontos positivos e de atenção
                3. 2-3 recomendações práticas
                Formate com emojis para facilitar a leitura.`
            },
            {
              role: 'user',
              content: `Dados do relatório:\n${JSON.stringify(resumo, null, 2)}`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      setRelatorioIA(data.choices?.[0]?.message?.content || 'Não foi possível gerar o relatório.');
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      setRelatorioIA('Erro ao gerar relatório. Verifique sua conexão e API key.');
    }
    
    setGerandoRelatorio(false);
  }

  if (loading) {
    return <AppLayout><Loading /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Relatório Financeiro</h1>
            <p className="text-neutral-500">{empresa?.nome}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={gerarRelatorioIA} disabled={gerandoRelatorio}>
              <Sparkles className="w-4 h-4" />
              {gerandoRelatorio ? 'Gerando...' : 'Gerar com IA'}
            </Button>
            <Button variant="primary">
              <Download className="w-4 h-4" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Filtro de período */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Período</label>
              <Select
                value={periodo}
                onChange={(e) => handlePeriodoChange(e.target.value)}
                options={[
                  { value: 'mes_atual', label: 'Mês atual' },
                  { value: 'mes_passado', label: 'Mês passado' },
                  { value: 'trimestre', label: 'Últimos 3 meses' },
                  { value: 'ano', label: 'Este ano' },
                  { value: 'personalizado', label: 'Personalizado' },
                ]}
              />
            </div>
            {periodo === 'personalizado' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">De</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="px-4 py-2.5 border border-neutral-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Até</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="px-4 py-2.5 border border-neutral-200 rounded-xl"
                  />
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-entrada-light to-emerald-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-entrada/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-entrada-dark" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Entradas</p>
                <p className="text-xl font-bold text-entrada-dark">{formatarMoeda(totalEntradas)}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-saida-light to-red-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-saida/10 rounded-lg">
                <TrendingDown className="w-5 h-5 text-saida-dark" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Saídas</p>
                <p className="text-xl font-bold text-saida-dark">{formatarMoeda(totalSaidas)}</p>
              </div>
            </div>
          </Card>
          <Card className={`bg-gradient-to-br ${resultado >= 0 ? 'from-entrada-light to-emerald-50' : 'from-saida-light to-red-50'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${resultado >= 0 ? 'bg-entrada/10' : 'bg-saida/10'}`}>
                {resultado >= 0 ? <TrendingUp className="w-5 h-5 text-entrada-dark" /> : <TrendingDown className="w-5 h-5 text-saida-dark" />}
              </div>
              <div>
                <p className="text-sm text-neutral-500">Resultado</p>
                <p className={`text-xl font-bold ${resultado >= 0 ? 'text-entrada-dark' : 'text-saida-dark'}`}>
                  {formatarMoeda(resultado)}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-100 rounded-lg">
                <PieChart className="w-5 h-5 text-neutral-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Margem</p>
                <p className="text-xl font-bold text-neutral-900">
                  {totalEntradas > 0 ? formatarPercentual((resultado / totalEntradas) * 100) : '0%'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Relatório IA */}
        {relatorioIA && (
          <Card className="bg-gradient-to-br from-primary-50 to-cyan-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                Análise da IA
              </CardTitle>
            </CardHeader>
            <div className="prose prose-sm max-w-none text-neutral-700 whitespace-pre-wrap">
              {relatorioIA}
            </div>
          </Card>
        )}

        {/* Gráficos */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Evolução */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-500" />
                Movimentação Diária
              </CardTitle>
            </CardHeader>
            {evolucaoDiaria.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={evolucaoDiaria}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-neutral-500 py-12">Sem dados para o período</p>
            )}
          </Card>

          {/* Despesas por categoria */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary-500" />
                Despesas por Categoria
              </CardTitle>
            </CardHeader>
            {saidasPorCategoria.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <RePieChart>
                    <Pie
                      data={saidasPorCategoria.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {saidasPorCategoria.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={CORES[i % CORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {saidasPorCategoria.slice(0, 6).map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES[i % CORES.length] }} />
                      <span className="text-neutral-600 truncate flex-1">{cat.name}</span>
                      <span className="font-medium">{formatarMoeda(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-neutral-500 py-12">Sem despesas no período</p>
            )}
          </Card>
        </div>

        {/* Detalhamento */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Entradas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-entrada-dark">📈 Principais Entradas</CardTitle>
            </CardHeader>
            {entradasPorCategoria.length > 0 ? (
              <div className="space-y-3">
                {entradasPorCategoria.slice(0, 5).map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-neutral-400">#{i + 1}</span>
                      <span className="text-neutral-700">{cat.name}</span>
                    </div>
                    <span className="font-bold text-entrada-dark">{formatarMoeda(cat.value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-center py-8">Sem entradas no período</p>
            )}
          </Card>

          {/* Top Saídas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-saida-dark">📉 Principais Despesas</CardTitle>
            </CardHeader>
            {saidasPorCategoria.length > 0 ? (
              <div className="space-y-3">
                {saidasPorCategoria.slice(0, 5).map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-neutral-400">#{i + 1}</span>
                      <span className="text-neutral-700">{cat.name}</span>
                    </div>
                    <span className="font-bold text-saida-dark">{formatarMoeda(cat.value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-center py-8">Sem despesas no período</p>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
