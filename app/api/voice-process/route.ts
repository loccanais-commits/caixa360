import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const auth = await requireAuth();
    if (auth.error) {
      return auth.error;
    }

    const { texto, fornecedores, categoriasPersonalizadas, produtos } = await request.json();

    if (!texto) {
      return NextResponse.json({ error: 'Texto não fornecido' }, { status: 400 });
    }

    const apiKey = process.env.XAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key não configurada' }, { status: 500 });
    }

    // Preparar lista de fornecedores para o prompt
    const listaFornecedores = fornecedores && fornecedores.length > 0
      ? `\nCLIENTES/FORNECEDORES CADASTRADOS:\n${fornecedores.map((f: any) => `- ${f.nome} (id: ${f.id})`).join('\n')}`
      : '';

    // Preparar lista de produtos/serviços para o prompt COM PREÇOS
    const listaProdutos = produtos && produtos.length > 0
      ? `\nPRODUTOS/SERVIÇOS CADASTRADOS (USE O PREÇO QUANDO O USUÁRIO NÃO INFORMAR VALOR):\n${produtos.map((p: any) => `- "${p.nome}" = R$${p.preco} (id: ${p.id}, tipo: ${p.tipo})`).join('\n')}`
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

REGRA FUNDAMENTAL - USAR PREÇO DO PRODUTO CADASTRADO:
Se o usuário mencionar um produto/serviço cadastrado SEM informar valor, USE O PREÇO CADASTRADO!
${listaProdutos}

REGRA DE QUANTIDADE + NOMES:
Se o usuário disser "Fiz X [produto] para [nome1], [nome2], [nome3]", crie UMA TRANSAÇÃO para CADA pessoa com o preço do produto.

EXEMPLOS IMPORTANTES:

1. "Hoje eu fiz 5 cortes de cabelo" (SEM mencionar valor nem nomes)
   → Se "Corte de Cabelo" está cadastrado com preço R$50:
   → Resultado: 1 transação com valor = 5 × R$50 = R$250, COM campo quantidade
   {"tipo":"entrada","valor":250,"descricao":"5x Corte de Cabelo","categoria":"servicos","data":"${hoje}","produto_nome":"Corte de Cabelo","quantidade":5}

1b. "Hoje eu fiz 5 cortes de cabelo no cartão" (quantidade + forma de pagamento única)
   → Se "Corte de Cabelo" está cadastrado com preço R$50:
   → Resultado: 1 transação com valor = 5 × R$50 = R$250, quantidade e forma_pagamento
   {"tipo":"entrada","valor":250,"descricao":"5x Corte de Cabelo","categoria":"servicos","data":"${hoje}","produto_nome":"Corte de Cabelo","quantidade":5,"forma_pagamento":"cartao"}

2. "Fiz 3 cortes: da Diana que pagou no pix, do Daniel que pagou no cartão e da Juliet que pagou em dinheiro"
   → CRÍTICO: Cada pessoa tem uma FORMA DE PAGAMENTO DIFERENTE
   → Se "Corte de Cabelo" está cadastrado com preço R$50:
   → Resultado: 3 transações separadas, CADA UMA com sua forma_pagamento específica
   [{"tipo":"entrada","valor":50,"descricao":"Corte de Cabelo - Diana","categoria":"servicos","data":"${hoje}","fornecedor_nome":"Diana","produto_nome":"Corte de Cabelo","forma_pagamento":"pix"},
    {"tipo":"entrada","valor":50,"descricao":"Corte de Cabelo - Daniel","categoria":"servicos","data":"${hoje}","fornecedor_nome":"Daniel","produto_nome":"Corte de Cabelo","forma_pagamento":"cartao"},
    {"tipo":"entrada","valor":50,"descricao":"Corte de Cabelo - Juliet","categoria":"servicos","data":"${hoje}","fornecedor_nome":"Juliet","produto_nome":"Corte de Cabelo","forma_pagamento":"dinheiro"}]

2b. "Fiz 5 cortes do José, da Ana, do Ricardo, do Joanir e da Valéria" (SEM mencionar forma de pagamento)
   → Se "Corte de Cabelo" está cadastrado com preço R$50:
   → Resultado: 5 transações, uma para cada pessoa, cada uma R$50
   [{"tipo":"entrada","valor":50,"descricao":"Corte de Cabelo - José","categoria":"servicos","data":"${hoje}","fornecedor_nome":"José","produto_nome":"Corte de Cabelo"},
    {"tipo":"entrada","valor":50,"descricao":"Corte de Cabelo - Ana","categoria":"servicos","data":"${hoje}","fornecedor_nome":"Ana","produto_nome":"Corte de Cabelo"},
    {"tipo":"entrada","valor":50,"descricao":"Corte de Cabelo - Ricardo","categoria":"servicos","data":"${hoje}","fornecedor_nome":"Ricardo","produto_nome":"Corte de Cabelo"},
    {"tipo":"entrada","valor":50,"descricao":"Corte de Cabelo - Joanir","categoria":"servicos","data":"${hoje}","fornecedor_nome":"Joanir","produto_nome":"Corte de Cabelo"},
    {"tipo":"entrada","valor":50,"descricao":"Corte de Cabelo - Valéria","categoria":"servicos","data":"${hoje}","fornecedor_nome":"Valéria","produto_nome":"Corte de Cabelo"}]

