import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireAuth } from '@/lib/auth-helpers';

interface LancamentoExtraido {
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  data: string;
  categoria?: string;
  secao?: string;
  formaPagamento?: string;
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

// Processa planilha tabular tradicional (CSV/Excel com colunas estruturadas)
function processTabularPlanilha(data: any[][]): LancamentoExtraido[] {
  const lancamentos: LancamentoExtraido[] = [];
  if (data.length < 2) return lancamentos;

  // Encontrar linha de header
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

  // Mapear todas as colunas
  let descCol = -1, valueCol = -1, tipoCol = -1, categoriaCol = -1, dataCol = -1, formaPagCol = -1;

  headers.forEach((h, i) => {
    if ((h.includes('descrição') || h.includes('descricao')) && descCol === -1) descCol = i;
    if (h === 'valor' && valueCol === -1) valueCol = i;
    if (h === 'tipo') tipoCol = i;
    if (h === 'categoria' || h.includes('categoria')) categoriaCol = i;
    if (h === 'data') dataCol = i;
    if (h.includes('forma') || h.includes('pagamento')) formaPagCol = i;
  });

  // Fallbacks para colunas não encontradas
  if (descCol === -1) descCol = 1;
  if (valueCol === -1) valueCol = 2;

  const hoje = new Date().toISOString().split('T')[0];

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const descricao = String(row[descCol] || '').trim();
    const valor = extractNumber(row[valueCol]);

    if (!descricao || valor <= 0 || descricao.length <= 1) continue;

    // TIPO: usar coluna se existir, senão adivinhar pela descrição
    let tipo: 'entrada' | 'saida' = 'saida';
    if (tipoCol >= 0) {
      const tipoValue = String(row[tipoCol] || '').toLowerCase().trim();
      tipo = tipoValue === 'entrada' ? 'entrada' : 'saida';
    } else {
      const descLower = descricao.toLowerCase();
      if (descLower.includes('receb') || descLower.includes('venda') || descLower.includes('entrada')) {
        tipo = 'entrada';
      }
    }

    // CATEGORIA: usar coluna se existir
    let categoria = tipo === 'entrada' ? 'outros_receitas' : 'outros_despesas';
    if (categoriaCol >= 0) {
      const catValue = String(row[categoriaCol] || '').trim();
      if (catValue) categoria = catValue.toLowerCase().replace(/\s+/g, '_');
    }

    // DATA: usar coluna se existir
    let dataLancamento = hoje;
    if (dataCol >= 0) {
      const dataValue = row[dataCol];
      if (dataValue) {
        if (dataValue instanceof Date) {
          dataLancamento = dataValue.toISOString().split('T')[0];
        } else {
          const dataStr = String(dataValue).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
            dataLancamento = dataStr;
          } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
            const [d, m, y] = dataStr.split('/');
            dataLancamento = `${y}-${m}-${d}`;
          }
        }
      }
    }

    // FORMA PAGAMENTO: usar coluna se existir
    let formaPagamento: string | undefined;
    if (formaPagCol >= 0) {
      formaPagamento = String(row[formaPagCol] || '').toLowerCase().trim() || undefined;
    }

    lancamentos.push({
      tipo,
      descricao,
      valor,
      data: dataLancamento,
      categoria,
      formaPagamento
    });
  }

  return lancamentos;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const auth = await requireAuth();
    if (auth.error) {
      return auth.error;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mesReferencia = formData.get('mesReferencia') as string || new Date().toISOString().split('T')[0];
    const abaEscolhida = formData.get('aba') as string;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 });
    }

    // Validar tamanho (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10MB.' }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.includes(file.type) ||
                        fileName.endsWith('.xlsx') ||
                        fileName.endsWith('.xls') ||
                        fileName.endsWith('.csv');

    if (!isValidType) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use Excel (.xlsx, .xls) ou CSV.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();

    // Para arquivos CSV, garantir encoding UTF-8
    let workbook;
    if (fileName.endsWith('.csv')) {
      // Converter buffer para string UTF-8
      const decoder = new TextDecoder('utf-8');
      const csvString = decoder.decode(buffer);
      workbook = XLSX.read(csvString, { type: 'string', cellDates: true });
    } else {
      workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    }
    
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
