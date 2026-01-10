import { Lancamento, ContaPagarReceber, Configuracao, ResumoFinanceiro, StatusConta } from './types';

// Keys do localStorage
const KEYS = {
  lancamentos: 'caixaclaro_lancamentos',
  contas: 'caixaclaro_contas',
  config: 'caixaclaro_config',
};

// Gerar ID único
export function gerarId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== CONFIGURAÇÃO ====================

export function getConfiguracao(): Configuracao {
  if (typeof window === 'undefined') return getConfigPadrao();
  
  const data = localStorage.getItem(KEYS.config);
  if (!data) return getConfigPadrao();
  
  try {
    return JSON.parse(data);
  } catch {
    return getConfigPadrao();
  }
}

export function salvarConfiguracao(config: Configuracao): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.config, JSON.stringify(config));
}

function getConfigPadrao(): Configuracao {
  return {
    nomeEmpresa: 'Minha Empresa',
    saldoInicial: 0,
    dataInicio: new Date().toISOString().split('T')[0],
    moeda: 'BRL',
    alertaDiasAntes: 7,
  };
}

// ==================== LANÇAMENTOS ====================

export function getLancamentos(): Lancamento[] {
  if (typeof window === 'undefined') return [];
  
  const data = localStorage.getItem(KEYS.lancamentos);
  if (!data) return [];
  
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function salvarLancamento(lancamento: Omit<Lancamento, 'id' | 'createdAt' | 'updatedAt'>): Lancamento {
  const lancamentos = getLancamentos();
  const now = new Date().toISOString();
  
  const novo: Lancamento = {
    ...lancamento,
    id: gerarId(),
    createdAt: now,
    updatedAt: now,
  };
  
  lancamentos.push(novo);
  localStorage.setItem(KEYS.lancamentos, JSON.stringify(lancamentos));
  
  return novo;
}

export function atualizarLancamento(id: string, dados: Partial<Lancamento>): Lancamento | null {
  const lancamentos = getLancamentos();
  const index = lancamentos.findIndex(l => l.id === id);
  
  if (index === -1) return null;
  
  lancamentos[index] = {
    ...lancamentos[index],
    ...dados,
    updatedAt: new Date().toISOString(),
  };
  
  localStorage.setItem(KEYS.lancamentos, JSON.stringify(lancamentos));
  return lancamentos[index];
}

export function excluirLancamento(id: string): boolean {
  const lancamentos = getLancamentos();
  const filtrados = lancamentos.filter(l => l.id !== id);
  
  if (filtrados.length === lancamentos.length) return false;
  
  localStorage.setItem(KEYS.lancamentos, JSON.stringify(filtrados));
  return true;
}

// ==================== CONTAS A PAGAR/RECEBER ====================

export function getContas(): ContaPagarReceber[] {
  if (typeof window === 'undefined') return [];
  
  const data = localStorage.getItem(KEYS.contas);
  if (!data) return [];
  
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function salvarConta(conta: Omit<ContaPagarReceber, 'id' | 'createdAt' | 'updatedAt'>): ContaPagarReceber {
  const contas = getContas();
  const now = new Date().toISOString();
  
  const nova: ContaPagarReceber = {
    ...conta,
    id: gerarId(),
    createdAt: now,
    updatedAt: now,
  };
  
  contas.push(nova);
  localStorage.setItem(KEYS.contas, JSON.stringify(contas));
  
  return nova;
}

export function atualizarConta(id: string, dados: Partial<ContaPagarReceber>): ContaPagarReceber | null {
  const contas = getContas();
  const index = contas.findIndex(c => c.id === id);
  
  if (index === -1) return null;
  
  contas[index] = {
    ...contas[index],
    ...dados,
    updatedAt: new Date().toISOString(),
  };
  
  localStorage.setItem(KEYS.contas, JSON.stringify(contas));
  return contas[index];
}

export function marcarComoPago(id: string): ContaPagarReceber | null {
  return atualizarConta(id, {
    status: 'pago',
    dataPagamento: new Date().toISOString().split('T')[0],
  });
}

export function excluirConta(id: string): boolean {
  const contas = getContas();
  const filtradas = contas.filter(c => c.id !== id);
  
  if (filtradas.length === contas.length) return false;
  
  localStorage.setItem(KEYS.contas, JSON.stringify(filtradas));
  return true;
}

// ==================== CÁLCULOS FINANCEIROS ====================

export function calcularResumo(): ResumoFinanceiro {
  const config = getConfiguracao();
  const lancamentos = getLancamentos();
  const contas = getContas();
  
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  
  // Lançamentos do mês atual
  const lancamentosMes = lancamentos.filter(l => {
    const data = new Date(l.data);
    return data >= inicioMes && data <= fimMes;
  });
  
  const totalEntradas = lancamentosMes
    .filter(l => l.tipo === 'entrada')
    .reduce((acc, l) => acc + l.valor, 0);
  
  const totalSaidas = lancamentosMes
    .filter(l => l.tipo === 'saida')
    .reduce((acc, l) => acc + l.valor, 0);
  
  // Saldo atual = saldo inicial + todas entradas - todas saídas
  const todasEntradas = lancamentos
    .filter(l => l.tipo === 'entrada')
    .reduce((acc, l) => acc + l.valor, 0);
  
  const todasSaidas = lancamentos
    .filter(l => l.tipo === 'saida')
    .reduce((acc, l) => acc + l.valor, 0);
  
  const saldoAtual = config.saldoInicial + todasEntradas - todasSaidas;
  
  // Contas pendentes
  const contasPendentes = contas.filter(c => c.status === 'pendente' || c.status === 'atrasado');
  
  const contasAVencer = contasPendentes.filter(c => {
    const vencimento = new Date(c.dataVencimento);
    return vencimento >= hoje;
  }).length;
  
  const contasAtrasadas = contasPendentes.filter(c => {
    const vencimento = new Date(c.dataVencimento);
    return vencimento < hoje;
  }).length;
  
  // Atualizar status de contas atrasadas
  contasPendentes.forEach(c => {
    const vencimento = new Date(c.dataVencimento);
    if (vencimento < hoje && c.status === 'pendente') {
      atualizarConta(c.id, { status: 'atrasado' });
    }
  });
  
  // Previsão próximos 30 dias
  const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const entradasPrevistas = contas
    .filter(c => {
      const venc = new Date(c.dataVencimento);
      return c.tipo === 'entrada' && c.status === 'pendente' && venc <= em30Dias;
    })
    .reduce((acc, c) => acc + c.valor, 0);
  
  const saidasPrevistas = contas
    .filter(c => {
      const venc = new Date(c.dataVencimento);
      return c.tipo === 'saida' && (c.status === 'pendente' || c.status === 'atrasado') && venc <= em30Dias;
    })
    .reduce((acc, c) => acc + c.valor, 0);
  
  const previsaoProximos30Dias = saldoAtual + entradasPrevistas - saidasPrevistas;
  
  return {
    saldoAtual,
    totalEntradas,
    totalSaidas,
    resultado: totalEntradas - totalSaidas,
    contasAVencer,
    contasAtrasadas,
    previsaoProximos30Dias,
  };
}

export function calcularDiasParaZerar(): number | null {
  const resumo = calcularResumo();
  const contas = getContas();
  
  if (resumo.saldoAtual <= 0) return 0;
  
  // Calcular média de saídas diárias dos últimos 30 dias
  const lancamentos = getLancamentos();
  const hoje = new Date();
  const ha30Dias = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const saidasUltimos30 = lancamentos
    .filter(l => {
      const data = new Date(l.data);
      return l.tipo === 'saida' && data >= ha30Dias && data <= hoje;
    })
    .reduce((acc, l) => acc + l.valor, 0);
  
  const mediaDiaria = saidasUltimos30 / 30;
  
  if (mediaDiaria === 0) return null; // Sem histórico suficiente
  
  // Considerar também contas a vencer
  const contasProximas = contas
    .filter(c => {
      const venc = new Date(c.dataVencimento);
      return c.tipo === 'saida' && (c.status === 'pendente' || c.status === 'atrasado');
    })
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());
  
  let saldo = resumo.saldoAtual;
  let dias = 0;
  
  for (const conta of contasProximas) {
    const vencimento = new Date(conta.dataVencimento);
    const diasAteVencimento = Math.max(0, Math.ceil((vencimento.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000)));
    
    // Consumo diário até a conta
    const consumoAteConta = diasAteVencimento * mediaDiaria;
    saldo -= consumoAteConta;
    
    if (saldo <= 0) {
      return dias + Math.ceil(saldo / mediaDiaria) + diasAteVencimento;
    }
    
    saldo -= conta.valor;
    dias = diasAteVencimento;
    
    if (saldo <= 0) {
      return dias;
    }
  }
  
  // Se não zerar com as contas, calcular baseado na média
  return Math.ceil(resumo.saldoAtual / mediaDiaria);
}

// ==================== FORMATAÇÃO ====================

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

export function formatarData(data: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(data));
}

