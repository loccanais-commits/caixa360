// Métricas Avançadas para Relatórios Financeiros

import { Lancamento, Conta, CATEGORIAS_BASE } from './types';
import { differenceInDays, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

// ==================== TIPOS ====================

export interface ReportMetrics {
  // Métricas básicas
  totalEntradas: number;
  totalSaidas: number;
  resultado: number;
  margemOperacional: number;

  // Métricas avançadas
  burnRate: number;           // Quanto "queima" por dia
  runway: number;             // Dias que o caixa aguenta
  ticketMedio: number;        // Valor médio por entrada
  diasSaldoNegativo: number;  // Dias com saldo < 0

  // Crescimento
  crescimentoReceita: number | null;   // % vs mês anterior
  crescimentoDespesas: number | null;  // % vs mês anterior

  // Estrutura de custos
  gastosFixos: number;
  gastosVariaveis: number;
  percentualFixos: number;

  // Saúde do caixa (0-100)
  saudeCaixa: number;
  saudeCaixaLabel: 'Crítico' | 'Atenção' | 'Saudável' | 'Excelente';

  // Categorias
  entradasPorCategoria: CategoryData[];
  saidasPorCategoria: CategoryData[];

  // Evolução
  evolucaoDiaria: DailyData[];
  evolucaoMensal: MonthlyData[];

  // Alertas
  alertas: ReportAlert[];

  // Contas próximas
  contasProximas: UpcomingBill[];
}

export interface CategoryData {
  name: string;
  value: number;
  percentage: number;
  isFixed: boolean;
}

export interface DailyData {
  data: string;
  dataFormatada: string;
  entradas: number;
  saidas: number;
  saldo: number;
  saldoAcumulado: number;
}

export interface MonthlyData {
  mes: string;
  mesFormatado: string;
  entradas: number;
  saidas: number;
  resultado: number;
}

export interface ReportAlert {
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
}

export interface UpcomingBill {
  descricao: string;
  valor: number;
  vencimento: string;
  diasRestantes: number;
  tipo: 'entrada' | 'saida';
}

// ==================== CATEGORIAS FIXAS/VARIÁVEIS ====================

// Categorias consideradas gastos fixos
const CATEGORIAS_FIXAS = [
  'aluguel',
  'energia',
  'agua',
  'internet',
  'salarios',
  'impostos',
  'software',
  'prolabore',
];

function isGastoFixo(categoria: string): boolean {
  return CATEGORIAS_FIXAS.includes(categoria.toLowerCase());
}

// ==================== CÁLCULO DE MÉTRICAS ====================

export function calcularMetricas(
  lancamentos: Lancamento[],
  contas: Conta[],
  saldoInicial: number,
  dataInicio: string,
  dataFim: string,
  lancamentosAnteriores?: Lancamento[] // Para comparação
): ReportMetrics {
  // Filtrar por período
  const lancsFiltrados = lancamentos.filter(
    l => l.data >= dataInicio && l.data <= dataFim
  );

  // Totais básicos
  const entradas = lancsFiltrados.filter(l => l.tipo === 'entrada');
  const saidas = lancsFiltrados.filter(l => l.tipo === 'saida');

  const totalEntradas = entradas.reduce((a, l) => a + Number(l.valor), 0);
  const totalSaidas = saidas.reduce((a, l) => a + Number(l.valor), 0);
  const resultado = totalEntradas - totalSaidas;

  // Margem operacional
  const margemOperacional = totalEntradas > 0
    ? (resultado / totalEntradas) * 100
    : 0;

  // Dias do período
  const diasPeriodo = differenceInDays(new Date(dataFim), new Date(dataInicio)) + 1;

  // Burn Rate (gasto diário médio)
  const burnRate = diasPeriodo > 0 ? totalSaidas / diasPeriodo : 0;

  // Saldo atual
  const saldoAtual = saldoInicial +
    lancamentos.filter(l => l.data <= dataFim)
      .reduce((a, l) => a + (l.tipo === 'entrada' ? Number(l.valor) : -Number(l.valor)), 0);

  // Runway (dias que o caixa aguenta)
  const runway = burnRate > 0 ? Math.floor(saldoAtual / burnRate) : 999;

  // Ticket médio
  const ticketMedio = entradas.length > 0 ? totalEntradas / entradas.length : 0;

  // Dias com saldo negativo
  const evolucaoDiaria = calcularEvolucaoDiaria(lancsFiltrados, saldoInicial, dataInicio, dataFim);
  const diasSaldoNegativo = evolucaoDiaria.filter(d => d.saldoAcumulado < 0).length;

  // Crescimento vs período anterior
  let crescimentoReceita: number | null = null;
  let crescimentoDespesas: number | null = null;

  if (lancamentosAnteriores && lancamentosAnteriores.length > 0) {
    const entradasAnt = lancamentosAnteriores
      .filter(l => l.tipo === 'entrada')
      .reduce((a, l) => a + Number(l.valor), 0);
    const saidasAnt = lancamentosAnteriores
      .filter(l => l.tipo === 'saida')
      .reduce((a, l) => a + Number(l.valor), 0);

    if (entradasAnt > 0) {
      crescimentoReceita = ((totalEntradas - entradasAnt) / entradasAnt) * 100;
    }
    if (saidasAnt > 0) {
      crescimentoDespesas = ((totalSaidas - saidasAnt) / saidasAnt) * 100;
    }
  }

  // Gastos fixos vs variáveis
  const gastosFixos = saidas
    .filter(l => isGastoFixo(l.categoria))
    .reduce((a, l) => a + Number(l.valor), 0);
  const gastosVariaveis = totalSaidas - gastosFixos;
  const percentualFixos = totalSaidas > 0 ? (gastosFixos / totalSaidas) * 100 : 0;

  // Categorias
  const entradasPorCategoria = calcularPorCategoria(entradas, totalEntradas);
  const saidasPorCategoria = calcularPorCategoria(saidas, totalSaidas, true);

  // Saúde do caixa
  const { saudeCaixa, saudeCaixaLabel } = calcularSaudeCaixa(
    runway,
    margemOperacional,
    diasSaldoNegativo,
    diasPeriodo
  );

  // Evolução mensal (últimos 6 meses)
  const evolucaoMensal = calcularEvolucaoMensal(lancamentos);

  // Alertas
  const alertas = gerarAlertas({
    runway,
    margemOperacional,
    diasSaldoNegativo,
    crescimentoDespesas,
    gastosFixos,
    totalSaidas,
    saldoAtual,
  });

  // Contas próximas (30 dias)
  const contasProximas = calcularContasProximas(contas);

  return {
    totalEntradas,
    totalSaidas,
    resultado,
    margemOperacional,
    burnRate,
    runway,
    ticketMedio,
    diasSaldoNegativo,
    crescimentoReceita,
    crescimentoDespesas,
    gastosFixos,
    gastosVariaveis,
    percentualFixos,
    saudeCaixa,
    saudeCaixaLabel,
    entradasPorCategoria,
    saidasPorCategoria,
    evolucaoDiaria,
    evolucaoMensal,
    alertas,
    contasProximas,
  };
}

// ==================== FUNÇÕES AUXILIARES ====================

function calcularPorCategoria(
  lancamentos: Lancamento[],
  total: number,
  markFixed = false
): CategoryData[] {
  const porCategoria: Record<string, number> = {};

  lancamentos.forEach(l => {
    const cat = CATEGORIAS_BASE[l.categoria as keyof typeof CATEGORIAS_BASE]?.label || l.categoria || 'Outros';
    porCategoria[cat] = (porCategoria[cat] || 0) + Number(l.valor);
  });

  return Object.entries(porCategoria)
    .map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
      isFixed: markFixed && isGastoFixo(name.toLowerCase()),
    }))
    .sort((a, b) => b.value - a.value);
}

