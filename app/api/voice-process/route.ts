import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { texto, fornecedores, categoriasPersonalizadas } = await request.json();

    if (!texto) {
      return NextResponse.json({ error: 'Texto não fornecido' }, { status: 400 });
    }

    const apiKey = process.env.XAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key não configurada' }, { status: 500 });
    }

    // Preparar lista de fornecedores para o prompt
    const listaFornecedores = fornecedores && fornecedores.length > 0
      ? `\nFORNECEDORES CADASTRADOS:\n${fornecedores.map((f: any) => `- ${f.nome} (id: ${f.id})`).join('\n')}`
      : '';

    // Preparar categorias personalizadas
    const listaCategoriasPersonalizadas = categoriasPersonalizadas && categoriasPersonalizadas.length > 0
      ? `\nCATEGORIAS PERSONALIZADAS:\n${categoriasPersonalizadas.map((c: any) => `- ${c.nome} (tipo: ${c.tipo})`).join('\n')}`
      : '';

    const hoje = new Date().toISOString().split('T')[0];

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
            content: `Você é um assistente que extrai informações financeiras de texto em português brasileiro.
A data de hoje é: ${hoje}

O usuário pode mencionar UMA OU MAIS transações no mesmo áudio. Extraia TODAS.

Exemplos de múltiplas transações:
- "paguei 50 reais de luz e 100 de internet" → 2 transações
- "recebi 500 do cliente e gastei 200 no fornecedor" → 2 transações
- "paguei 30 de uber, 150 de almoço e 200 para o João" → 3 transações

Para cada transação, extraia:
- tipo: "entrada" (recebimento, venda, pagamento recebido) ou "saida" (gasto, pagamento feito, despesa, paguei)
- valor: número decimal (ex: 150.50)
- descricao: descrição curta do lançamento
- categoria: uma das categorias abaixo (ou personalizada se existir)
- data: a data mencionada no formato YYYY-MM-DD (se não mencionar, use hoje: ${hoje})
- fornecedor_nome: nome do fornecedor SE mencionado
${listaFornecedores}
${listaCategoriasPersonalizadas}

DATAS - EXEMPLOS:
- "dia 10" ou "no dia 10" = mês atual, dia 10
- "dia 13 de janeiro" = 2025-01-13 (ou 2026-01-13 dependendo do contexto)
- "amanhã" = dia seguinte a hoje
- "ontem" = dia anterior a hoje
- "semana que vem" = adiciona 7 dias
- se mencionar data futura, use a data mencionada

CATEGORIAS DE ENTRADA:
- vendas: vendas de produtos ou serviços
- servicos: prestação de serviços
- freela_entrada: trabalhos freelance, jobs avulsos
- outros_receitas: outras receitas

CATEGORIAS DE SAÍDA:
- fornecedores: pagamento a fornecedores (quando NÃO menciona fornecedor específico)
- assinaturas: assinaturas de software, serviços recorrentes (Adobe, Netflix, etc)
- freela_saida: pagamento a freelancers/terceiros
- aluguel: aluguel
- energia: conta de luz/energia
- agua: conta de água
- internet: internet/telefone
- salarios: salários/funcionários
- impostos: impostos/DAS
- marketing: marketing/divulgação
- transporte: transporte/combustível/uber
- manutencao: manutenção
- equipamentos: equipamentos
- prolabore: retirada pessoal/pró-labore
- outros_despesas: outras despesas

RESPONDA APENAS COM JSON VÁLIDO. Se for UMA transação:
{"tipo": "entrada|saida", "valor": 0.00, "descricao": "texto", "categoria": "categoria", "data": "YYYY-MM-DD", "fornecedor_nome": "nome ou null"}

Se forem MÚLTIPLAS transações, retorne um array:
[
  {"tipo": "saida", "valor": 50.00, "descricao": "Conta de luz", "categoria": "energia", "data": "YYYY-MM-DD", "fornecedor_nome": null},
  {"tipo": "saida", "valor": 100.00, "descricao": "Internet", "categoria": "internet", "data": "YYYY-MM-DD", "fornecedor_nome": null}
]

IMPORTANTE:
- Se mencionar "Adobe", "programa", "software", "Netflix", "Spotify" → categoria: assinaturas
- Se mencionar "fornecedor X" ou "para o X" onde X é um nome, extraia fornecedor_nome
- Se mencionar uma data específica (dia 10, dia 13 de janeiro), use essa data
- Conectores como "e", "mais", "também" geralmente indicam múltiplas transações
- Se não conseguir identificar algum campo, use valores padrão sensatos.`
          },
          {
            role: 'user',
            content: texto
          }
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      return NextResponse.json({ error: 'Erro na resposta da IA' }, { status: 500 });
    }

    const content = data.choices[0].message?.content || '';
    
    // Tentar extrair JSON da resposta
    let resultado;
    try {
      // Remover possíveis marcadores de código
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      resultado = JSON.parse(jsonStr);
    } catch (e) {
      return NextResponse.json({ 
        error: 'Não foi possível processar. Tente falar de forma mais clara.',
        raw: content 
      }, { status: 400 });
    }

    // Normalizar para array
    const transacoes = Array.isArray(resultado) ? resultado : [resultado];

    // Processar cada transação
    const resultadoFinal = transacoes.map((item: any) => {
      // Tentar encontrar fornecedor pelo nome
      let fornecedor_id = null;
      if (item.fornecedor_nome && fornecedores && fornecedores.length > 0) {
        const nomeBusca = item.fornecedor_nome.toLowerCase();
        const fornecedorEncontrado = fornecedores.find((f: any) => 
          f.nome.toLowerCase().includes(nomeBusca) || 
          nomeBusca.includes(f.nome.toLowerCase())
        );
        if (fornecedorEncontrado) {
          fornecedor_id = fornecedorEncontrado.id;
        }
      }

      return {
        tipo: item.tipo === 'entrada' ? 'entrada' : 'saida',
        valor: parseFloat(item.valor) || 0,
        descricao: item.descricao || 'Lançamento por voz',
        categoria: item.categoria || (item.tipo === 'entrada' ? 'vendas' : 'outros_despesas'),
        data: item.data || hoje,
        fornecedor_id: fornecedor_id,
        fornecedor_nome: item.fornecedor_nome || null,
      };
    });

    // Se for apenas uma transação, retornar objeto simples para compatibilidade
    if (resultadoFinal.length === 1) {
      return NextResponse.json(resultadoFinal[0]);
    }

    // Se forem múltiplas, retornar array com flag
    return NextResponse.json({
      multiplos: true,
      transacoes: resultadoFinal
    });

  } catch (error) {
    console.error('Erro ao processar voz:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
