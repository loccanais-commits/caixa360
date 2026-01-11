import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { resumo } = await request.json();

    const apiKey = process.env.XAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        relatorio: 'Configure a API Key no servidor para usar a IA' 
      });
    }

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
            content: `Você é um consultor financeiro especializado em MEIs e pequenas empresas brasileiras.
Analise os dados financeiros fornecidos e gere um relatório executivo de 3-4 parágrafos.
Use linguagem simples e direta. Inclua:
1. Resumo da situação financeira do período
2. Principais pontos positivos e de atenção
3. 2-3 recomendações práticas
Formate com emojis para facilitar a leitura.`
          },
          {
            role: 'user',
            content: `Dados do relatório:\n${JSON.stringify(resumo, null, 2)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    const relatorio = data.choices?.[0]?.message?.content || 'Não foi possível gerar o relatório.';

    return NextResponse.json({ relatorio });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({ 
      relatorio: 'Ocorreu um erro ao gerar o relatório. Tente novamente.' 
    });
  }
}
