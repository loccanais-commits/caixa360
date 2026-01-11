import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

interface LancamentoExtraido {
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  data: string;
  categoria?: string;
}

// Função para detectar se um valor é uma data
function isDate(value: any): boolean {
  if (value instanceof Date) return true;
  if (typeof value === 'number' && value > 25000 && value < 50000) {
    // Números do Excel para datas (dias desde 1/1/1900)
    return true;
  }
  if (typeof value === 'string') {
    const datePatterns = [
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{1,2}-\d{1,2}-\d{2,4}$/,
    ];
    return datePatterns.some(p => p.test(value.trim()));
  }
  return false;
}

// Função para converter valor do Excel para data
function excelToDate(value: any): string | null {
  try {
    if (typeof value === 'number') {
      // Número do Excel
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
      // Tentar parsear string
      const parts = value.split(/[\/\-]/);
      if (parts.length === 3) {
        let [p1, p2, p3] = parts.map(p => parseInt(p));
        // Detectar formato DD/MM/YYYY vs MM/DD/YYYY vs YYYY-MM-DD
        if (p1 > 1000) {
          // YYYY-MM-DD
          return `${p1}-${String(p2).padStart(2, '0')}-${String(p3).padStart(2, '0')}`;
        } else if (p3 > 1000) {
          // DD/MM/YYYY ou MM/DD/YYYY - assumir DD/MM/YYYY (padrão BR)
          return `${p3}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
        } else if (p3 < 100) {
          // DD/MM/YY
          const year = p3 + (p3 > 50 ? 1900 : 2000);
          return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
        }
      }
    }
  } catch (e) {
    console.error('Erro ao converter data:', e);
  }
  return null;
}

// Função para detectar se é valor monetário
function isMonetaryValue(value: any): boolean {
  if (typeof value === 'number') return true;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
    return !isNaN(parseFloat(cleaned));
  }
  return false;
}

// Função para extrair valor numérico
function extractNumber(value: any): number {
  if (typeof value === 'number') return Math.abs(value);
  if (typeof value === 'string') {
    const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
    return Math.abs(parseFloat(cleaned)) || 0;
  }
  return 0;
}

// Função para detectar se é entrada ou saída
function detectTipo(value: any, columnName: string): 'entrada' | 'saida' | null {
  const colLower = columnName.toLowerCase();
  
  // Por nome da coluna
  if (colLower.includes('entrada') || colLower.includes('receita') || colLower.includes('crédito') || colLower.includes('recebido')) {
    return 'entrada';
  }
  if (colLower.includes('saída') || colLower.includes('saida') || colLower.includes('despesa') || colLower.includes('débito') || colLower.includes('gasto') || colLower.includes('pago')) {
    return 'saida';
  }
  
  // Por valor negativo/positivo
  if (typeof value === 'number') {
    return value >= 0 ? 'entrada' : 'saida';
  }
  
  return null;
}

// Função principal para processar a planilha
function processSheet(sheet: XLSX.WorkSheet): LancamentoExtraido[] {
  const lancamentos: LancamentoExtraido[] = [];
  
  // Converter para JSON
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
  
  if (data.length < 2) return lancamentos;
  
  // Encontrar linha de cabeçalho (primeira linha com texto)
  let headerRow = 0;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    const textCells = row.filter(cell => typeof cell === 'string' && cell.trim().length > 0);
    if (textCells.length >= 2) {
      headerRow = i;
      break;
    }
  }
  
  const headers = data[headerRow].map((h: any) => String(h || '').toLowerCase().trim());
  
  // Identificar colunas importantes
  let dateCol = -1;
  let descCol = -1;
  let valueCol = -1;
  let entradaCol = -1;
  let saidaCol = -1;
  let tipoCol = -1;
  let categoriaCol = -1;
  
  headers.forEach((h, i) => {
    if (h.includes('data') || h.includes('date')) dateCol = i;
    if (h.includes('descrição') || h.includes('descricao') || h.includes('histórico') || h.includes('memo') || h.includes('obs')) descCol = i;
    if (h.includes('valor') && !h.includes('entrada') && !h.includes('saída')) valueCol = i;
    if (h.includes('entrada') || h.includes('crédito') || h.includes('receita') || h.includes('recebido')) entradaCol = i;
    if (h.includes('saída') || h.includes('saida') || h.includes('débito') || h.includes('despesa') || h.includes('pago')) saidaCol = i;
    if (h.includes('tipo')) tipoCol = i;
    if (h.includes('categoria') || h.includes('grupo')) categoriaCol = i;
  });
  
  // Se não encontrou colunas específicas, tentar detectar automaticamente
  if (dateCol === -1 || (valueCol === -1 && entradaCol === -1 && saidaCol === -1)) {
    // Procurar por padrões nos dados
    for (let col = 0; col < headers.length; col++) {
      const sampleValues = data.slice(headerRow + 1, headerRow + 6).map(row => row[col]);
      
      if (dateCol === -1 && sampleValues.some(v => isDate(v))) {
        dateCol = col;
      }
      if (valueCol === -1 && entradaCol === -1 && saidaCol === -1) {
        if (sampleValues.filter(v => isMonetaryValue(v)).length >= 2) {
          valueCol = col;
        }
      }
    }
  }
  
  // Se ainda não encontrou coluna de descrição, pegar a primeira coluna de texto
  if (descCol === -1) {
    for (let col = 0; col < headers.length; col++) {
      if (col !== dateCol && col !== valueCol && col !== entradaCol && col !== saidaCol) {
        const sampleValues = data.slice(headerRow + 1, headerRow + 6).map(row => row[col]);
        if (sampleValues.some(v => typeof v === 'string' && v.length > 3)) {
          descCol = col;
          break;
        }
      }
    }
  }
  
  // Processar linhas de dados
  const hoje = new Date().toISOString().split('T')[0];
  
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    
    // Pular linhas vazias
    if (row.every(cell => !cell || String(cell).trim() === '')) continue;
    
    // Extrair data
    let dataLanc = hoje;
    if (dateCol >= 0 && row[dateCol]) {
      const converted = excelToDate(row[dateCol]);
      if (converted) dataLanc = converted;
    }
    
    // Extrair descrição
    let descricao = 'Importado de planilha';
    if (descCol >= 0 && row[descCol]) {
      descricao = String(row[descCol]).trim().substring(0, 200);
    }
    
    // Extrair valores e tipo
    if (entradaCol >= 0 && saidaCol >= 0) {
      // Colunas separadas para entrada e saída
      const valorEntrada = extractNumber(row[entradaCol]);
      const valorSaida = extractNumber(row[saidaCol]);
      
      if (valorEntrada > 0) {
        lancamentos.push({
          tipo: 'entrada',
          descricao,
          valor: valorEntrada,
          data: dataLanc,
          categoria: categoriaCol >= 0 ? String(row[categoriaCol] || '') : undefined,
        });
      }
      if (valorSaida > 0) {
        lancamentos.push({
          tipo: 'saida',
          descricao,
          valor: valorSaida,
          data: dataLanc,
          categoria: categoriaCol >= 0 ? String(row[categoriaCol] || '') : undefined,
        });
      }
    } else if (valueCol >= 0) {
      // Coluna única de valor
      const valor = extractNumber(row[valueCol]);
      if (valor > 0) {
        let tipo: 'entrada' | 'saida' = 'saida';
        
        // Tentar detectar tipo
        if (tipoCol >= 0) {
          const tipoVal = String(row[tipoCol]).toLowerCase();
          if (tipoVal.includes('entrada') || tipoVal.includes('receita') || tipoVal.includes('crédito')) {
            tipo = 'entrada';
          }
        } else {
          // Por valor positivo/negativo original
          const originalValue = row[valueCol];
          if (typeof originalValue === 'number' && originalValue > 0) {
            tipo = 'entrada';
          } else if (typeof originalValue === 'string' && !originalValue.includes('-')) {
            // Tentar detectar pela descrição
            const descLower = descricao.toLowerCase();
            if (descLower.includes('receb') || descLower.includes('venda') || descLower.includes('entrada')) {
              tipo = 'entrada';
            }
          }
        }
        
        lancamentos.push({
          tipo,
          descricao,
          valor,
          data: dataLanc,
          categoria: categoriaCol >= 0 ? String(row[categoriaCol] || '') : undefined,
        });
      }
    }
  }
  
  return lancamentos;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    
    const allLancamentos: LancamentoExtraido[] = [];
    
    // Processar todas as abas
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const lancamentos = processSheet(sheet);
      allLancamentos.push(...lancamentos);
    }
    
    if (allLancamentos.length === 0) {
      return NextResponse.json({ 
        error: 'Não foi possível extrair lançamentos desta planilha. Verifique se ela contém colunas de data, descrição e valor.',
        dica: 'A planilha deve ter pelo menos colunas para Data, Descrição e Valor (ou Entrada/Saída separados).'
      }, { status: 400 });
    }
    
    // Resumo
    const totalEntradas = allLancamentos
      .filter(l => l.tipo === 'entrada')
      .reduce((a, l) => a + l.valor, 0);
    
    const totalSaidas = allLancamentos
      .filter(l => l.tipo === 'saida')
      .reduce((a, l) => a + l.valor, 0);
    
    return NextResponse.json({
      sucesso: true,
      lancamentos: allLancamentos,
      resumo: {
        total: allLancamentos.length,
        entradas: allLancamentos.filter(l => l.tipo === 'entrada').length,
        saidas: allLancamentos.filter(l => l.tipo === 'saida').length,
        totalEntradas,
        totalSaidas,
        resultado: totalEntradas - totalSaidas,
      },
      abas: workbook.SheetNames,
    });

  } catch (error) {
    console.error('Erro ao processar planilha:', error);
    return NextResponse.json({ 
      error: 'Erro ao processar planilha. Verifique se o arquivo é um Excel válido (.xlsx, .xls, .csv)' 
    }, { status: 500 });
  }
}
