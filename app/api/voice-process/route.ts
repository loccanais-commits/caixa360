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
      ? `\nFORNECEDORES/CLIENTES CADASTRADOS:\n${fornecedores.map((f: any) => `- ${f.nome} (id: ${f.id})`).join('\n')}`
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
            content: `Você é um assistente financeiro que extrai lançamentos de texto em português brasileiro.
Data de hoje: ${hoje}

REGRA PRINCIPAL: Sempre que o usuário mencionar NOMES DE PESSOAS com valores, cada pessoa = uma transação separada!

EXEMPLOS DE MÚLTIPLAS TRANSAÇÕES:
1. "Recebi 500 reais, 300 da Débora e 200 da Raíssa"
   → Resultado: 2 transações
   [{"tipo":"entrada","valor":300,"descricao":"Recebimento de Débora","categoria":"vendas","data":"${hoje}","fornecedor_nome":"Débora"},
    {"tipo":"entrada","valor":200,"descricao":"Recebimento de Raíssa","categoria":"vendas","data":"${hoje}","fornecedor_nome":"Raíssa"}]

2. "Recebi 20 da Camila e 50 do Wagner por cortar cabelo"
   → Resultado: 2 transações  
   [{"tipo":"entrada","valor":20,"descricao":"Corte de cabelo - Camila","categoria":"servicos","data":"${hoje}","fornecedor_nome":"Camila"},
    {"tipo":"entrada","valor":50,"descricao":"Corte de cabelo - Wagner","categoria":"servicos","data":"${hoje}","fornecedor_nome":"Wagner"}]

3. "Paguei 50 de luz e 100 de internet"
   → Resultado: 2 transações
   [{"tipo":"saida","valor":50,"descricao":"Conta de luz","categoria":"energia","data":"${hoje}","fornecedor_nome":null},
    {"tipo":"saida","valor":100,"descricao":"Conta de internet","categoria":"internet","data":"${hoje}","fornecedor_nome":null}]

4. "Gastei 30 no mercado e 45 de gasolina"
   → Resultado: 2 transações
   [{"tipo":"saida","valor":30,"descricao":"Compras no mercado","categoria":"outros_despesas","data":"${hoje}","fornecedor_nome":null},
    {"tipo":"saida","valor":45,"descricao":"Combustível","categoria":"transporte","data":"${hoje}","fornecedor_nome":null}]

QUANDO SEPARAR EM MÚLTIPLAS TRANSAÇÕES:
- Quando mencionar diferentes pessoas com valores (Débora 300, Raíssa 200)
- Quando usar "e" conectando itens diferentes (luz e internet)
- Quando o total = soma das partes (500 = 300 + 200)

CATEGORIAS DE ENTRADA:
- vendas: vendas de produtos
- servicos: prestação de serviços (corte cabelo, manicure, etc)
- freela_entrada: trabalhos freelance
- outros_receitas: outras receitas

CATEGORIAS DE SAÍDA:
- fornecedores: pagamento a fornecedores
- assinaturas: software, serviços recorrentes
- aluguel, energia, agua, internet: contas fixas
- salarios: funcionários
- impostos: DAS, tributos
- marketing: divulgação
- transporte: uber, combustível
- manutencao, equipamentos
- prolabore: retirada pessoal
- outros_despesas: outros gastos
${listaFornecedores}

RESPONDA APENAS JSON. Se for UMA transação, retorne objeto. Se forem MÚLTIPLAS, retorne ARRAY.

IMPORTANTE: 
- SEMPRE extraia o valor correto de cada transação
- Se mencionar pessoas diferentes, SEPARE em transações diferentes
- Cada pessoa = uma transação com seu valor específico`
          },
          {
            role: 'user',
            content: texto
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
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
      // Tentar encontrar fornecedor/cliente pelo nome
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

    // Filtrar transações com valor > 0
    const transacoesValidas = resultadoFinal.filter((t: any) => t.valor > 0);

    // Se for apenas uma transação, retornar objeto simples para compatibilidade
    if (transacoesValidas.length === 1) {
      return NextResponse.json(transacoesValidas[0]);
    }

    // Se forem múltiplas, retornar array com flag
    if (transacoesValidas.length > 1) {
      return NextResponse.json({
        multiplos: true,
        transacoes: transacoesValidas
      });
    }

    // Se nenhuma válida, retornar erro
    return NextResponse.json({ 
      error: 'Não foi possível identificar valores. Tente novamente.' 
    }, { status: 400 });

  } catch (error) {
    console.error('Erro ao processar voz:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
