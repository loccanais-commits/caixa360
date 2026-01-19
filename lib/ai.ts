// Serviço de IA - Integração com X.AI (Grok)
// NOTA: API Key agora é gerenciada apenas no servidor via env vars (XAI_API_KEY)
// Todas as chamadas à IA devem passar pelas APIs do backend

import { Lancamento, Categoria, CATEGORIAS } from './types';

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

// API Key é obtida apenas do servidor (process.env.XAI_API_KEY)
// Funções legadas mantidas para compatibilidade, mas não armazenam mais em localStorage
export function getApiKey(): string | null {
  // Retorna null no cliente - API key só existe no servidor
  if (typeof window !== 'undefined') return null;
  return process.env.XAI_API_KEY || null;
}

export function setApiKey(_key: string): void {
  // Função desabilitada por segurança
  // API key deve ser configurada via variáveis de ambiente no servidor
  console.warn('setApiKey está desabilitada. Configure XAI_API_KEY no servidor.');
}

export function hasApiKey(): boolean {
  // No cliente, verificar via API do backend
  if (typeof window !== 'undefined') {
    // Retorna false no cliente - use as APIs do backend
    return false;
  }
  return !!process.env.XAI_API_KEY;
}

// Interface para resposta da IA
interface IAResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Função base para chamar a API
async function callXAI(messages: { role: string; content: string }[]): Promise<IAResponse> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return { success: false, error: 'API Key não configurada' };
  }

  try {
    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3-fast',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Erro na API: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    return { success: true, data: content };
  } catch (error) {
    return { success: false, error: `Erro de conexão: ${error}` };
  }
}

// ==================== CATEGORIZAÇÃO AUTOMÁTICA ====================

const CATEGORIAS_LISTA = Object.entries(CATEGORIAS).map(([key, val]) => ({
  key,
  label: val.label,
  tipo: val.tipo,
}));

export async function categorizarTransacao(descricao: string, valor: number): Promise<{
  categoria: Categoria;
  tipo: 'entrada' | 'saida';
  confianca: number;
}> {
  // Primeiro, tentar categorização local (regras simples)
  const categoriaLocal = categorizarLocal(descricao);
  if (categoriaLocal) {
    return categoriaLocal;
  }

  // Se não conseguir localmente, usar IA
  const categoriasEntrada = CATEGORIAS_LISTA.filter(c => c.tipo === 'entrada').map(c => c.label).join(', ');
  const categoriasSaida = CATEGORIAS_LISTA.filter(c => c.tipo === 'saida').map(c => c.label).join(', ');

  const prompt = `Você é um assistente financeiro. Categorize esta transação bancária brasileira.

Descrição: "${descricao}"
Valor: R$ ${valor.toFixed(2)}

Categorias de ENTRADA (receita): ${categoriasEntrada}
Categorias de SAÍDA (despesa): ${categoriasSaida}

Responda APENAS no formato JSON:
{"tipo": "entrada" ou "saida", "categoria": "nome_da_categoria", "confianca": 0.0 a 1.0}

Use o nome exato da categoria. Se não tiver certeza, use "outros_receitas" ou "outros_despesas".`;

  const response = await callXAI([{ role: 'user', content: prompt }]);

  if (!response.success || !response.data) {
    // Fallback: assumir saída se valor positivo no extrato geralmente é débito
    return {
      categoria: 'outros_despesas',
      tipo: 'saida',
      confianca: 0.3,
    };
  }

  try {
    // Extrair JSON da resposta
    const jsonMatch = response.data.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const categoriaKey = Object.entries(CATEGORIAS).find(
        ([_, val]) => val.label.toLowerCase() === parsed.categoria?.toLowerCase()
      )?.[0] as Categoria;

      return {
        categoria: categoriaKey || (parsed.tipo === 'entrada' ? 'outros_receitas' : 'outros_despesas'),
        tipo: parsed.tipo || 'saida',
        confianca: parsed.confianca || 0.7,
      };
    }
  } catch (e) {
    console.error('Erro ao parsear resposta da IA:', e);
  }

  return {
    categoria: 'outros_despesas',
    tipo: 'saida',
    confianca: 0.3,
  };
}