export function formatarDataCurta(data: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(data));
}

// ==================== EXPORT/IMPORT DADOS ====================

export function exportarDados(): string {
  const dados = {
    versao: '1.0',
    exportadoEm: new Date().toISOString(),
    config: getConfiguracao(),
    lancamentos: getLancamentos(),
    contas: getContas(),
  };
  return JSON.stringify(dados, null, 2);
}

export function importarDados(json: string): { sucesso: boolean; mensagem: string } {
  try {
    const dados = JSON.parse(json);
    
    if (!dados.config || !dados.lancamentos || !dados.contas) {
      return { sucesso: false, mensagem: 'Arquivo inválido. Estrutura incorreta.' };
    }
    
    // Limpar dados existentes
    localStorage.removeItem(KEYS.config);
    localStorage.removeItem(KEYS.lancamentos);
    localStorage.removeItem(KEYS.contas);
    
    // Importar novos dados
    localStorage.setItem(KEYS.config, JSON.stringify(dados.config));
    localStorage.setItem(KEYS.lancamentos, JSON.stringify(dados.lancamentos));
    localStorage.setItem(KEYS.contas, JSON.stringify(dados.contas));
    
    return { 
      sucesso: true, 
      mensagem: `Importados: ${dados.lancamentos.length} lançamentos e ${dados.contas.length} contas.` 
    };
  } catch (error) {
    return { sucesso: false, mensagem: 'Erro ao processar arquivo. Verifique o formato.' };
  }
}

