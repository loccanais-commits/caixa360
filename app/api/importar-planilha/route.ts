import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

interface LancamentoExtraido {
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  data: string;
  categoria?: string;
  secao?: string;
}

// Função para extrair valor numérico de diversos formatos
function extractNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Math.abs(value);
  if (typeof value === 'string') {
    // Remove R$, espaços, pontos de milhar, converte vírgula para ponto
    const cleaned = value
      .replace(/R\$\s*/gi, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.abs(num);
  }
  return 0;
}

// Detecta se a planilha é de orçamento (múltiplas seções lado a lado)
function isOrcamentoPlanilha(data: any[][]): boolean {
  const texto = data.slice(0, 10).flat().join(' ').toLowerCase();
  const keywords = ['gastos fixos', 'gastos variáveis', 'renda', 'meta de gastos', 'entrada', 'assinaturas'];
  const matches = keywords.filter(k => texto.includes(k));
  return matches.length >= 2;
}

// Processa planilha de orçamento (estilo Thiago)
function processOrcamentoPlanilha(data: any[][], mesRef: string): LancamentoExtraido[] {
  const lancamentos: LancamentoExtraido[] = [];
  
  // Encontrar índices de seções conhecidas nas primeiras linhas
  let gastosFixosCol = -1;
  let gastosVariaveisCol = -1;
  let rendaCol = -1;
  let assinaturasCol = -1;
  
  // Procurar headers nas primeiras 5 linhas
  for (let row = 0; row < Math.min(5, data.length); row++) {
    for (let col = 0; col < (data[row]?.length || 0); col++) {
      const val = String(data[row]?.[col] || '').toLowerCase().trim();
      if (val.includes('gastos fixos') && gastosFixosCol === -1) gastosFixosCol = col;
      if ((val.includes('gastos variáveis') || val.includes('gastos variaveis')) && gastosVariaveisCol === -1) gastosVariaveisCol = col;
      if (val === 'renda' && rendaCol === -1) rendaCol = col;
      if (val.includes('assinatura') && assinaturasCol === -1) assinaturasCol = col;
    }
  }
  
  // GASTOS FIXOS (saídas)
  if (gastosFixosCol >= 0) {
    for (let row = 1; row < data.length; row++) {
      const descricao = String(data[row]?.[gastosFixosCol] || '').trim();
      const valor = extractNumber(data[row]?.[gastosFixosCol + 1]);
      
      // Parar se encontrar nova seção
      if (descricao.toLowerCase().includes('gastos variáveis') || descricao.toLowerCase().includes('gastos variaveis')) break;
      
      // Ignorar headers e totais
      if (!descricao || descricao.toLowerCase().includes('total') || descricao.toLowerCase() === 'valor') continue;
      
      if (valor > 0 && descricao.length > 1) {
        lancamentos.push({
          tipo: 'saida',
          descricao,
          valor,
          data: mesRef,
          categoria: 'outros_despesas',
          secao: 'Gastos Fixos'
        });
      }
    }
  }
  
  // GASTOS VARIÁVEIS (saídas) - procurar onde começa
  if (gastosVariaveisCol >= 0) {
    let startRow = 0;
    for (let row = 0; row < data.length; row++) {
      const val = String(data[row]?.[gastosVariaveisCol] || '').toLowerCase();
      if (val.includes('gastos variáveis') || val.includes('gastos variaveis')) {
        startRow = row + 1;
        break;
      }
    }
    
    for (let row = startRow; row < data.length; row++) {
      const descricao = String(data[row]?.[gastosVariaveisCol] || '').trim();
      const valor = extractNumber(data[row]?.[gastosVariaveisCol + 1]);
      
      if (!descricao) continue;
      if (descricao.toLowerCase().includes('total')) break;
      
      if (valor > 0 && descricao.length > 1) {
        lancamentos.push({
          tipo: 'saida',
          descricao,
          valor,
          data: mesRef,
          categoria: 'outros_despesas',
          secao: 'Gastos Variáveis'
        });
      }
    }
  }
  
  // RENDA (entradas)
  if (rendaCol >= 0) {
    for (let row = 1; row < data.length; row++) {
      const descricao = String(data[row]?.[rendaCol] || '').trim();
      const valor = extractNumber(data[row]?.[rendaCol + 1]);
      
      // Ignorar seções e totais
      const descLower = descricao.toLowerCase();
      if (!descricao || descLower.includes('meta') || descLower.includes('total')) continue;
      if (descLower.includes('essencial') || descLower.includes('investir')) continue;
      if (descLower.includes('lazer') || descLower.includes('educação')) continue;
      if (descLower.includes('assinatura')) continue;
      
      if (valor > 0 && descricao.length > 1) {
        lancamentos.push({
          tipo: 'entrada',
          descricao: `Renda: ${descricao}`,
          valor,
          data: mesRef,
          categoria: 'outros_receitas',
          secao: 'Renda'
        });
      }
    }
  }
  
  // ASSINATURAS (saídas)
  if (assinaturasCol >= 0) {
    let startRow = 0;
    for (let row = 0; row < data.length; row++) {
      const val = String(data[row]?.[assinaturasCol] || '').toLowerCase();
      if (val.includes('assinatura')) {
        startRow = row + 1;
        break;
      }
    }
    
    for (let row = startRow; row < data.length; row++) {
      const descricao = String(data[row]?.[assinaturasCol] || '').trim();
      const valor = extractNumber(data[row]?.[assinaturasCol + 1]);
      
      if (!descricao || descricao.toLowerCase().includes('total')) continue;
      
      if (valor > 0 && descricao.length > 1) {
        lancamentos.push({
          tipo: 'saida',
          descricao,
          valor,
          data: mesRef,
          categoria: 'assinaturas',
          secao: 'Assinaturas'
        });
      }
    }
  }
  
  // Se não encontrou seções específicas, tentar extrair qualquer par descrição/valor
  if (lancamentos.length === 0) {
    for (let row = 1; row < data.length; row++) {
      for (let col = 0; col < (data[row]?.length || 0) - 1; col++) {
        const descricao = String(data[row]?.[col] || '').trim();
        const valorCell = data[row]?.[col + 1];
        const valor = extractNumber(valorCell);
        
        if (
          descricao.length > 2 && 
          valor > 0 && 
          typeof descricao === 'string' && 
          !descricao.match(/^[\d\.,\s]+$/) &&
          !descricao.toLowerCase().includes('total')
        ) {
          const descLower = descricao.toLowerCase();
          let tipo: 'entrada' | 'saida' = 'saida';
          
          if (descLower.includes('renda') || descLower.includes('receb') || 
              descLower.includes('venda') || descLower.includes('entrada') ||
              descLower.includes('youtube') || descLower.includes('salário')) {
            tipo = 'entrada';
          }
          
          lancamentos.push({
            tipo,
            descricao,
            valor,
            data: mesRef,
            categoria: tipo === 'entrada' ? 'outros_receitas' : 'outros_despesas'
          });
        }
      }
    }
  }
  
  return lancamentos;
}

