'use client';

import { forwardRef } from 'react';
import { formatarMoeda, formatarDataCurta } from '@/lib/utils';
import type { ReportMetrics } from '@/lib/report-metrics';

interface ReportPDFProps {
  empresaNome: string;
  periodoInicio: string;
  periodoFim: string;
  metricas: ReportMetrics;
  relatorioIA?: string;
  entradasPorCategoria: Array<{ name: string; value: number; percentage: number }>;
  saidasPorCategoria: Array<{ name: string; value: number; percentage: number }>;
  contasAPagar?: Array<{ descricao: string; valor: number; data_vencimento: string }>;
  evolucaoSVG?: string;
  categoriasSVG?: string;
}

const ReportPDF = forwardRef<HTMLDivElement, ReportPDFProps>(({
  empresaNome,
  periodoInicio,
  periodoFim,
  metricas,
  relatorioIA,
  entradasPorCategoria,
  saidasPorCategoria,
  contasAPagar = [],
  evolucaoSVG,
  categoriasSVG,
}, ref) => {
  const corResultado = metricas.resultado >= 0 ? '#10b981' : '#ef4444';
  const corSaude = metricas.saudeCaixa >= 70 ? '#10b981' : metricas.saudeCaixa >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div
      ref={ref}
      className="report-pdf bg-white text-neutral-900"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '15mm',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        lineHeight: '1.5',
      }}
    >
      {/* Header */}
      <header className="flex items-start justify-between border-b-2 border-cyan-500 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">RELATÓRIO FINANCEIRO</h1>
              <p className="text-xs text-neutral-500">Gerado por Caixa360</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold text-neutral-900">{empresaNome}</h2>
          <p className="text-sm text-neutral-600">
            Período: {formatarDataCurta(periodoInicio)} a {formatarDataCurta(periodoFim)}
          </p>
          <p className="text-xs text-neutral-400">
            Gerado em: {formatarDataCurta(new Date().toISOString())}
          </p>
        </div>
      </header>

      {/* Resumo Executivo - Cards */}
      <section className="mb-6">
        <h3 className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-3">
          Resumo Executivo
        </h3>
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
            <p className="text-xs text-neutral-500 mb-1">Total Entradas</p>
            <p className="text-lg font-bold text-emerald-600">
              {formatarMoeda(metricas.totalEntradas)}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-xs text-neutral-500 mb-1">Total Saídas</p>
            <p className="text-lg font-bold text-red-600">
              {formatarMoeda(metricas.totalSaidas)}
            </p>
          </div>
          <div
            className="rounded-lg p-3 text-center border"
            style={{
              backgroundColor: metricas.resultado >= 0 ? '#ecfdf5' : '#fef2f2',
              borderColor: metricas.resultado >= 0 ? '#a7f3d0' : '#fecaca',
            }}
          >
            <p className="text-xs text-neutral-500 mb-1">Resultado</p>
            <p className="text-lg font-bold" style={{ color: corResultado }}>
              {formatarMoeda(metricas.resultado)}
            </p>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-center">
            <p className="text-xs text-neutral-500 mb-1">Margem Operacional</p>
            <p className="text-lg font-bold text-neutral-700">
              {metricas.margemOperacional.toFixed(1)}%
            </p>
          </div>
        </div>
      </section>

      {/* Indicadores Avançados */}
      <section className="mb-6">
        <h3 className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-3">
          Indicadores de Saúde Financeira
        </h3>
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-white border border-neutral-200 rounded-lg p-3 text-center">
            <p className="text-xs text-neutral-500 mb-1">Burn Rate</p>
            <p className="text-base font-bold text-neutral-700">
              {formatarMoeda(metricas.burnRate)}
            </p>
            <p className="text-xs text-neutral-400">/dia</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-lg p-3 text-center">
            <p className="text-xs text-neutral-500 mb-1">Runway</p>
            <p className="text-base font-bold text-neutral-700">
              {metricas.runway}
            </p>
            <p className="text-xs text-neutral-400">dias</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-lg p-3 text-center">
            <p className="text-xs text-neutral-500 mb-1">Ticket Médio</p>
            <p className="text-base font-bold text-neutral-700">
              {formatarMoeda(metricas.ticketMedio)}
            </p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-lg p-3 text-center">
            <p className="text-xs text-neutral-500 mb-1">Dias Negativo</p>
            <p className="text-base font-bold text-neutral-700">
              {metricas.diasSaldoNegativo}
            </p>
            <p className="text-xs text-neutral-400">dias</p>
          </div>
          <div
            className="rounded-lg p-3 text-center border"
            style={{
              backgroundColor: metricas.saudeCaixa >= 70 ? '#ecfdf5' : metricas.saudeCaixa >= 40 ? '#fefce8' : '#fef2f2',
              borderColor: metricas.saudeCaixa >= 70 ? '#a7f3d0' : metricas.saudeCaixa >= 40 ? '#fef08a' : '#fecaca',
            }}
          >
            <p className="text-xs text-neutral-500 mb-1">Saúde do Caixa</p>
            <p className="text-base font-bold" style={{ color: corSaude }}>
              {metricas.saudeCaixa}/100
            </p>
            <p className="text-xs" style={{ color: corSaude }}>
              {metricas.saudeCaixaLabel}
            </p>
          </div>
        </div>
      </section>

      {/* Alertas */}
      {metricas.alertas && metricas.alertas.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-3">
            Pontos de Atenção
          </h3>
          <div className="space-y-2">
            {metricas.alertas.slice(0, 3).map((alerta, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2 rounded-lg text-xs"
                style={{
                  backgroundColor: alerta.type === 'danger' ? '#fef2f2' : alerta.type === 'warning' ? '#fefce8' : '#ecfdf5',
                  borderLeft: `3px solid ${alerta.type === 'danger' ? '#ef4444' : alerta.type === 'warning' ? '#f59e0b' : '#10b981'}`,
                }}
              >
                <span className="flex-shrink-0">
                  {alerta.type === 'danger' ? '!' : alerta.type === 'warning' ? '!' : '!'}
                </span>
                <div>
                  <p className="font-medium">{alerta.title}</p>
                  <p className="text-neutral-600">{alerta.message}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gráficos */}
      {(evolucaoSVG || categoriasSVG) && (
        <section className="mb-6 page-break-inside-avoid">
          <h3 className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-3">
            Visualizações
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {evolucaoSVG && (
              <div className="border border-neutral-200 rounded-lg p-3">
                <p className="text-xs font-medium text-neutral-600 mb-2">Evolução Diária</p>
                <div dangerouslySetInnerHTML={{ __html: evolucaoSVG }} />
              </div>
            )}
            {categoriasSVG && (
              <div className="border border-neutral-200 rounded-lg p-3">
                <p className="text-xs font-medium text-neutral-600 mb-2">Despesas por Categoria</p>
                <div dangerouslySetInnerHTML={{ __html: categoriasSVG }} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Detalhamento Entradas e Saídas */}
      <section className="mb-6 page-break-inside-avoid">
        <h3 className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-3">
          Detalhamento por Categoria
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Top Entradas */}
          <div className="border border-neutral-200 rounded-lg p-3">
            <p className="text-xs font-medium text-emerald-600 mb-2">Top 5 Entradas</p>
            <div className="space-y-2">
              {entradasPorCategoria.slice(0, 5).map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400 font-medium">#{i + 1}</span>
                    <span className="text-neutral-700">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-emerald-600">{formatarMoeda(cat.value)}</span>
                    <span className="text-neutral-400 ml-1">({cat.percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Saídas */}
          <div className="border border-neutral-200 rounded-lg p-3">
            <p className="text-xs font-medium text-red-600 mb-2">Top 5 Despesas</p>
            <div className="space-y-2">
              {saidasPorCategoria.slice(0, 5).map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400 font-medium">#{i + 1}</span>
                    <span className="text-neutral-700">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-red-600">{formatarMoeda(cat.value)}</span>
                    <span className="text-neutral-400 ml-1">({cat.percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Gastos Fixos vs Variáveis */}
      {metricas.gastosFixos > 0 || metricas.gastosVariaveis > 0 ? (
        <section className="mb-6">
          <h3 className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-3">
            Estrutura de Custos
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-neutral-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-neutral-500">Gastos Fixos</p>
                  <p className="text-lg font-bold text-neutral-700">
                    {formatarMoeda(metricas.gastosFixos)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-600">
                    {metricas.percentualFixos.toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="mt-2 h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full"
                  style={{ width: `${metricas.percentualFixos}%` }}
                />
              </div>
            </div>
            <div className="border border-neutral-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-neutral-500">Gastos Variáveis</p>
                  <p className="text-lg font-bold text-neutral-700">
                    {formatarMoeda(metricas.gastosVariaveis)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-600">
                    {(100 - metricas.percentualFixos).toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="mt-2 h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${100 - metricas.percentualFixos}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Contas a Pagar */}
      {contasAPagar.length > 0 && (
        <section className="mb-6 page-break-inside-avoid">
          <h3 className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-3">
            Contas a Pagar (Próximos 30 dias)
          </h3>
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left p-2 font-medium text-neutral-600">Descrição</th>
                  <th className="text-right p-2 font-medium text-neutral-600">Valor</th>
                  <th className="text-right p-2 font-medium text-neutral-600">Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {contasAPagar.slice(0, 10).map((conta, i) => (
                  <tr key={i} className="border-t border-neutral-100">
                    <td className="p-2 text-neutral-700">{conta.descricao}</td>
                    <td className="p-2 text-right font-medium text-red-600">
                      {formatarMoeda(conta.valor)}
                    </td>
                    <td className="p-2 text-right text-neutral-500">
                      {formatarDataCurta(conta.data_vencimento)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Análise IA */}
      {relatorioIA && (
        <section className="mb-6 page-break-before-auto">
          <h3 className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-3">
            Análise Inteligente
          </h3>
          <div className="border border-cyan-200 bg-cyan-50/50 rounded-lg p-4">
            <div
              className="prose prose-xs max-w-none text-neutral-700"
              style={{ fontSize: '10px', lineHeight: '1.6' }}
            >
              {relatorioIA.split('\n').map((line, i) => {
                if (line.startsWith('## ')) {
                  return (
                    <h4 key={i} className="text-xs font-bold text-neutral-800 mt-3 mb-1">
                      {line.replace('## ', '')}
                    </h4>
                  );
                }
                if (line.startsWith('- ') || line.startsWith('* ')) {
                  return (
                    <p key={i} className="ml-3 mb-1">
                      • {line.replace(/^[-*] /, '')}
                    </p>
                  );
                }
                if (line.trim()) {
                  return <p key={i} className="mb-1">{line}</p>;
                }
                return null;
              })}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-neutral-200 text-center">
        <p className="text-xs text-neutral-500">
          Relatório gerado automaticamente pelo Caixa360 - Sistema de Gestão Financeira
        </p>
        <p className="text-xs text-neutral-400 mt-1">
          www.caixa360.com.br | contato@caixa360.com.br
        </p>
      </footer>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .report-pdf {
            width: 100% !important;
            padding: 10mm !important;
          }
          .page-break-before-auto {
            page-break-before: auto;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
});

ReportPDF.displayName = 'ReportPDF';

export default ReportPDF;