// Categorização local com regras simples (sem API)
function categorizarLocal(descricao: string): { categoria: Categoria; tipo: 'entrada' | 'saida'; confianca: number } | null {
  const desc = descricao.toLowerCase();

  // Regras de SAÍDA
  const regras: { palavras: string[]; categoria: Categoria; tipo: 'entrada' | 'saida' }[] = [
    // Transporte
    { palavras: ['uber', '99', 'cabify', 'combustivel', 'gasolina', 'alcool', 'posto', 'estacionamento', 'pedagio'], categoria: 'transporte', tipo: 'saida' },
    // Alimentação
    { palavras: ['ifood', 'rappi', 'restaurante', 'lanchonete', 'padaria', 'mercado', 'supermercado', 'açougue', 'hortifruti'], categoria: 'alimentacao', tipo: 'saida' },
    // Energia
    { palavras: ['cpfl', 'enel', 'eletropaulo', 'cemig', 'copel', 'celesc', 'energia', 'luz'], categoria: 'energia', tipo: 'saida' },
    // Água
    { palavras: ['sabesp', 'copasa', 'sanepar', 'agua', 'saneamento'], categoria: 'agua', tipo: 'saida' },
    // Internet/Telefone
    { palavras: ['vivo', 'claro', 'tim', 'oi', 'net', 'internet', 'telefone', 'celular'], categoria: 'internet', tipo: 'saida' },
    // Impostos
    { palavras: ['das', 'mei', 'simples', 'imposto', 'tributo', 'receita federal', 'inss', 'fgts', 'darf'], categoria: 'impostos', tipo: 'saida' },
    // Aluguel
    { palavras: ['aluguel', 'locacao', 'condominio'], categoria: 'aluguel', tipo: 'saida' },
    // Marketing
    { palavras: ['facebook ads', 'google ads', 'instagram', 'marketing', 'publicidade', 'anuncio'], categoria: 'marketing', tipo: 'saida' },
    // Fornecedores
    { palavras: ['fornecedor', 'atacado', 'distribuidor', 'material', 'insumo', 'mercadoria'], categoria: 'fornecedores', tipo: 'saida' },
    
    // Regras de ENTRADA
    { palavras: ['pix recebido', 'transferencia recebida', 'deposito', 'ted recebida', 'doc recebida'], categoria: 'outros_receitas', tipo: 'entrada' },
    { palavras: ['venda', 'pagamento recebido', 'cliente'], categoria: 'vendas', tipo: 'entrada' },
    { palavras: ['servico', 'prestacao', 'honorario', 'consultoria'], categoria: 'servicos', tipo: 'entrada' },
  ];

  for (const regra of regras) {
    if (regra.palavras.some(p => desc.includes(p))) {
      return {
        categoria: regra.categoria,
        tipo: regra.tipo,
        confianca: 0.85,
      };
    }
  }

  return null;
}

// ==================== INSIGHTS SEMANAIS ====================

export interface Insight {
  tipo: 'info' | 'alerta' | 'dica' | 'positivo';
  icone: string;
  titulo: string;
  descricao: string;
}

export async function gerarInsights(dados: {
  saldoAtual: number;
  totalEntradas: number;
  totalSaidas: number;
  resultado: number;
  contasAVencer: number;
  contasAtrasadas: number;
  maiorGasto?: { categoria: string; valor: number; percentual: number };
  lancamentosRecentes?: Lancamento[];
}): Promise<Insight[]> {
  // Insights locais (sem API)
  const insightsLocais: Insight[] = [];

  // Saldo baixo
  if (dados.saldoAtual < 500) {
    insightsLocais.push({
      tipo: 'alerta',
      icone: '⚠️',
      titulo: 'Saldo baixo',
      descricao: `Seu saldo está em ${formatarMoeda(dados.saldoAtual)}. Considere adiar gastos não essenciais.`,
    });
  }

  // Contas atrasadas
  if (dados.contasAtrasadas > 0) {
    insightsLocais.push({
      tipo: 'alerta',
      icone: '🔴',
      titulo: `${dados.contasAtrasadas} conta(s) atrasada(s)`,
      descricao: 'Regularize para evitar juros e multas.',
    });
  }

  // Contas a vencer
  if (dados.contasAVencer > 0) {
    insightsLocais.push({
      tipo: 'info',
      icone: '📅',
      titulo: `${dados.contasAVencer} conta(s) a vencer`,
      descricao: 'Programe-se para não atrasar.',
    });
  }

  // Resultado positivo
  if (dados.resultado > 0) {
    insightsLocais.push({
      tipo: 'positivo',
      icone: '✅',
      titulo: 'Mês positivo!',
      descricao: `Você está com lucro de ${formatarMoeda(dados.resultado)} este mês.`,
    });
  }

  // Resultado negativo
  if (dados.resultado < 0) {
    insightsLocais.push({
      tipo: 'alerta',
      icone: '📉',
      titulo: 'Mês no vermelho',
      descricao: `Prejuízo de ${formatarMoeda(Math.abs(dados.resultado))}. Revise seus gastos.`,
    });
  }

  // Maior gasto
  if (dados.maiorGasto && dados.maiorGasto.percentual > 30) {
    insightsLocais.push({
      tipo: 'dica',
      icone: '💡',
      titulo: `${dados.maiorGasto.categoria} é seu maior gasto`,
      descricao: `Representa ${dados.maiorGasto.percentual.toFixed(0)}% das despesas. Vale revisar?`,
    });
  }

  // Se tem API Key, gerar insight personalizado com IA
  if (hasApiKey()) {
    try {
      const insightIA = await gerarInsightIA(dados);
      if (insightIA) {
        insightsLocais.unshift(insightIA); // Adicionar no início
      }
    } catch (e) {
      console.error('Erro ao gerar insight IA:', e);
    }
  }

  return insightsLocais.slice(0, 5); // Máximo 5 insights
}