// Processa planilha tabular tradicional
function processTabularPlanilha(data: any[][]): LancamentoExtraido[] {
  const lancamentos: LancamentoExtraido[] = [];
  
  if (data.length < 2) return lancamentos;
  
  let headerRow = 0;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    const textCells = row?.filter(cell => typeof cell === 'string' && cell.trim().length > 0);
    if (textCells && textCells.length >= 2) {
      headerRow = i;
      break;
    }
  }
  
  const headers = (data[headerRow] || []).map((h: any) => String(h || '').toLowerCase().trim());
  
  let descCol = -1;
  let valueCol = -1;
  
  headers.forEach((h, i) => {
    if (h.includes('descrição') || h.includes('descricao') || h.includes('nome') || h.includes('item')) descCol = i;
    if (h.includes('valor') && valueCol === -1) valueCol = i;
  });
  
  if (descCol === -1) descCol = 0;
  if (valueCol === -1) valueCol = 1;
  
  const hoje = new Date().toISOString().split('T')[0];
  
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const descricao = String(row[descCol] || '').trim();
    const valor = extractNumber(row[valueCol]);
    
    if (descricao && valor > 0 && descricao.length > 1) {
      const descLower = descricao.toLowerCase();
      let tipo: 'entrada' | 'saida' = 'saida';
      
      if (descLower.includes('receb') || descLower.includes('venda') || descLower.includes('entrada')) {
        tipo = 'entrada';
      }
      
      lancamentos.push({
        tipo,
        descricao,
        valor,
        data: hoje,
        categoria: tipo === 'entrada' ? 'outros_receitas' : 'outros_despesas'
      });
    }
  }
  
  return lancamentos;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mesReferencia = formData.get('mesReferencia') as string || new Date().toISOString().split('T')[0];
    const abaEscolhida = formData.get('aba') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    
    // Retornar lista de abas se múltiplas e nenhuma escolhida
    if (!abaEscolhida && workbook.SheetNames.length > 1) {
      const primeiraAba = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(primeiraAba, { header: 1, defval: '' }) as any[][];
      const isOrcamento = isOrcamentoPlanilha(data);
      
      return NextResponse.json({
        requiresSelection: true,
        abas: workbook.SheetNames,
        isOrcamento,
        mensagem: isOrcamento 
          ? 'Detectamos uma planilha de orçamento! Cada aba parece ser um mês. Selecione qual deseja importar.'
          : 'A planilha tem múltiplas abas. Selecione qual deseja importar.'
      });
    }
    
    const sheetName = abaEscolhida || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) {
      return NextResponse.json({ error: 'Aba não encontrada' }, { status: 400 });
    }
    
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    
    let lancamentos: LancamentoExtraido[];
    
    if (isOrcamentoPlanilha(data)) {
      lancamentos = processOrcamentoPlanilha(data, mesReferencia);
    } else {
      lancamentos = processTabularPlanilha(data);
    }
    
    if (lancamentos.length === 0) {
      return NextResponse.json({ 
        error: 'Não foi possível extrair lançamentos desta planilha.',
        dica: 'Verifique se a planilha contém descrições e valores.',
        estrutura: data.slice(0, 5)
      }, { status: 400 });
    }
    
    const totalEntradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((a, l) => a + l.valor, 0);
    const totalSaidas = lancamentos.filter(l => l.tipo === 'saida').reduce((a, l) => a + l.valor, 0);
    
    const porSecao: Record<string, number> = {};
    lancamentos.forEach(l => {
      const secao = l.secao || 'Outros';
      porSecao[secao] = (porSecao[secao] || 0) + l.valor;
    });
    
    return NextResponse.json({
      sucesso: true,
      lancamentos,
      resumo: {
        total: lancamentos.length,
        entradas: lancamentos.filter(l => l.tipo === 'entrada').length,
        saidas: lancamentos.filter(l => l.tipo === 'saida').length,
        totalEntradas,
        totalSaidas,
        resultado: totalEntradas - totalSaidas,
        porSecao
      },
      abaProcessada: sheetName,
      abas: workbook.SheetNames,
    });

  } catch (error) {
    console.error('Erro ao processar planilha:', error);
    return NextResponse.json({ 
      error: 'Erro ao processar planilha.',
      detalhes: String(error)
    }, { status: 500 });
  }
}