// ==================== DADOS DE EXEMPLO ====================

export function carregarDadosExemplo(): void {
  // Limpar dados existentes
  localStorage.removeItem(KEYS.lancamentos);
  localStorage.removeItem(KEYS.contas);
  localStorage.removeItem(KEYS.config);
  
  // Configuração
  salvarConfiguracao({
    nomeEmpresa: 'Salão da Maria',
    saldoInicial: 5000,
    dataInicio: '2024-01-01',
    moeda: 'BRL',
    alertaDiasAntes: 7,
  });
  
  const hoje = new Date();
  const mes = hoje.getMonth();
  const ano = hoje.getFullYear();
  
  // Lançamentos do mês
  const lancamentosExemplo = [
    { tipo: 'entrada' as const, descricao: 'Corte + Escova - Ana', valor: 150, categoria: 'servicos' as const, data: `${ano}-${String(mes + 1).padStart(2, '0')}-03` },
    { tipo: 'entrada' as const, descricao: 'Manicure - Carla', valor: 80, categoria: 'servicos' as const, data: `${ano}-${String(mes + 1).padStart(2, '0')}-05` },
    { tipo: 'entrada' as const, descricao: 'Coloração - Paula', valor: 350, categoria: 'servicos' as const, data: `${ano}-${String(mes + 1).padStart(2, '0')}-08` },
    { tipo: 'entrada' as const, descricao: 'Venda Shampoo', valor: 65, categoria: 'vendas' as const, data: `${ano}-${String(mes + 1).padStart(2, '0')}-10` },
    { tipo: 'entrada' as const, descricao: 'Corte Masculino x3', valor: 120, categoria: 'servicos' as const, data: `${ano}-${String(mes + 1).padStart(2, '0')}-12` },
    { tipo: 'saida' as const, descricao: 'Produtos - Fornecedor', valor: 450, categoria: 'fornecedores' as const, data: `${ano}-${String(mes + 1).padStart(2, '0')}-02` },
    { tipo: 'saida' as const, descricao: 'Conta de Luz', valor: 280, categoria: 'energia' as const, data: `${ano}-${String(mes + 1).padStart(2, '0')}-10` },
    { tipo: 'saida' as const, descricao: 'Internet', valor: 120, categoria: 'internet' as const, data: `${ano}-${String(mes + 1).padStart(2, '0')}-15` },
  ];
  
  lancamentosExemplo.forEach(l => salvarLancamento(l));
  
  // Contas a pagar/receber
  const contasExemplo = [
    { tipo: 'saida' as const, descricao: 'Aluguel do Salão', valor: 1500, categoria: 'aluguel' as const, dataVencimento: `${ano}-${String(mes + 1).padStart(2, '0')}-20`, status: 'pendente' as StatusConta },
    { tipo: 'saida' as const, descricao: 'DAS MEI', valor: 71.60, categoria: 'impostos' as const, dataVencimento: `${ano}-${String(mes + 1).padStart(2, '0')}-20`, status: 'pendente' as StatusConta },
    { tipo: 'saida' as const, descricao: 'Conta de Água', valor: 85, categoria: 'agua' as const, dataVencimento: `${ano}-${String(mes + 1).padStart(2, '0')}-25`, status: 'pendente' as StatusConta },
    { tipo: 'entrada' as const, descricao: 'Pacote Mensal - Cliente VIP', valor: 800, categoria: 'servicos' as const, dataVencimento: `${ano}-${String(mes + 1).padStart(2, '0')}-28`, status: 'pendente' as StatusConta },
  ];
  
  contasExemplo.forEach(c => salvarConta(c));
}
