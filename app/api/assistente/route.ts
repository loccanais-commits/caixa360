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
        resposta: 'Configure sua API Key nas configurações para usar a IA' 
      });
    }

    // Data de hoje - CRÍTICO para análises corretas
    const hoje = new Date();
    const dataHoje = hoje.toISOString().split('T')[0];
    const mesAtual = dataHoje.slice(0, 7); // YYYY-MM
    const anoAtual = dataHoje.slice(0, 4);
    
    // Dados do contexto
    const lancamentos = contexto?.lancamentos || [];
    const contas = contexto?.contas || [];
    const empresa = contexto?.empresa || {};
    const fornecedores = contexto?.fornecedores || [];

    // Filtrar lançamentos do mês atual CORRETAMENTE
    const lancamentosMes = lancamentos.filter((l: any) => 
      l.data && l.data.startsWith(mesAtual)
    );
    
    // Totais do mês
    const entradasMes = lancamentosMes
      .filter((l: any) => l.tipo === 'entrada')
      .reduce((a: number, l: any) => a + Number(l.valor || 0), 0);
    
    const saidasMes = lancamentosMes
      .filter((l: any) => l.tipo === 'saida')
      .reduce((a: number, l: any) => a + Number(l.valor || 0), 0);

    // Totais gerais (todos os tempos)
    const totalEntradas = lancamentos
      .filter((l: any) => l.tipo === 'entrada')
      .reduce((a: number, l: any) => a + Number(l.valor || 0), 0);
    
    const totalSaidas = lancamentos
      .filter((l: any) => l.tipo === 'saida')
      .reduce((a: number, l: any) => a + Number(l.valor || 0), 0);

    // Contas
    const contasPendentes = contas.filter((c: any) => c.status === 'pendente');
    const contasAtrasadas = contas.filter((c: any) => c.status === 'atrasado');
    const contasAReceber = contas.filter((c: any) => c.tipo === 'entrada' && ['pendente', 'atrasado'].includes(c.status));
    const contasAPagar = contas.filter((c: any) => c.tipo === 'saida' && ['pendente', 'atrasado'].includes(c.status));

    const totalAReceber = contasAReceber.reduce((a: number, c: any) => a + Number(c.valor || 0), 0);
    const totalAPagar = contasAPagar.reduce((a: number, c: any) => a + Number(c.valor || 0), 0);

    // Gastos por categoria do mês
    const gastosPorCategoria: Record<string, number> = {};
    lancamentosMes
      .filter((l: any) => l.tipo === 'saida')
      .forEach((l: any) => {
        const cat = l.categoria || 'outros';
        gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + Number(l.valor || 0);
      });

    const maiorGasto = Object.entries(gastosPorCategoria)
      .sort((a, b) => b[1] - a[1])[0];

    // Fornecedores com totais
    const fornecedoresComTotal = fornecedores.map((f: any) => {
      const gastosFornecedor = lancamentos
        .filter((l: any) => l.fornecedor_id === f.id)
        .reduce((a: number, l: any) => a + Number(l.valor || 0), 0);
      return { ...f, totalGasto: gastosFornecedor };
    }).filter((f: any) => f.totalGasto > 0);

    // Lista de lançamentos recentes (últimos 10)
    const lancamentosRecentes = lancamentos
      .slice(0, 10)
      .map((l: any) => `${l.data}: ${l.tipo === 'entrada' ? '+' : '-'}R$ ${Number(l.valor).toFixed(2)} - ${l.descricao}`);

    // Saldo atual
    const saldoInicial = Number(empresa.saldo_inicial || 0);
    const saldoAtual = saldoInicial + totalEntradas - totalSaidas;

    const contextoFinanceiro = `
=== INFORMAÇÕES IMPORTANTES ===
DATA DE HOJE: ${dataHoje}
MÊS ATUAL: ${mesAtual}
ANO ATUAL: ${anoAtual}

=== EMPRESA ===
Nome: ${empresa.nome || 'Não informado'}
Tipo: ${empresa.tipo_negocio || 'Não informado'}
Saldo Inicial Cadastrado: R$ ${saldoInicial.toFixed(2)}

=== SALDO ATUAL (CALCULADO) ===
Saldo Atual: R$ ${saldoAtual.toFixed(2)}

=== RESUMO DO MÊS ${mesAtual} ===
Total de Entradas: R$ ${entradasMes.toFixed(2)}
Total de Saídas: R$ ${saidasMes.toFixed(2)}
Resultado do Mês: R$ ${(entradasMes - saidasMes).toFixed(2)}
Quantidade de lançamentos: ${lancamentosMes.length}

=== TOTAIS GERAIS (TODOS OS TEMPOS) ===
Total de Entradas: R$ ${totalEntradas.toFixed(2)}
Total de Saídas: R$ ${totalSaidas.toFixed(2)}

=== CONTAS ===
A Receber (pendente): R$ ${totalAReceber.toFixed(2)} (${contasAReceber.length} contas)
A Pagar (pendente): R$ ${totalAPagar.toFixed(2)} (${contasAPagar.length} contas)
Contas Atrasadas: ${contasAtrasadas.length}

=== GASTOS POR CATEGORIA (MÊS ${mesAtual}) ===
${Object.entries(gastosPorCategoria).length > 0 
  ? Object.entries(gastosPorCategoria)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, val]) => `- ${cat}: R$ ${val.toFixed(2)}`)
    .join('\n')
  : 'Nenhum gasto registrado neste mês'}

${maiorGasto ? `Maior gasto: ${maiorGasto[0]} (R$ ${maiorGasto[1].toFixed(2)})` : ''}

=== FORNECEDORES (COM GASTOS) ===
${fornecedoresComTotal.length > 0 
  ? fornecedoresComTotal
    .sort((a: any, b: any) => b.totalGasto - a.totalGasto)
    .map((f: any) => `- ${f.nome}: R$ ${f.totalGasto.toFixed(2)}`)
    .join('\n')
  : 'Nenhum fornecedor com gastos registrados'}

=== LANÇAMENTOS RECENTES ===
${lancamentosRecentes.length > 0 ? lancamentosRecentes.join('\n') : 'Nenhum lançamento registrado'}
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
            content: `Você é um assistente financeiro para pequenos empresários brasileiros.

REGRAS IMPORTANTES:
1. A DATA DE HOJE É ${dataHoje} - use isso para qualquer análise temporal
2. NUNCA invente dados ou valores - use APENAS os dados fornecidos abaixo
3. Se o usuário perguntar algo que não está nos dados, diga que não tem essa informação
4. Use linguagem simples e direta
5. Valores sempre em Reais (R$)
6. Respostas curtas (máximo 150 palavras)
7. Use emojis ocasionalmente
8. Se perguntarem sobre um fornecedor específico, busque pelo nome nos dados
9. Seja honesto sobre limitações dos dados

${contextoFinanceiro}`
          },
          {
            role: 'user',
            content: mensagem
          }
        ],
        temperature: 0.5,
        max_tokens: 400,
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