function calcularEvolucaoDiaria(
  lancamentos: Lancamento[],
  saldoInicial: number,
  dataInicio: string,
  dataFim: string
): DailyData[] {
  const porDia: Record<string, { entradas: number; saidas: number }> = {};

  lancamentos.forEach(l => {
    if (!porDia[l.data]) {
      porDia[l.data] = { entradas: 0, saidas: 0 };
    }
    if (l.tipo === 'entrada') {
      porDia[l.data].entradas += Number(l.valor);
    } else {
      porDia[l.data].saidas += Number(l.valor);
    }
  });

  const resultado: DailyData[] = [];
  let saldoAcumulado = saldoInicial;
  let currentDate = new Date(dataInicio);
  const endDate = new Date(dataFim);

  while (currentDate <= endDate) {
    const dataStr = format(currentDate, 'yyyy-MM-dd');
    const dia = porDia[dataStr] || { entradas: 0, saidas: 0 };
    const saldo = dia.entradas - dia.saidas;
    saldoAcumulado += saldo;

    resultado.push({
      data: dataStr,
      dataFormatada: format(currentDate, 'dd/MM'),
      entradas: dia.entradas,
      saidas: dia.saidas,
      saldo,
      saldoAcumulado,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return resultado;
}

function calcularEvolucaoMensal(lancamentos: Lancamento[]): MonthlyData[] {
  const hoje = new Date();
  const resultado: MonthlyData[] = [];

  for (let i = 5; i >= 0; i--) {
    const data = subMonths(hoje, i);
    const inicio = format(startOfMonth(data), 'yyyy-MM-dd');
    const fim = format(endOfMonth(data), 'yyyy-MM-dd');

    const doMes = lancamentos.filter(l => l.data >= inicio && l.data <= fim);

    const entradas = doMes
      .filter(l => l.tipo === 'entrada')
      .reduce((a, l) => a + Number(l.valor), 0);
    const saidas = doMes
      .filter(l => l.tipo === 'saida')
      .reduce((a, l) => a + Number(l.valor), 0);

    resultado.push({
      mes: format(data, 'yyyy-MM'),
      mesFormatado: format(data, 'MMM/yy'),
      entradas,
      saidas,
      resultado: entradas - saidas,
    });
  }

  return resultado;
}

function calcularSaudeCaixa(
  runway: number,
  margem: number,
  diasNegativos: number,
  diasTotal: number
): { saudeCaixa: number; saudeCaixaLabel: 'Crítico' | 'Atenção' | 'Saudável' | 'Excelente' } {
  let pontos = 0;

  // Runway (0-40 pontos)
  if (runway >= 90) pontos += 40;
  else if (runway >= 60) pontos += 30;
  else if (runway >= 30) pontos += 20;
  else if (runway >= 15) pontos += 10;

  // Margem (0-30 pontos)
  if (margem >= 30) pontos += 30;
  else if (margem >= 20) pontos += 25;
  else if (margem >= 10) pontos += 15;
  else if (margem >= 0) pontos += 5;

  // Dias negativos (0-30 pontos)
  const percentNegativo = diasTotal > 0 ? (diasNegativos / diasTotal) * 100 : 0;
  if (percentNegativo === 0) pontos += 30;
  else if (percentNegativo <= 10) pontos += 20;
  else if (percentNegativo <= 25) pontos += 10;

  let label: 'Crítico' | 'Atenção' | 'Saudável' | 'Excelente';
  if (pontos >= 80) label = 'Excelente';
  else if (pontos >= 60) label = 'Saudável';
  else if (pontos >= 40) label = 'Atenção';
  else label = 'Crítico';

  return { saudeCaixa: pontos, saudeCaixaLabel: label };
}

function gerarAlertas(dados: {
  runway: number;
  margemOperacional: number;
  diasSaldoNegativo: number;
  crescimentoDespesas: number | null;
  gastosFixos: number;
  totalSaidas: number;
  saldoAtual: number;
}): ReportAlert[] {
  const alertas: ReportAlert[] = [];

  // Runway crítico
  if (dados.runway < 15) {
    alertas.push({
      type: 'danger',
      title: 'Caixa crítico',
      message: `Seu caixa aguenta apenas ${dados.runway} dias no ritmo atual de gastos.`,
    });
  } else if (dados.runway < 30) {
    alertas.push({
      type: 'warning',
      title: 'Atenção ao caixa',
      message: `Seu caixa aguenta ${dados.runway} dias. Considere reduzir gastos ou aumentar receitas.`,
    });
  }

  // Margem negativa
  if (dados.margemOperacional < 0) {
    alertas.push({
      type: 'danger',
      title: 'Prejuízo no período',
      message: 'As saídas superaram as entradas. Revise seus custos urgentemente.',
    });
  } else if (dados.margemOperacional < 10) {
    alertas.push({
      type: 'warning',
      title: 'Margem baixa',
      message: `Margem de apenas ${dados.margemOperacional.toFixed(1)}%. Ideal é acima de 20%.`,
    });
  }

  // Crescimento de despesas
  if (dados.crescimentoDespesas !== null && dados.crescimentoDespesas > 20) {
    alertas.push({
      type: 'warning',
      title: 'Despesas crescendo',
      message: `Suas despesas aumentaram ${dados.crescimentoDespesas.toFixed(1)}% em relação ao mês anterior.`,
    });
  }

  // Gastos fixos altos
  const percentFixos = dados.totalSaidas > 0 ? (dados.gastosFixos / dados.totalSaidas) * 100 : 0;
  if (percentFixos > 70) {
    alertas.push({
      type: 'info',
      title: 'Custos fixos elevados',
      message: `${percentFixos.toFixed(0)}% dos seus gastos são fixos. Considere renegociar contratos.`,
    });
  }

  // Saldo negativo
  if (dados.saldoAtual < 0) {
    alertas.push({
      type: 'danger',
      title: 'Saldo negativo',
      message: 'Seu caixa está no vermelho. Priorize recebimentos pendentes.',
    });
  }

  return alertas;
}

function calcularContasProximas(contas: Conta[]): UpcomingBill[] {
  const hoje = new Date();
  const em30Dias = new Date();
  em30Dias.setDate(em30Dias.getDate() + 30);

  const hojeStr = format(hoje, 'yyyy-MM-dd');
  const em30DiasStr = format(em30Dias, 'yyyy-MM-dd');

  return contas
    .filter(c =>
      ['pendente', 'atrasado'].includes(c.status) &&
      c.data_vencimento >= hojeStr &&
      c.data_vencimento <= em30DiasStr
    )
    .map(c => ({
      descricao: c.descricao,
      valor: Number(c.valor),
      vencimento: c.data_vencimento,
      diasRestantes: differenceInDays(new Date(c.data_vencimento), hoje),
      tipo: c.tipo,
    }))
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
    .slice(0, 10);
}

// ==================== FORMATAÇÃO PARA IA ====================

export function formatarMetricasParaIA(metrics: ReportMetrics, empresa: { nome: string; tipo_negocio: string }): string {
  return `
=== DADOS FINANCEIROS ===
Empresa: ${empresa.nome}
Tipo: ${empresa.tipo_negocio}

=== RESUMO DO PERÍODO ===
Total Entradas: R$ ${metrics.totalEntradas.toFixed(2)}
Total Saídas: R$ ${metrics.totalSaidas.toFixed(2)}
Resultado: R$ ${metrics.resultado.toFixed(2)}
Margem Operacional: ${metrics.margemOperacional.toFixed(1)}%

=== INDICADORES AVANÇADOS ===
Burn Rate (gasto diário): R$ ${metrics.burnRate.toFixed(2)}/dia
Runway (dias de caixa): ${metrics.runway} dias
Ticket Médio: R$ ${metrics.ticketMedio.toFixed(2)}
Dias com Saldo Negativo: ${metrics.diasSaldoNegativo}
${metrics.crescimentoReceita !== null ? `Crescimento Receita: ${metrics.crescimentoReceita.toFixed(1)}%` : ''}
${metrics.crescimentoDespesas !== null ? `Crescimento Despesas: ${metrics.crescimentoDespesas.toFixed(1)}%` : ''}

=== ESTRUTURA DE CUSTOS ===
Gastos Fixos: R$ ${metrics.gastosFixos.toFixed(2)} (${metrics.percentualFixos.toFixed(0)}%)
Gastos Variáveis: R$ ${metrics.gastosVariaveis.toFixed(2)} (${(100 - metrics.percentualFixos).toFixed(0)}%)

=== SAÚDE DO CAIXA ===
Pontuação: ${metrics.saudeCaixa}/100 (${metrics.saudeCaixaLabel})

=== TOP 5 ENTRADAS ===
${metrics.entradasPorCategoria.slice(0, 5).map((c, i) => `${i + 1}. ${c.name}: R$ ${c.value.toFixed(2)} (${c.percentage.toFixed(1)}%)`).join('\n')}

=== TOP 5 DESPESAS ===
${metrics.saidasPorCategoria.slice(0, 5).map((c, i) => `${i + 1}. ${c.name}: R$ ${c.value.toFixed(2)} (${c.percentage.toFixed(1)}%)${c.isFixed ? ' [FIXO]' : ''}`).join('\n')}

=== CONTAS A PAGAR (Próx. 30 dias) ===
${metrics.contasProximas.length > 0
    ? metrics.contasProximas.map(c => `• ${c.descricao}: R$ ${c.valor.toFixed(2)} - Vence em ${c.diasRestantes} dias`).join('\n')
    : 'Nenhuma conta pendente nos próximos 30 dias'}

=== ALERTAS IDENTIFICADOS ===
${metrics.alertas.length > 0
    ? metrics.alertas.map(a => `[${a.type.toUpperCase()}] ${a.title}: ${a.message}`).join('\n')
    : 'Nenhum alerta no momento'}

=== EVOLUÇÃO MENSAL (Últimos 6 meses) ===
${metrics.evolucaoMensal.map(m => `${m.mesFormatado}: Entradas R$ ${m.entradas.toFixed(2)} | Saídas R$ ${m.saidas.toFixed(2)} | Resultado R$ ${m.resultado.toFixed(2)}`).join('\n')}
`;
}
