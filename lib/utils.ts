import { format, formatDistanceToNow, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ==================== FORMATAÇÃO DE MOEDA ====================

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

export function formatarMoedaCurta(valor: number): string {
  if (valor >= 1000000) {
    return `R$ ${(valor / 1000000).toFixed(1)}M`;
  }
  if (valor >= 1000) {
    return `R$ ${(valor / 1000).toFixed(1)}k`;
  }
  return formatarMoeda(valor);
}

// ==================== FORMATAÇÃO DE DATA ====================

export function formatarData(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data + 'T00:00:00') : data;
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

export function formatarDataCurta(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data + 'T00:00:00') : data;
  
  if (isToday(d)) return 'Hoje';
  if (isTomorrow(d)) return 'Amanhã';
  
  return format(d, "dd 'de' MMM", { locale: ptBR });
}

export function formatarDataRelativa(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data + 'T00:00:00') : data;
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

export function formatarMesAno(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data + 'T00:00:00') : data;
  return format(d, "MMMM 'de' yyyy", { locale: ptBR });
}

// ==================== VERIFICAÇÃO DE DATAS ====================

export function isVencendoEm(data: string, dias: number): boolean {
  const d = new Date(data + 'T00:00:00');
  const limite = addDays(new Date(), dias);
  return d <= limite && !isPast(d);
}

export function isAtrasado(data: string): boolean {
  const d = new Date(data + 'T00:00:00');
  return isPast(d) && !isToday(d);
}

// ==================== FORMATAÇÃO DE PERCENTUAL ====================

export function formatarPercentual(valor: number): string {
  return `${valor.toFixed(1)}%`;
}

// ==================== HELPERS GERAIS ====================

export function gerarId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function truncarTexto(texto: string, tamanho: number): string {
  if (texto.length <= tamanho) return texto;
  return texto.substring(0, tamanho) + '...';
}

export function capitalizarPrimeiraLetra(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

// ==================== CÁLCULOS FINANCEIROS ====================

export function calcularVariacao(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
}

export function calcularDiasParaZerar(saldo: number, mediaSaidas: number): number | null {
  if (saldo <= 0) return 0;
  if (mediaSaidas <= 0) return null;
  return Math.floor(saldo / mediaSaidas);
}

// ==================== CORES ====================

export const CORES_GRAFICO = [
  '#06b6d4', // cyan
  '#10b981', // verde
  '#8b5cf6', // roxo
  '#f59e0b', // amarelo
  '#ef4444', // vermelho
  '#3b82f6', // azul
  '#ec4899', // rosa
  '#14b8a6', // teal
  '#f97316', // laranja
  '#6366f1', // indigo
];

export function getCorCategoria(index: number): string {
  return CORES_GRAFICO[index % CORES_GRAFICO.length];
}
