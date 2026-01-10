// ==================== TIPOS PRINCIPAIS ====================

export type TipoNegocio = 'beleza' | 'alimentacao' | 'comercio' | 'servicos' | 'oficina' | 'outro';
export type FaixaFaturamento = 'ate5k' | '5a10k' | '10a20k' | 'acima20k' | 'naosei';
export type DorPrincipal = 'nao_sobra' | 'mistura_dinheiro' | 'esquece_contas' | 'nao_sabe_lucro' | 'comecando';

export type TipoLancamento = 'entrada' | 'saida';
export type StatusConta = 'pendente' | 'pago' | 'atrasado' | 'cancelado';

// ==================== CATEGORIAS POR TIPO DE NEGÓCIO ====================

export const CATEGORIAS_BASE = {
  // Entradas
  vendas: { label: 'Vendas', tipo: 'entrada' as TipoLancamento, icone: '💰' },
  servicos: { label: 'Serviços', tipo: 'entrada' as TipoLancamento, icone: '✂️' },
  freela_entrada: { label: 'Freela/Jobs', tipo: 'entrada' as TipoLancamento, icone: '💼' },
  outros_receitas: { label: 'Outras Receitas', tipo: 'entrada' as TipoLancamento, icone: '📥' },
  
  // Saídas gerais
  fornecedores: { label: 'Fornecedores', tipo: 'saida' as TipoLancamento, icone: '📦' },
  freela_saida: { label: 'Freela/Terceiros', tipo: 'saida' as TipoLancamento, icone: '💼' },
  aluguel: { label: 'Aluguel', tipo: 'saida' as TipoLancamento, icone: '🏠' },
  energia: { label: 'Energia/Luz', tipo: 'saida' as TipoLancamento, icone: '💡' },
  agua: { label: 'Água', tipo: 'saida' as TipoLancamento, icone: '💧' },
  internet: { label: 'Internet/Telefone', tipo: 'saida' as TipoLancamento, icone: '📱' },
  salarios: { label: 'Salários/Funcionários', tipo: 'saida' as TipoLancamento, icone: '👥' },
  impostos: { label: 'Impostos/DAS', tipo: 'saida' as TipoLancamento, icone: '📋' },
  marketing: { label: 'Marketing/Divulgação', tipo: 'saida' as TipoLancamento, icone: '📢' },
  transporte: { label: 'Transporte/Combustível', tipo: 'saida' as TipoLancamento, icone: '🚗' },
  manutencao: { label: 'Manutenção', tipo: 'saida' as TipoLancamento, icone: '🔧' },
  equipamentos: { label: 'Equipamentos', tipo: 'saida' as TipoLancamento, icone: '🖥️' },
  assinaturas: { label: 'Assinaturas/Software', tipo: 'saida' as TipoLancamento, icone: '💻' },
  prolabore: { label: 'Pró-labore (Seu Salário)', tipo: 'saida' as TipoLancamento, icone: '💵' },
  outros_despesas: { label: 'Outras Despesas', tipo: 'saida' as TipoLancamento, icone: '📤' },
};

// Categorias específicas por tipo de negócio
export const CATEGORIAS_POR_NEGOCIO: Record<TipoNegocio, string[]> = {
  beleza: ['produtos_beleza', 'equipamentos_salao'],
  alimentacao: ['ingredientes', 'embalagens', 'gas'],
  comercio: ['estoque', 'embalagens'],
  servicos: ['software', 'equipamentos'],
  oficina: ['pecas', 'ferramentas'],
  outro: [],
};

export const CATEGORIAS_ESPECIFICAS = {
  produtos_beleza: { label: 'Produtos de Beleza', tipo: 'saida' as TipoLancamento, icone: '💄' },
  equipamentos_salao: { label: 'Equipamentos Salão', tipo: 'saida' as TipoLancamento, icone: '💇' },
  ingredientes: { label: 'Ingredientes', tipo: 'saida' as TipoLancamento, icone: '🥬' },
  embalagens: { label: 'Embalagens', tipo: 'saida' as TipoLancamento, icone: '📦' },
  gas: { label: 'Gás', tipo: 'saida' as TipoLancamento, icone: '🔥' },
  estoque: { label: 'Estoque/Mercadorias', tipo: 'saida' as TipoLancamento, icone: '🏷️' },
  software: { label: 'Software/Assinaturas', tipo: 'saida' as TipoLancamento, icone: '💻' },
  pecas: { label: 'Peças', tipo: 'saida' as TipoLancamento, icone: '⚙️' },
  ferramentas: { label: 'Ferramentas', tipo: 'saida' as TipoLancamento, icone: '🔨' },
};