3. "Recebi 300 da Débora no PIX e 200 da Raíssa no cartão"
   → Resultado: 2 transações com valores e forma de pagamento
   [{"tipo":"entrada","valor":300,"descricao":"Recebimento - Débora","categoria":"vendas","data":"${hoje}","fornecedor_nome":"Débora","forma_pagamento":"pix"},
    {"tipo":"entrada","valor":200,"descricao":"Recebimento - Raíssa","categoria":"vendas","data":"${hoje}","fornecedor_nome":"Raíssa","forma_pagamento":"cartao"}]

4. "Paguei 50 de luz no PIX e 100 de internet no cartão"
   → Resultado: 2 transações com forma de pagamento
   [{"tipo":"saida","valor":50,"descricao":"Conta de luz","categoria":"energia","data":"${hoje}","forma_pagamento":"pix"},
    {"tipo":"saida","valor":100,"descricao":"Conta de internet","categoria":"internet","data":"${hoje}","forma_pagamento":"cartao"}]

5. "Vendi um corte no cartão"
   → Entrada com forma de pagamento
   {"tipo":"entrada","valor":30,"descricao":"Corte de Cabelo","categoria":"servicos","data":"${hoje}","produto_nome":"Corte de Cabelo","forma_pagamento":"debito"}

FORMAS DE PAGAMENTO (para ENTRADAS e SAÍDAS):
- pix: PIX, pix, transferência pix
- debito: cartão de débito, débito, no débito, maquininha débito
- credito: cartão de crédito, crédito, no crédito, maquininha crédito, parcelado
- cartao: cartão (genérico - quando não especifica se é débito ou crédito, use debito)
- dinheiro: em espécie, cash, dinheiro vivo, dinheiro
- boleto: boleto bancário, boleto
- ticket: vale, voucher, vale alimentação, vale refeição
- transferencia: TED, DOC, transferência bancária

IMPORTANTE: 
- Se a pessoa diz apenas "cartão" sem especificar, use "debito" como padrão
- Se a pessoa diz "crédito" ou "parcelado", use "credito"
- Se a pessoa diz "débito", use "debito"

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

RESPONDA APENAS JSON válido. Se for UMA transação, retorne objeto. Se forem MÚLTIPLAS, retorne ARRAY.

REGRAS CRÍTICAS:
1. Se mencionar produto cadastrado SEM valor → USE O PREÇO CADASTRADO
2. Se mencionar quantidade (X cortes, Y vendas) → multiplique pelo preço e INCLUA campo "quantidade" no JSON
3. Se mencionar nomes de pessoas → crie UMA transação por pessoa
4. Inclua "produto_nome" quando identificar um produto/serviço cadastrado
5. Inclua "forma_pagamento" em ENTRADAS E SAÍDAS quando o usuário mencionar como pagou/recebeu (pix, cartão, dinheiro, etc)
6. Se mencionar "no PIX", "no cartão", "em dinheiro" → sempre extraia a forma de pagamento
7. SEMPRE inclua o campo "quantidade" quando houver quantidade mencionada (mesmo que seja 1)`
          },
          {
            role: 'user',
            content: texto
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
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

      // Tentar encontrar produto/serviço pelo nome
      let produto_id = null;
      let precoProduto = null;
      if (item.produto_nome && produtos && produtos.length > 0) {
        const nomeBusca = item.produto_nome.toLowerCase();
        const produtoEncontrado = produtos.find((p: any) => 
          p.nome.toLowerCase().includes(nomeBusca) || 
          nomeBusca.includes(p.nome.toLowerCase())
        );
        if (produtoEncontrado) {
          produto_id = produtoEncontrado.id;
          precoProduto = produtoEncontrado.preco;
        }
      }

      // Se não tem valor mas tem produto, usar preço do produto
      let valorFinal = parseFloat(item.valor) || 0;
      const quantidade = item.quantidade || 1;
      if (valorFinal === 0 && precoProduto) {
        valorFinal = precoProduto * quantidade;
      }

      return {
        tipo: item.tipo === 'entrada' ? 'entrada' : 'saida',
        valor: valorFinal,
        descricao: item.descricao || 'Lançamento por voz',
        categoria: item.categoria || (item.tipo === 'entrada' ? 'vendas' : 'outros_despesas'),
        data: item.data || hoje,
        fornecedor_id: fornecedor_id,
        fornecedor_nome: item.fornecedor_nome || null,
        produto_id: produto_id,
        produto_nome: item.produto_nome || null,
        forma_pagamento: item.forma_pagamento || null,
        quantidade: quantidade, // Preservar quantidade
        preco_unitario: precoProduto || (valorFinal / quantidade), // Preço unitário
      };
    });

    // Filtrar transações com valor > 0
    const transacoesValidas = resultadoFinal.filter((t: any) => t.valor > 0);

    // Se for apenas uma transação com quantidade > 1 e SEM nome de cliente
    // Retornar com flag para perguntar ao usuário
    if (transacoesValidas.length === 1) {
      const t = transacoesValidas[0];
      if (t.quantidade > 1 && !t.fornecedor_nome) {
        return NextResponse.json({
          ...t,
          perguntarSeparacao: true, // Flag para perguntar se quer separar
        });
      }
      return NextResponse.json(t);
    }

    // Se forem múltiplas, retornar array com flag
    if (transacoesValidas.length > 1) {
      return NextResponse.json({
        multiplos: true,
        transacoes: transacoesValidas
      });
    }

    return NextResponse.json({ 
      error: 'Não foi possível identificar valores. Tente novamente.',
    }, { status: 400 });

  } catch (error) {
    console.error('Erro no processamento de voz:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
