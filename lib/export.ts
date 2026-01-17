// Utilitários de Exportação - Excel e PDF

import { formatarMoeda, formatarData } from './utils';

// ==================== TIPOS ====================

export interface ExportData {
  lancamentos?: Array<{
    data: string;
    tipo: string;
    descricao: string;
    categoria: string;
    valor: number;
    fornecedor?: string;
  }>;
  contas?: Array<{
    descricao: string;
    tipo: string;
    valor: number;
    dataVencimento: string;
    status: string;
  }>;
  resumo?: {
    periodo: string;
    entradas: number;
    saidas: number;
    resultado: number;
    saldoAtual: number;
  };
}

// ==================== EXPORT CSV ====================

export function exportToCSV(data: ExportData, filename: string) {
  let csv = '';

  // Resumo
  if (data.resumo) {
    csv += 'RESUMO FINANCEIRO\n';
    csv += `Período,${data.resumo.periodo}\n`;
    csv += `Total Entradas,${formatarMoeda(data.resumo.entradas)}\n`;
    csv += `Total Saídas,${formatarMoeda(data.resumo.saidas)}\n`;
    csv += `Resultado,${formatarMoeda(data.resumo.resultado)}\n`;
    csv += `Saldo Atual,${formatarMoeda(data.resumo.saldoAtual)}\n`;
    csv += '\n';
  }

  // Lançamentos
  if (data.lancamentos && data.lancamentos.length > 0) {
    csv += 'LANÇAMENTOS\n';
    csv += 'Data,Tipo,Descrição,Categoria,Valor,Fornecedor\n';

    data.lancamentos.forEach(l => {
      csv += `${formatarData(l.data)},${l.tipo === 'entrada' ? 'Entrada' : 'Saída'},"${l.descricao}","${l.categoria}",${formatarMoeda(l.valor)},"${l.fornecedor || ''}"\n`;
    });
    csv += '\n';
  }

  // Contas
  if (data.contas && data.contas.length > 0) {
    csv += 'CONTAS\n';
    csv += 'Descrição,Tipo,Valor,Vencimento,Status\n';

    data.contas.forEach(c => {
      csv += `"${c.descricao}",${c.tipo === 'entrada' ? 'A Receber' : 'A Pagar'},${formatarMoeda(c.valor)},${formatarData(c.dataVencimento)},${c.status}\n`;
    });
  }

  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

// ==================== EXPORT EXCEL (XLSX) ====================

export async function exportToExcel(data: ExportData, filename: string) {
  // Usa a biblioteca xlsx que já está instalada no projeto
  const XLSX = await import('xlsx');

  const workbook = XLSX.utils.book_new();

  // Aba de Resumo
  if (data.resumo) {
    const resumoData = [
      ['RESUMO FINANCEIRO'],
      [''],
      ['Período', data.resumo.periodo],
      ['Total Entradas', data.resumo.entradas],
      ['Total Saídas', data.resumo.saidas],
      ['Resultado', data.resumo.resultado],
      ['Saldo Atual', data.resumo.saldoAtual],
    ];
    const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');
  }

  // Aba de Lançamentos
  if (data.lancamentos && data.lancamentos.length > 0) {
    const lancamentosData = [
      ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Fornecedor'],
      ...data.lancamentos.map(l => [
        formatarData(l.data),
        l.tipo === 'entrada' ? 'Entrada' : 'Saída',
        l.descricao,
        l.categoria,
        l.valor,
        l.fornecedor || '',
      ]),
    ];
    const lancamentosSheet = XLSX.utils.aoa_to_sheet(lancamentosData);
    XLSX.utils.book_append_sheet(workbook, lancamentosSheet, 'Lançamentos');
  }

  // Aba de Contas
  if (data.contas && data.contas.length > 0) {
    const contasData = [
      ['Descrição', 'Tipo', 'Valor', 'Vencimento', 'Status'],
      ...data.contas.map(c => [
        c.descricao,
        c.tipo === 'entrada' ? 'A Receber' : 'A Pagar',
        c.valor,
        formatarData(c.dataVencimento),
        c.status,
      ]),
    ];
    const contasSheet = XLSX.utils.aoa_to_sheet(contasData);
    XLSX.utils.book_append_sheet(workbook, contasSheet, 'Contas');
  }

  // Gera o arquivo
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  downloadBlob(blob, `${filename}.xlsx`);
}

// ==================== EXPORT PDF ====================

export function exportToPDF(data: ExportData, filename: string) {
  // Cria um HTML formatado para impressão
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatório Financeiro - Caixa360</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        h1 { color: #06b6d4; margin-bottom: 20px; }
        h2 { color: #333; margin-top: 30px; border-bottom: 2px solid #06b6d4; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .entrada { color: #10b981; }
        .saida { color: #ef4444; }
        .resumo-card {
          display: inline-block;
          padding: 15px 25px;
          margin: 10px;
          background: #f8f9fa;
          border-radius: 8px;
          text-align: center;
        }
        .resumo-label { font-size: 12px; color: #666; }
        .resumo-valor { font-size: 20px; font-weight: bold; margin-top: 5px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>Relatório Financeiro - Caixa360</h1>
      <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
  `;

  // Resumo
  if (data.resumo) {
    html += `
      <h2>Resumo do Período</h2>
      <p><strong>Período:</strong> ${data.resumo.periodo}</p>
      <div>
        <div class="resumo-card">
          <div class="resumo-label">Entradas</div>
          <div class="resumo-valor entrada">${formatarMoeda(data.resumo.entradas)}</div>
        </div>
        <div class="resumo-card">
          <div class="resumo-label">Saídas</div>
          <div class="resumo-valor saida">${formatarMoeda(data.resumo.saidas)}</div>
        </div>
        <div class="resumo-card">
          <div class="resumo-label">Resultado</div>
          <div class="resumo-valor ${data.resumo.resultado >= 0 ? 'entrada' : 'saida'}">${formatarMoeda(data.resumo.resultado)}</div>
        </div>
        <div class="resumo-card">
          <div class="resumo-label">Saldo Atual</div>
          <div class="resumo-valor">${formatarMoeda(data.resumo.saldoAtual)}</div>
        </div>
      </div>
    `;
  }

  // Lançamentos
  if (data.lancamentos && data.lancamentos.length > 0) {
    html += `
      <h2>Lançamentos</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.lancamentos.forEach(l => {
      html += `
        <tr>
          <td>${formatarData(l.data)}</td>
          <td class="${l.tipo}">${l.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td>
          <td>${l.descricao}</td>
          <td>${l.categoria}</td>
          <td class="${l.tipo}">${formatarMoeda(l.valor)}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
  }

  // Contas
  if (data.contas && data.contas.length > 0) {
    html += `
      <h2>Contas</h2>
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Tipo</th>
            <th>Valor</th>
            <th>Vencimento</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.contas.forEach(c => {
      html += `
        <tr>
          <td>${c.descricao}</td>
          <td>${c.tipo === 'entrada' ? 'A Receber' : 'A Pagar'}</td>
          <td class="${c.tipo}">${formatarMoeda(c.valor)}</td>
          <td>${formatarData(c.dataVencimento)}</td>
          <td>${c.status}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
  }

  html += `
      <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 30px; background: #06b6d4; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
          Imprimir / Salvar PDF
        </button>
      </div>
    </body>
    </html>
  `;

  // Abre em nova janela para impressão
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

// ==================== HELPERS ====================

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\ufeff' + content], { type: mimeType }); // BOM para UTF-8
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
