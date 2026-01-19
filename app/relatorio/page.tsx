'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, Button, Select, Loading, Badge } from '@/components/ui';
import { formatarMoeda, formatarDataCurta, formatarPercentual } from '@/lib/utils';
import { Empresa, Lancamento, Conta, CATEGORIAS_BASE } from '@/lib/types';
import { calcularMetricas, formatarMetricasParaIA, type ReportMetrics } from '@/lib/report-metrics';
import { prepareChartsForPDF } from '@/lib/chart-to-image';
import ReportPDF from '@/components/reports/ReportPDF';
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Sparkles,
  Share2,
  AlertTriangle,
  Clock,
  Flame,
  Shield,
  Copy,
  Check,
  X
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
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

const CORES = ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

interface UsageData {
  relatorios_ia_usados: number;
  relatorios_pdf_usados: number;
  limite_ia: number;
  limite_pdf: number;
  pode_gerar_ia: boolean;
  pode_gerar_pdf: boolean;
}

export default function RelatorioPage() {
  const supabase = createClient();
  const reportRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [saldoInicial, setSaldoInicial] = useState(0);

  // Período
  const [periodo, setPeriodo] = useState('mes_atual');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Métricas calculadas
  const [metricas, setMetricas] = useState<ReportMetrics | null>(null);

  // IA
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [relatorioIA, setRelatorioIA] = useState('');

  // Usage limits
  const [usage, setUsage] = useState<UsageData | null>(null);

  // Compartilhamento
  const [compartilhando, setCompartilhando] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Definir período inicial (mês atual)
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    setDataInicio(inicioMes.toISOString().split('T')[0]);
    setDataFim(hoje.toISOString().split('T')[0]);

    carregarDados();
    carregarUsage();
  }, []);

  useEffect(() => {
    if (dataInicio && dataFim && lancamentos.length >= 0) {
      processarDados();
    }
  }, [lancamentos, contas, dataInicio, dataFim, saldoInicial]);

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
    setSaldoInicial(emp.saldo_inicial || 0);

    // Carregar lançamentos
    const { data: lancs } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('empresa_id', emp.id)
      .order('data', { ascending: true });

    setLancamentos(lancs || []);

    // Carregar contas
    const { data: cts } = await supabase
      .from('contas')
      .select('*')
      .eq('empresa_id', emp.id);

    setContas(cts || []);

    setLoading(false);
  }

  async function carregarUsage() {
    try {
      const response = await fetch('/api/report-usage');
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Erro ao carregar uso:', error);
    }
  }

  function processarDados() {
    // Calcular métricas usando a nova função
    const calculadas = calcularMetricas(
      lancamentos,
      contas,
      saldoInicial,
      dataInicio,
      dataFim
    );

    setMetricas(calculadas);
  }

  function handlePeriodoChange(novoPeriodo: string) {
    setPeriodo(novoPeriodo);
    const hoje = new Date();

    // Helper para formatar data local (evita bug de timezone com toISOString)
    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    switch (novoPeriodo) {
      case 'mes_atual':
        setDataInicio(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`);
        setDataFim(formatDate(hoje));
        break;
      case 'mes_passado':
        const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const fimMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        setDataInicio(`${mesPassado.getFullYear()}-${String(mesPassado.getMonth() + 1).padStart(2, '0')}-01`);
        setDataFim(formatDate(fimMesPassado));
        break;
      case 'trimestre':
        const inicioTrimestre = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
        setDataInicio(`${inicioTrimestre.getFullYear()}-${String(inicioTrimestre.getMonth() + 1).padStart(2, '0')}-01`);
        setDataFim(formatDate(hoje));
        break;
      case 'ano':
        setDataInicio(`${hoje.getFullYear()}-01-01`);
        setDataFim(formatDate(hoje));
        break;
    }
  }

  async function gerarRelatorioIA() {
    if (!metricas || !empresa) return;

    if (usage && !usage.pode_gerar_ia) {
      alert(`Você já utilizou seus ${usage.limite_ia} relatórios com IA este mês.`);
      return;
    }

    setGerandoRelatorio(true);

    try {
      const dadosFinanceiros = formatarMetricasParaIA(metricas, {
        nome: empresa.nome,
        tipo_negocio: empresa.tipo_negocio || 'Não especificado'
      });

      const response = await fetch('/api/relatorio-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dadosFinanceiros }),
      });

      const data = await response.json();

      if (data.limitReached) {
        alert(data.relatorio);
      } else {
        setRelatorioIA(data.relatorio || 'Não foi possível gerar o relatório.');
        // Atualizar uso
        if (data.usageAfter) {
          setUsage(prev => prev ? {
            ...prev,
            relatorios_ia_usados: data.usageAfter.ia,
            pode_gerar_ia: data.usageAfter.ia < data.usageAfter.maxIA
          } : null);
        }
        carregarUsage();
      }

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      setRelatorioIA('Erro ao gerar relatório. Tente novamente.');
    }

    setGerandoRelatorio(false);
  }

  async function compartilharRelatorio() {
    if (!metricas || !empresa) return;

    setCompartilhando(true);

    try {
      const reportData = {
        empresaNome: empresa.nome,
        totalEntradas: metricas.totalEntradas,
        totalSaidas: metricas.totalSaidas,
        resultado: metricas.resultado,
        margemOperacional: metricas.margemOperacional,
        burnRate: metricas.burnRate,
        runway: metricas.runway,
        saudeCaixa: metricas.saudeCaixa,
        saudeCaixaLabel: metricas.saudeCaixaLabel,
        entradasPorCategoria: metricas.entradasPorCategoria,
        saidasPorCategoria: metricas.saidasPorCategoria,
        evolucaoDiaria: metricas.evolucaoDiaria,
        alertas: metricas.alertas,
        relatorioIA: relatorioIA || undefined,
      };

      const response = await fetch('/api/report-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportData,
          periodoInicio: dataInicio,
          periodoFim: dataFim,
          incluiAnaliseIA: !!relatorioIA,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShareUrl(data.shareUrl);
        setShowShareModal(true);
      } else {
        alert(data.error || 'Erro ao compartilhar relatório');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      alert('Erro ao compartilhar relatório');
    }

    setCompartilhando(false);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function exportarPDF() {
    if (!metricas || !empresa) return;

    // Incrementar uso de PDF
    fetch('/api/report-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'pdf' }),
    }).then(() => carregarUsage());

    // Usar window.print() com estilos de impressão
    window.print();
  }

  if (loading) {
    return <AppLayout><Loading /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in print:space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Relatório Financeiro</h1>
            <p className="text-neutral-500">{empresa?.nome}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={gerarRelatorioIA}
              disabled={gerandoRelatorio || (usage && !usage.pode_gerar_ia)}
            >
              <Sparkles className="w-4 h-4" />
              {gerandoRelatorio ? 'Gerando...' : 'Gerar com IA'}
            </Button>
            <Button variant="outline" onClick={compartilharRelatorio} disabled={compartilhando}>
              <Share2 className="w-4 h-4" />
              {compartilhando ? 'Compartilhando...' : 'Compartilhar'}
            </Button>
            <Button variant="primary" onClick={exportarPDF}>
              <Download className="w-4 h-4" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Indicador de Uso */}
        {usage && (
          <Card className="print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Relatórios com IA</p>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: usage.limite_ia }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${
                          i < usage.relatorios_ia_usados ? 'bg-primary-500' : 'bg-neutral-200'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-neutral-600 ml-1">
                      {usage.relatorios_ia_usados}/{usage.limite_ia} usados
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-1">PDFs Exportados</p>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: usage.limite_pdf }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${
                          i < usage.relatorios_pdf_usados ? 'bg-amber-500' : 'bg-neutral-200'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-neutral-600 ml-1">
                      {usage.relatorios_pdf_usados}/{usage.limite_pdf} usados
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-neutral-400">Limites renovam mensalmente</p>
            </div>
          </Card>
        )}

        {/* Filtro de período */}
        <Card className="print:hidden">
          <div className="flex flex-col gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-neutral-700 mb-2 text-center">Período</label>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">De</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Até</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <div className="flex items-center justify-between border-b-2 border-cyan-500 pb-4">
            <div>
              <h1 className="text-xl font-bold">Relatório Financeiro</h1>
              <p className="text-sm text-neutral-600">{empresa?.nome}</p>
            </div>
            <div className="text-right">
              {dataInicio && dataFim && (
                <p className="text-sm">
                  Período: {formatarDataCurta(dataInicio)} a {formatarDataCurta(dataFim)}
                </p>
              )}
              <p className="text-xs text-neutral-400">
                Gerado em: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {metricas && (
          <>
            {/* Resumo Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-entrada-light to-emerald-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-entrada/10 rounded-lg flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-entrada-dark" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">Entradas</p>
                    <p className="text-lg font-bold text-entrada-dark truncate">
                      {formatarMoeda(metricas.totalEntradas)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-saida-light to-red-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-saida/10 rounded-lg flex-shrink-0">
                    <TrendingDown className="w-5 h-5 text-saida-dark" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">Saídas</p>
                    <p className="text-lg font-bold text-saida-dark truncate">
                      {formatarMoeda(metricas.totalSaidas)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className={`bg-gradient-to-br ${metricas.resultado >= 0 ? 'from-entrada-light to-emerald-50' : 'from-saida-light to-red-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${metricas.resultado >= 0 ? 'bg-entrada/10' : 'bg-saida/10'}`}>
                    {metricas.resultado >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-entrada-dark" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-saida-dark" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">Resultado</p>
                    <p className={`text-lg font-bold truncate ${metricas.resultado >= 0 ? 'text-entrada-dark' : 'text-saida-dark'}`}>
                      {formatarMoeda(metricas.resultado)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-neutral-100 rounded-lg flex-shrink-0">
                    <PieChart className="w-5 h-5 text-neutral-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">Margem</p>
                    <p className="text-lg font-bold text-neutral-900">
                      {formatarPercentual(metricas.margemOperacional)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Indicadores Avançados */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Card className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <p className="text-xs text-neutral-500">Burn Rate</p>
                  <p className="text-base font-bold text-neutral-900">
                    {formatarMoeda(metricas.burnRate)}
                  </p>
                  <p className="text-xs text-neutral-400">/dia</p>
                </div>
              </Card>

              <Card className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <Clock className="w-5 h-5 text-primary-500" />
                  <p className="text-xs text-neutral-500">Runway</p>
                  <p className="text-base font-bold text-neutral-900">
                    {metricas.runway > 365 ? '365+' : metricas.runway}
                  </p>
                  <p className="text-xs text-neutral-400">dias</p>
                </div>
              </Card>

              <Card className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <FileText className="w-5 h-5 text-primary-500" />
                  <p className="text-xs text-neutral-500">Ticket Médio</p>
                  <p className="text-base font-bold text-neutral-900">
                    {formatarMoeda(metricas.ticketMedio)}
                  </p>
                </div>
              </Card>

              <Card className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <AlertTriangle className="w-5 h-5 text-alerta" />
                  <p className="text-xs text-neutral-500">Dias Negativo</p>
                  <p className="text-base font-bold text-neutral-900">
                    {metricas.diasSaldoNegativo}
                  </p>
                  <p className="text-xs text-neutral-400">dias</p>
                </div>
              </Card>

              <Card className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <Shield className={`w-5 h-5 ${
                    metricas.saudeCaixaLabel === 'Excelente' ? 'text-entrada' :
                    metricas.saudeCaixaLabel === 'Saudável' ? 'text-primary-500' :
                    metricas.saudeCaixaLabel === 'Atenção' ? 'text-alerta' : 'text-saida'
                  }`} />
                  <p className="text-xs text-neutral-500">Saúde</p>
                  <p className="text-base font-bold text-neutral-900">
                    {metricas.saudeCaixa}/100
                  </p>
                  <Badge variant={
                    metricas.saudeCaixaLabel === 'Excelente' ? 'entrada' :
                    metricas.saudeCaixaLabel === 'Saudável' ? 'info' :
                    metricas.saudeCaixaLabel === 'Atenção' ? 'alerta' : 'saida'
                  }>
                    {metricas.saudeCaixaLabel}
                  </Badge>
                </div>
              </Card>
            </div>

            {/* Alertas */}
            {metricas.alertas && metricas.alertas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-alerta-dark">
                    <AlertTriangle className="w-5 h-5" />
                    Pontos de Atenção
                  </CardTitle>
                </CardHeader>
                <div className="space-y-2">
                  {metricas.alertas.map((alerta, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg ${
                        alerta.type === 'danger' ? 'bg-saida-light text-saida-dark' :
                        alerta.type === 'warning' ? 'bg-alerta-light text-alerta-dark' :
                        'bg-primary-50 text-primary-700'
                      }`}
                    >
                      <p className="font-medium">{alerta.title}</p>
                      <p className="text-sm opacity-80">{alerta.message}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Relatório IA */}
            {relatorioIA && (
              <Card className="bg-gradient-to-br from-primary-50 to-cyan-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary-600" />
                    Análise Inteligente
                  </CardTitle>
                </CardHeader>
                <div className="prose prose-sm max-w-none text-neutral-700 whitespace-pre-wrap">
                  {relatorioIA}
                </div>
              </Card>
            )}

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Evolução Diária */}
              {metricas.evolucaoDiaria && metricas.evolucaoDiaria.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary-500" />
                      Movimentação Diária
                    </CardTitle>
                  </CardHeader>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={metricas.evolucaoDiaria.slice(-15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="dataFormatada" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                      <Legend />
                      <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Despesas por categoria */}
              {metricas.saidasPorCategoria && metricas.saidasPorCategoria.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-primary-500" />
                      Despesas por Categoria
                    </CardTitle>
                  </CardHeader>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={metricas.saidasPorCategoria.slice(0, 6)}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {metricas.saidasPorCategoria.slice(0, 6).map((_, i) => (
                              <Cell key={i} fill={CORES[i % CORES.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {metricas.saidasPorCategoria.slice(0, 6).map((cat, i) => (
                        <div key={cat.name} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CORES[i % CORES.length] }} />
                          <span className="text-neutral-600 truncate flex-1">{cat.name}</span>
                          <span className="font-medium whitespace-nowrap">{cat.percentage.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Evolução Mensal */}
              {metricas.evolucaoMensal && metricas.evolucaoMensal.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary-500" />
                      Evolução Mensal
                    </CardTitle>
                  </CardHeader>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={metricas.evolucaoMensal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="mesFormatado" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                      <Area
                        type="monotone"
                        dataKey="resultado"
                        name="Resultado"
                        stroke="#06b6d4"
                        fill="#06b6d4"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Estrutura de Custos */}
              {(metricas.gastosFixos > 0 || metricas.gastosVariaveis > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Estrutura de Custos</CardTitle>
                  </CardHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-cyan-50 rounded-xl">
                      <p className="text-xs text-neutral-500 mb-1">Gastos Fixos</p>
                      <p className="text-lg font-bold text-cyan-700">
                        {formatarMoeda(metricas.gastosFixos)}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {metricas.percentualFixos.toFixed(0)}%
                      </p>
                      <div className="mt-2 h-2 bg-neutral-200 rounded-full">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${metricas.percentualFixos}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-center p-4 bg-emerald-50 rounded-xl">
                      <p className="text-xs text-neutral-500 mb-1">Gastos Variáveis</p>
                      <p className="text-lg font-bold text-emerald-700">
                        {formatarMoeda(metricas.gastosVariaveis)}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {(100 - metricas.percentualFixos).toFixed(0)}%
                      </p>
                      <div className="mt-2 h-2 bg-neutral-200 rounded-full">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${100 - metricas.percentualFixos}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Detalhamento */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Entradas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-entrada-dark flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Principais Entradas
                  </CardTitle>
                </CardHeader>
                {metricas.entradasPorCategoria.length > 0 ? (
                  <div className="space-y-3">
                    {metricas.entradasPorCategoria.slice(0, 5).map((cat, i) => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-neutral-400">#{i + 1}</span>
                          <span className="text-neutral-700">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-entrada-dark">{formatarMoeda(cat.value)}</span>
                          <span className="text-xs text-neutral-400 ml-2">({cat.percentage.toFixed(0)}%)</span>
                        </div>
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
                  <CardTitle className="text-saida-dark flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    Principais Despesas
                  </CardTitle>
                </CardHeader>
                {metricas.saidasPorCategoria.length > 0 ? (
                  <div className="space-y-3">
                    {metricas.saidasPorCategoria.slice(0, 5).map((cat, i) => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-neutral-400">#{i + 1}</span>
                          <span className="text-neutral-700">{cat.name}</span>
                          {cat.isFixed && (
                            <Badge variant="neutral" className="text-xs">Fixo</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-saida-dark">{formatarMoeda(cat.value)}</span>
                          <span className="text-xs text-neutral-400 ml-2">({cat.percentage.toFixed(0)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-500 text-center py-8">Sem despesas no período</p>
                )}
              </Card>
            </div>

            {/* Contas Próximas */}
            {metricas.contasProximas && metricas.contasProximas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary-500" />
                    Contas a Pagar (Próx. 30 dias)
                  </CardTitle>
                </CardHeader>
                <div className="space-y-2">
                  {metricas.contasProximas.map((conta, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-neutral-700">{conta.descricao}</p>
                        <p className="text-xs text-neutral-500">
                          Vence em {conta.diasRestantes} dia{conta.diasRestantes !== 1 ? 's' : ''} ({formatarDataCurta(conta.vencimento)})
                        </p>
                      </div>
                      <span className={`font-bold ${conta.tipo === 'entrada' ? 'text-entrada-dark' : 'text-saida-dark'}`}>
                        {conta.tipo === 'entrada' ? '+' : '-'}{formatarMoeda(conta.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Print Footer */}
        <div className="hidden print:block mt-8 text-center text-sm text-neutral-400">
          <p>Relatório gerado pelo Caixa360</p>
          <p>www.caixa360.com.br</p>
        </div>
      </div>

      {/* Modal de Compartilhamento */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-neutral-900">Link Compartilhável</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-neutral-600 mb-4">
              Este link permite visualizar o relatório sem necessidade de login. Válido por 7 dias.
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-4 py-2 border border-neutral-200 rounded-xl bg-neutral-50 text-sm"
              />
              <Button variant="primary" onClick={copyToClipboard}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(`Confira o relatório financeiro: ${shareUrl}`)}`, '_blank');
                }}
              >
                Enviar WhatsApp
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  window.location.href = `mailto:?subject=Relatório Financeiro&body=${encodeURIComponent(`Acesse o relatório financeiro: ${shareUrl}`)}`;
                }}
              >
                Enviar Email
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </AppLayout>
  );
}