async function gerarInsightIA(dados: any): Promise<Insight | null> {
  const prompt = `Você é um consultor financeiro para pequenas empresas brasileiras. Analise estes dados e dê UMA dica prática e específica.

Dados:
- Saldo atual: R$ ${dados.saldoAtual.toFixed(2)}
- Entradas do mês: R$ ${dados.totalEntradas.toFixed(2)}
- Saídas do mês: R$ ${dados.totalSaidas.toFixed(2)}
- Resultado: R$ ${dados.resultado.toFixed(2)}
- Contas atrasadas: ${dados.contasAtrasadas}
- Contas a vencer: ${dados.contasAVencer}
${dados.maiorGasto ? `- Maior gasto: ${dados.maiorGasto.categoria} (${dados.maiorGasto.percentual.toFixed(0)}% do total)` : ''}

Responda em JSON:
{"titulo": "título curto", "descricao": "dica prática em até 2 linhas", "tipo": "dica"}

Seja específico e prático. Não use termos técnicos.`;

  const response = await callXAI([{ role: 'user', content: prompt }]);

  if (!response.success || !response.data) return null;

  try {
    const jsonMatch = response.data.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        tipo: 'dica',
        icone: '🤖',
        titulo: parsed.titulo || 'Dica do assistente',
        descricao: parsed.descricao || '',
      };
    }
  } catch (e) {
    console.error('Erro ao parsear insight IA:', e);
  }

  return null;
}

// ==================== ASSISTENTE DE PERGUNTAS ====================

export async function perguntarAssistente(
  pergunta: string,
  contexto: {
    saldoAtual: number;
    totalEntradas: number;
    totalSaidas: number;
    contasAVencer: { descricao: string; valor: number; vencimento: string }[];
    ultimosLancamentos: { descricao: string; valor: number; tipo: string; data: string }[];
  }
): Promise<string> {
  if (!hasApiKey()) {
    return 'Para usar o assistente, configure sua chave da API nas configurações.';
  }

  const prompt = `Você é um assistente financeiro para pequenas empresas brasileiras. Responda de forma clara, prática e amigável.

DADOS ATUAIS DO USUÁRIO:
- Saldo em caixa: R$ ${contexto.saldoAtual.toFixed(2)}
- Total de entradas no mês: R$ ${contexto.totalEntradas.toFixed(2)}
- Total de saídas no mês: R$ ${contexto.totalSaidas.toFixed(2)}

PRÓXIMAS CONTAS A PAGAR:
${contexto.contasAVencer.slice(0, 5).map(c => `- ${c.descricao}: R$ ${c.valor.toFixed(2)} (vence ${c.vencimento})`).join('\n') || 'Nenhuma conta pendente'}

ÚLTIMOS LANÇAMENTOS:
${contexto.ultimosLancamentos.slice(0, 5).map(l => `- ${l.descricao}: R$ ${l.valor.toFixed(2)} (${l.tipo}) em ${l.data}`).join('\n') || 'Nenhum lançamento recente'}

PERGUNTA DO USUÁRIO: ${pergunta}

Responda de forma direta e prática. Se a pergunta for sobre "posso gastar X?", analise se o saldo permite considerando as contas a vencer.`;

  const response = await callXAI([{ role: 'user', content: prompt }]);

  if (!response.success) {
    return response.error || 'Não foi possível processar sua pergunta. Tente novamente.';
  }

  return response.data || 'Não entendi sua pergunta. Pode reformular?';
}

// ==================== ANÁLISE DE EXTRATO IMPORTADO ====================

export async function analisarExtrato(transacoes: { descricao: string; valor: number; data: string }[]): Promise<{
  categorizadas: { descricao: string; valor: number; data: string; categoria: Categoria; tipo: 'entrada' | 'saida' }[];
  resumo: string;
}> {
  const categorizadas = [];

  // Categorizar cada transação
  for (const trans of transacoes) {
    // Determinar se é entrada ou saída pelo valor (positivo = entrada, negativo = saída)
    // Ou tentar pela descrição
    const resultado = await categorizarTransacao(trans.descricao, Math.abs(trans.valor));
    
    categorizadas.push({
      ...trans,
      valor: Math.abs(trans.valor),
      categoria: resultado.categoria,
      tipo: trans.valor >= 0 ? 'entrada' : 'saida' as 'entrada' | 'saida',
    });
  }

  // Gerar resumo
  const totalEntradas = categorizadas.filter(c => c.tipo === 'entrada').reduce((a, c) => a + c.valor, 0);
  const totalSaidas = categorizadas.filter(c => c.tipo === 'saida').reduce((a, c) => a + c.valor, 0);

  const resumo = `Importadas ${categorizadas.length} transações: ${categorizadas.filter(c => c.tipo === 'entrada').length} entradas (${formatarMoeda(totalEntradas)}) e ${categorizadas.filter(c => c.tipo === 'saida').length} saídas (${formatarMoeda(totalSaidas)}).`;

  return { categorizadas, resumo };
}

// Helper para formatar moeda
function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}
