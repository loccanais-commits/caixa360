import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { texto, fornecedores } = await request.json();

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

Dado um texto falado pelo usuário, extraia:
- tipo: "entrada" (recebimento, venda, pagamento recebido) ou "saida" (gasto, pagamento feito, despesa, paguei)
- valor: número decimal (ex: 150.50)
- descricao: descrição curta do lançamento
- categoria: uma das categorias abaixo
- data: a data mencionada no formato YYYY-MM-DD (se não mencionar, use hoje: ${hoje})
- fornecedor_nome: nome do fornecedor SE mencionado (ex: "para o fornecedor Adobe", "para a Maria")
${listaFornecedores}

DATAS - EXEMPLOS:
- "dia 10" ou "no dia 10" = mês atual, dia 10
- "dia 13 de janeiro" = 2025-01-13 (ou 2026-01-13 dependendo do contexto)
- "amanhã" = dia seguinte a hoje
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

RESPONDA APENAS COM JSON VÁLIDO no formato:
{"tipo": "entrada|saida", "valor": 0.00, "descricao": "texto", "categoria": "categoria", "data": "YYYY-MM-DD", "fornecedor_nome": "nome ou null"}

IMPORTANTE:
- Se mencionar "Adobe", "programa", "software" → categoria: assinaturas
- Se mencionar "fornecedor X" ou "para o X" onde X é um nome, extraia fornecedor_nome
- Se mencionar uma data específica (dia 10, dia 13 de janeiro), use essa data
- Se não conseguir identificar algum campo, use valores padrão sensatos.`
          },
          {
            role: 'user',
            content: texto
          }
        ],
        temperature: 0.2,
        max_tokens: 300,
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

    // Tentar encontrar fornecedor pelo nome
    let fornecedor_id = null;
    if (resultado.fornecedor_nome && fornecedores && fornecedores.length > 0) {
      const nomeBusca = resultado.fornecedor_nome.toLowerCase();
      const fornecedorEncontrado = fornecedores.find((f: any) => 
        f.nome.toLowerCase().includes(nomeBusca) || 
        nomeBusca.includes(f.nome.toLowerCase())
      );
      if (fornecedorEncontrado) {
        fornecedor_id = fornecedorEncontrado.id;
      }
    }

    // Validar e ajustar resultado
    return NextResponse.json({
      tipo: resultado.tipo === 'entrada' ? 'entrada' : 'saida',
      valor: parseFloat(resultado.valor) || 0,
      descricao: resultado.descricao || 'Lançamento por voz',
      categoria: resultado.categoria || (resultado.tipo === 'entrada' ? 'vendas' : 'outros_despesas'),
      data: resultado.data || hoje,
      fornecedor_id: fornecedor_id,
      fornecedor_nome: resultado.fornecedor_nome || null,
    });

  } catch (error) {
    console.error('Erro ao processar voz:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
