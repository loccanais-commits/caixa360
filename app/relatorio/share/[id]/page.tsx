'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, Button, Badge, Loading } from '@/components/ui';
import { formatarMoeda, formatarDataCurta } from '@/lib/utils';
import {
  Download,
  TrendingUp,
  TrendingDown,
  PieChart,
  AlertTriangle,
  Clock,
  Share2
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
} from 'recharts';

const CORES = ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

interface ReportData {
  empresaNome: string;
  totalEntradas: number;
  totalSaidas: number;
  resultado: number;
  margemOperacional: number;
  burnRate: number;
  runway: number;
  saudeCaixa: number;
  saudeCaixaLabel: string;
  entradasPorCategoria: Array<{ name: string; value: number; percentage: number }>;
  saidasPorCategoria: Array<{ name: string; value: number; percentage: number }>;
  evolucaoDiaria: Array<{ dataFormatada: string; entradas: number; saidas: number }>;
  alertas: Array<{ type: string; title: string; message: string }>;
  relatorioIA?: string;
}

export default function SharedReportPage() {
  const params = useParams();
  const shareId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState<ReportData | null>(null);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    loadReport();
  }, [shareId]);

  async function loadReport() {
    try {
      const response = await fetch(`/api/report-share?id=${shareId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Relatório não encontrado');
        setLoading(false);
        return;
      }

      setReport(data.report);
      setPeriodoInicio(data.periodoInicio);
      setPeriodoFim(data.periodoFim);
      setExpiresAt(data.expiresAt);
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar relatório');
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <div className="p-8">
            <AlertTriangle className="w-16 h-16 text-alerta mx-auto mb-4" />
            <h1 className="text-xl font-bold text-neutral-900 mb-2">
              Relatório não disponível
            </h1>
            <p className="text-neutral-500">
              {error || 'Este link pode ter expirado ou o relatório foi removido.'}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 print:bg-white">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 print:border-none">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary-500" />
              <span className="text-sm text-neutral-500">Relatório Compartilhado</span>
            </div>
            <h1 className="text-xl font-bold text-neutral-900">{report.empresaNome}</h1>
            <p className="text-sm text-neutral-500">
              Período: {formatarDataCurta(periodoInicio)} a {formatarDataCurta(periodoFim)}
            </p>
          </div>
          <div className="print:hidden flex items-center gap-3">
            <div className="text-right text-xs text-neutral-400">
              <Clock className="w-3 h-3 inline mr-1" />
              Expira em {formatarDataCurta(expiresAt)}
            </div>
            <Button variant="primary" onClick={handlePrint}>
              <Download className="w-4 h-4" />
              Baixar PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Resumo Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-entrada-light to-emerald-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-entrada/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-entrada-dark" />
              </div>
              <div>
                <p className="text-xs text-neutral-500">Entradas</p>
                <p className="text-lg font-bold text-entrada-dark">
                  {formatarMoeda(report.totalEntradas)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-saida-light to-red-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-saida/10 rounded-lg">
                <TrendingDown className="w-5 h-5 text-saida-dark" />
              </div>
              <div>
                <p className="text-xs text-neutral-500">Saídas</p>
                <p className="text-lg font-bold text-saida-dark">
                  {formatarMoeda(report.totalSaidas)}
                </p>
              </div>
            </div>
          </Card>

          <Card className={`bg-gradient-to-br ${report.resultado >= 0 ? 'from-entrada-light to-emerald-50' : 'from-saida-light to-red-50'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${report.resultado >= 0 ? 'bg-entrada/10' : 'bg-saida/10'}`}>
                {report.resultado >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-entrada-dark" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-saida-dark" />
                )}
              </div>
              <div>
                <p className="text-xs text-neutral-500">Resultado</p>
                <p className={`text-lg font-bold ${report.resultado >= 0 ? 'text-entrada-dark' : 'text-saida-dark'}`}>
                  {formatarMoeda(report.resultado)}
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
                <p className="text-xs text-neutral-500">Margem</p>
                <p className="text-lg font-bold text-neutral-900">
                  {report.margemOperacional.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Indicadores Avançados */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <p className="text-xs text-neutral-500">Burn Rate</p>
            <p className="text-lg font-bold text-neutral-900">
              {formatarMoeda(report.burnRate)}/dia
            </p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-neutral-500">Runway</p>
            <p className="text-lg font-bold text-neutral-900">
              {report.runway} dias
            </p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-neutral-500">Saúde do Caixa</p>
            <p className="text-lg font-bold text-neutral-900">
              {report.saudeCaixa}/100
            </p>
            <Badge variant={
              report.saudeCaixaLabel === 'Excelente' ? 'entrada' :
              report.saudeCaixaLabel === 'Saudável' ? 'info' :
              report.saudeCaixaLabel === 'Atenção' ? 'alerta' : 'saida'
            }>
              {report.saudeCaixaLabel}
            </Badge>
          </Card>
        </div>

        {/* Alertas */}
        {report.alertas && report.alertas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-alerta-dark">
                <AlertTriangle className="w-5 h-5 inline mr-2" />
                Alertas
              </CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {report.alertas.map((alerta, i) => (
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

        {/* Gráficos */}
        <div className="grid lg:grid-cols-2 gap-6 print:grid-cols-1">
          {/* Evolução Diária */}
          {report.evolucaoDiaria && report.evolucaoDiaria.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Movimentação Diária</CardTitle>
              </CardHeader>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={report.evolucaoDiaria.slice(-15)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="dataFormatada" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                  <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Despesas por Categoria */}
          {report.saidasPorCategoria && report.saidasPorCategoria.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={report.saidasPorCategoria.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {report.saidasPorCategoria.slice(0, 6).map((_, i) => (
                          <Cell key={i} fill={CORES[i % CORES.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {report.saidasPorCategoria.slice(0, 6).map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES[i % CORES.length] }} />
                      <span className="text-neutral-600 truncate flex-1">{cat.name}</span>
                      <span className="font-medium">{cat.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
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
              <CardTitle className="text-entrada-dark">Principais Entradas</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {report.entradasPorCategoria.slice(0, 5).map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-neutral-400">#{i + 1}</span>
                    <span className="text-neutral-700">{cat.name}</span>
                  </div>
                  <span className="font-bold text-entrada-dark">{formatarMoeda(cat.value)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Saídas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-saida-dark">Principais Despesas</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {report.saidasPorCategoria.slice(0, 5).map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-neutral-400">#{i + 1}</span>
                    <span className="text-neutral-700">{cat.name}</span>
                  </div>
                  <span className="font-bold text-saida-dark">{formatarMoeda(cat.value)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Análise IA */}
        {report.relatorioIA && (
          <Card className="bg-gradient-to-br from-primary-50 to-cyan-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                Análise Inteligente
              </CardTitle>
            </CardHeader>
            <div className="prose prose-sm max-w-none text-neutral-700 whitespace-pre-wrap">
              {report.relatorioIA}
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-neutral-400 py-8 print:py-4">
          <p>Relatório gerado pelo Caixa360</p>
          <p>www.caixa360.com.br</p>
        </div>
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