export type CategoriaBase = keyof typeof CATEGORIAS_BASE;
export type CategoriaEspecifica = keyof typeof CATEGORIAS_ESPECIFICAS;
export type Categoria = CategoriaBase | CategoriaEspecifica;

// ==================== MODELOS DO BANCO ====================

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  telefone?: string;
  created_at: string;
}

export interface Empresa {
  id: string;
  usuario_id: string;
  nome: string;
  cnpj?: string;
  tipo_negocio: TipoNegocio;
  faixa_faturamento: FaixaFaturamento;
  dor_principal: DorPrincipal;
  saldo_inicial: number;
  prolabore_definido: number;
  data_inicio: string;
  created_at: string;
  updated_at: string;
}

export interface Lancamento {
  id: string;
  empresa_id: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  categoria: Categoria;
  data: string;
  fornecedor_id?: string;
  observacao?: string;
  created_at: string;
}

export interface Conta {
  id: string;
  empresa_id: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  categoria: Categoria;
  data_vencimento: string;
  data_pagamento?: string;
  status: StatusConta;
  fornecedor_id?: string;
  recorrente: boolean;
  observacao?: string;
  created_at: string;
}

export interface Fornecedor {
  id: string;
  empresa_id: string;
  nome: string;
  categoria: string;
  contato?: string;
  telefone?: string;
  email?: string;
  observacao?: string;
  created_at: string;
}

export interface RetiradaProlabore {
  id: string;
  empresa_id: string;
  valor: number;
  data: string;
  observacao?: string;
  created_at: string;
}

export interface Configuracao {
  id: string;
  empresa_id: string;
  xai_api_key?: string;
  alerta_dias_antes: number;
  notificacoes_push: boolean;
  dia_resumo_semanal: number; // 0 = domingo, 1 = segunda, 6 = sábado
  created_at: string;
  updated_at: string;
}

// ==================== TIPOS AUXILIARES ====================

export interface ResumoFinanceiro {
  saldoAtual: number;
  totalEntradas: number;
  totalSaidas: number;
  resultado: number;
  contasAVencer: number;
  contasAtrasadas: number;
  totalProlaboreRetirado: number;
  prolaboreDisponivel: number;
}

export interface DadosOnboarding {
  nome: string;
  nomeEmpresa: string;
  tipoNegocio: TipoNegocio;
  faixaFaturamento: FaixaFaturamento;
  dorPrincipal: DorPrincipal;
}

export interface InsightIA {
  tipo: 'info' | 'alerta' | 'dica' | 'positivo';
  icone: string;
  titulo: string;
  descricao: string;
}

// ==================== REFERÊNCIAS PRÓ-LABORE ====================

export const PROLABORE_REFERENCIA: Record<TipoNegocio, { margemMinima: number; margemMaxima: number; prolaboreMin: number; prolaboreMax: number }> = {
  beleza: { margemMinima: 35, margemMaxima: 50, prolaboreMin: 20, prolaboreMax: 30 },
  alimentacao: { margemMinima: 25, margemMaxima: 35, prolaboreMin: 15, prolaboreMax: 25 },
  comercio: { margemMinima: 20, margemMaxima: 40, prolaboreMin: 10, prolaboreMax: 20 },
  servicos: { margemMinima: 50, margemMaxima: 80, prolaboreMin: 40, prolaboreMax: 60 },
  oficina: { margemMinima: 30, margemMaxima: 45, prolaboreMin: 20, prolaboreMax: 30 },
  outro: { margemMinima: 25, margemMaxima: 45, prolaboreMin: 20, prolaboreMax: 35 },
};

export const FATURAMENTO_VALORES: Record<FaixaFaturamento, { min: number; max: number; medio: number }> = {
  ate5k: { min: 0, max: 5000, medio: 3000 },
  '5a10k': { min: 5000, max: 10000, medio: 7500 },
  '10a20k': { min: 10000, max: 20000, medio: 15000 },
  acima20k: { min: 20000, max: 50000, medio: 30000 },
  naosei: { min: 0, max: 10000, medio: 5000 },
};
