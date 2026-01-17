import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

// Limites
const MAX_IA_REPORTS = 2;

// Prompt profissional estruturado
const SYSTEM_PROMPT = `Você é um consultor financeiro sênior especializado em MEIs e pequenas empresas brasileiras.

Gere um RELATÓRIO EXECUTIVO MENSAL profissional e detalhado com as seguintes seções:

## 📊 RESUMO EXECUTIVO
- Situação financeira geral em 2-3 frases claras
- Destaque principal do mês (positivo ou negativo)
- Nota de saúde financeira (de 1 a 10)

## 💰 ANÁLISE DE RECEITAS
- Evolução das receitas (comparando com período anterior se disponível)
- Principais fontes de receita e sua participação
- Tendência identificada (crescimento, estabilidade ou queda)

## 📉 ANÁLISE DE DESPESAS
- Breakdown dos gastos por categoria
- Identificar gastos fixos vs variáveis
- Categorias com maior peso no orçamento
- Gastos que parecem fora do padrão

## 🎯 PONTOS DE ATENÇÃO
- Liste até 3 pontos críticos que precisam de ação imediata
- Riscos identificados para o próximo período
- Oportunidades de economia

## 💡 RECOMENDAÇÕES PRÁTICAS
- 3-5 ações específicas e mensuráveis
- Priorize por impacto financeiro
- Inclua metas sugeridas quando possível

## 📈 PROJEÇÃO E PERSPECTIVAS
- Expectativa para o próximo mês baseada na tendência
- Impacto das contas a pagar nos próximos 30 dias
- Meta de economia ou crescimento sugerida

REGRAS:
- Use linguagem profissional mas acessível
- Seja específico com números e percentuais
- Use emojis com moderação para facilitar leitura
- Formate com markdown para estrutura clara
- Limite: 800-1200 palavras
- Seja honesto sobre problemas, mas construtivo nas soluções`;

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({
        relatorio: 'Você precisa estar logado para gerar relatórios.'
      }, { status: 401 });
    }

    // Buscar empresa
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id')
      .eq('usuario_id', user.id)
      .single();

    if (!empresa) {
      return NextResponse.json({
        relatorio: 'Empresa não encontrada.'
      }, { status: 404 });
    }

    // Verificar limite de uso
    const mesAno = format(new Date(), 'yyyy-MM');
    let { data: usage } = await supabase
      .from('report_usage')
      .select('*')
      .eq('empresa_id', empresa.id)
      .eq('mes_ano', mesAno)
      .single();

    if (usage && usage.relatorios_ia_usados >= MAX_IA_REPORTS) {
      return NextResponse.json({
        relatorio: `Você já utilizou seus ${MAX_IA_REPORTS} relatórios com IA este mês. Aguarde o próximo mês ou exporte o PDF sem análise de IA.`,
        limitReached: true,
      });
    }

    const { dadosFinanceiros } = await request.json();

    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        relatorio: 'A análise com IA não está configurada. Entre em contato com o suporte.'
      });
    }

    // Chamar API de IA
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3-fast',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Analise os seguintes dados financeiros e gere o relatório executivo:\n\n${dadosFinanceiros}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro da API xAI:', errorData);
      return NextResponse.json({
        relatorio: 'Erro ao gerar análise. Tente novamente em alguns minutos.'
      });
    }

    const data = await response.json();
    const relatorio = data.choices?.[0]?.message?.content || 'Não foi possível gerar o relatório.';

    // Incrementar uso
    if (usage) {
      await supabase
        .from('report_usage')
        .update({
          relatorios_ia_usados: usage.relatorios_ia_usados + 1,
        })
        .eq('id', usage.id);
    } else {
      await supabase
        .from('report_usage')
        .insert({
          empresa_id: empresa.id,
          mes_ano: mesAno,
          relatorios_ia_usados: 1,
          relatorios_pdf_usados: 0,
        });
    }

    return NextResponse.json({
      relatorio,
      usageAfter: {
        ia: (usage?.relatorios_ia_usados || 0) + 1,
        maxIA: MAX_IA_REPORTS,
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({
      relatorio: 'Ocorreu um erro ao gerar o relatório. Por favor, tente novamente.'
    });
  }
}
