import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { mensagem, contexto } = await request.json();

    if (!mensagem) {
      return NextResponse.json({ error: 'Mensagem não fornecida' }, { status: 400 });
    }

    const apiKey = process.env.XAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        resposta: 'O assistente não está configurado. Configure a API Key no servidor.' 
      });
    }

    // Preparar resumo dos dados para o contexto
    const lancamentos = contexto?.lancamentos || [];
    const contas = contexto?.contas || [];
    const empresa = contexto?.empresa || {};

    const mesAtual = new Date().toISOString().slice(0, 7);
    const lancamentosMes = lancamentos.filter((l: any) => l.data?.startsWith(mesAtual));
    
    const entradasMes = lancamentosMes
      .filter((l: any) => l.tipo === 'entrada')
      .reduce((a: number, l: any) => a + Number(l.valor), 0);
    
    const saidasMes = lancamentosMes
      .filter((l: any) => l.tipo === 'saida')
      .reduce((a: number, l: any) => a + Number(l.valor), 0);

    const contasPendentes = contas.filter((c: any) => c.status === 'pendente').length;
    const contasAtrasadas = contas.filter((c: any) => c.status === 'atrasado').length;

    // Agrupar por categoria
    const gastosPorCategoria: Record<string, number> = {};
    lancamentosMes
      .filter((l: any) => l.tipo === 'saida')
      .forEach((l: any) => {
        gastosPorCategoria[l.categoria] = (gastosPorCategoria[l.categoria] || 0) + Number(l.valor);
      });

    const maiorGasto = Object.entries(gastosPorCategoria)
      .sort((a, b) => b[1] - a[1])[0];

    const contextoFinanceiro = `
CONTEXTO FINANCEIRO DO USUÁRIO:
- Empresa: ${empresa.nome || 'Não informado'}
- Tipo de negócio: ${empresa.tipo_negocio || 'Não informado'}

RESUMO DO MÊS ATUAL:
- Entradas: R$ ${entradasMes.toFixed(2)}
- Saídas: R$ ${saidasMes.toFixed(2)}
- Resultado: R$ ${(entradasMes - saidasMes).toFixed(2)}
- Margem: ${entradasMes > 0 ? ((entradasMes - saidasMes) / entradasMes * 100).toFixed(1) : 0}%

CONTAS:
- Pendentes: ${contasPendentes}
- Atrasadas: ${contasAtrasadas}

${maiorGasto ? `MAIOR GASTO: ${maiorGasto[0]} (R$ ${maiorGasto[1].toFixed(2)})` : ''}

GASTOS POR CATEGORIA:
${Object.entries(gastosPorCategoria).map(([cat, val]) => `- ${cat}: R$ ${val.toFixed(2)}`).join('\n')}
`;

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
            content: `Você é um assistente financeiro amigável e prestativo para pequenos empresários brasileiros.
            
Seu papel é:
1. Responder perguntas sobre finanças com base nos dados fornecidos
2. Dar dicas práticas de gestão financeira
3. Alertar sobre problemas (contas atrasadas, gastos altos, etc)
4. Ser encorajador e positivo, mas honesto

Regras:
- Use linguagem simples e direta
- Valores em Reais (R$)
- Respostas curtas (máximo 150 palavras)
- Use emojis ocasionalmente para ser amigável
- Se não souber algo, admita
- Não invente dados que não foram fornecidos

${contextoFinanceiro}`
          },
          {
            role: 'user',
            content: mensagem
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      return NextResponse.json({ 
        resposta: 'Desculpe, não consegui processar sua pergunta. Tente novamente.' 
      });
    }

    const resposta = data.choices[0].message?.content || 'Não consegui gerar uma resposta.';

    return NextResponse.json({ resposta });

  } catch (error) {
    console.error('Erro no assistente:', error);
    return NextResponse.json({ 
      resposta: 'Ocorreu um erro. Por favor, tente novamente.' 
    });
  }
}
