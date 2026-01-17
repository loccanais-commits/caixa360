/**
 * Utilitários para converter gráficos Recharts em imagens
 * para inclusão em PDFs
 */

/**
 * Converte um elemento SVG em uma string base64 de imagem PNG
 */
export async function svgToImage(
  svgElement: SVGSVGElement,
  width: number = 600,
  height: number = 300
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Clonar o SVG para não modificar o original
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

      // Definir dimensões
      clonedSvg.setAttribute('width', width.toString());
      clonedSvg.setAttribute('height', height.toString());

      // Serializar para string
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(clonedSvg);

      // Adicionar namespace se não existir
      if (!svgString.includes('xmlns')) {
        svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      // Criar blob e URL
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      // Criar imagem
      const img = new Image();
      img.onload = () => {
        // Criar canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto 2D'));
          return;
        }

        // Fundo branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Desenhar imagem
        ctx.drawImage(img, 0, 0, width, height);

        // Limpar URL
        URL.revokeObjectURL(url);

        // Retornar base64
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Erro ao carregar SVG como imagem'));
      };

      img.src = url;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Captura um elemento DOM como imagem usando html2canvas
 * Fallback para quando SVG direto não funciona
 */
export async function elementToImage(
  element: HTMLElement,
  options: {
    width?: number;
    height?: number;
    backgroundColor?: string;
    scale?: number;
  } = {}
): Promise<string> {
  const {
    width = element.offsetWidth,
    height = element.offsetHeight,
    backgroundColor = '#ffffff',
    scale = 2, // Melhor qualidade
  } = options;

  // Import dinâmico do html2canvas
  const html2canvas = (await import('html2canvas')).default;

  const canvas = await html2canvas(element, {
    width,
    height,
    backgroundColor,
    scale,
    useCORS: true,
    logging: false,
    allowTaint: true,
  });

  return canvas.toDataURL('image/png');
}

/**
 * Captura múltiplos gráficos de uma página
 */
export async function captureCharts(
  containerSelector: string = '.recharts-wrapper'
): Promise<string[]> {
  const charts = document.querySelectorAll(containerSelector);
  const images: string[] = [];

  for (const chart of Array.from(charts)) {
    try {
      const svg = chart.querySelector('svg');
      if (svg) {
        const image = await svgToImage(
          svg as SVGSVGElement,
          chart.clientWidth || 600,
          chart.clientHeight || 300
        );
        images.push(image);
      }
    } catch (error) {
      console.error('Erro ao capturar gráfico:', error);
    }
  }

  return images;
}

/**
 * Gera dados SVG inline para um gráfico de barras simples
 * Útil para PDFs quando não é possível usar html2canvas
 */
export function generateBarChartSVG(
  data: Array<{ label: string; value: number; color?: string }>,
  options: {
    width?: number;
    height?: number;
    barColor?: string;
    showLabels?: boolean;
  } = {}
): string {
  const {
    width = 400,
    height = 200,
    barColor = '#06b6d4',
    showLabels = true,
  } = options;

  if (data.length === 0) return '';

  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = (width - 60) / data.length - 10;
  const chartHeight = height - 40;

  let bars = '';
  data.forEach((item, index) => {
    const barHeight = (item.value / maxValue) * chartHeight;
    const x = 50 + index * (barWidth + 10);
    const y = height - 30 - barHeight;
    const color = item.color || barColor;

    bars += `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="4"/>
    `;

    if (showLabels) {
      // Label do valor
      bars += `
        <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="10" fill="#666">
          ${formatCompactNumber(item.value)}
        </text>
      `;
      // Label do eixo X
      bars += `
        <text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle" font-size="9" fill="#999">
          ${item.label.slice(0, 6)}
        </text>
      `;
    }
  });

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      ${bars}
    </svg>
  `;
}

/**
 * Gera dados SVG inline para um gráfico de pizza simples
 */
export function generatePieChartSVG(
  data: Array<{ label: string; value: number; color: string }>,
  options: {
    width?: number;
    height?: number;
    innerRadius?: number;
  } = {}
): string {
  const {
    width = 300,
    height = 300,
    innerRadius = 40,
  } = options;

  if (data.length === 0) return '';

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 20;

  let paths = '';
  let currentAngle = -90; // Começar do topo

  data.forEach((item) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const endAngle = currentAngle + angle;

    // Calcular pontos do arco
    const startRad = (currentAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + outerRadius * Math.cos(startRad);
    const y1 = cy + outerRadius * Math.sin(startRad);
    const x2 = cx + outerRadius * Math.cos(endRad);
    const y2 = cy + outerRadius * Math.sin(endRad);

    const x3 = cx + innerRadius * Math.cos(endRad);
    const y3 = cy + innerRadius * Math.sin(endRad);
    const x4 = cx + innerRadius * Math.cos(startRad);
    const y4 = cy + innerRadius * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    paths += `
      <path
        d="M ${x1} ${y1}
           A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}
           L ${x3} ${y3}
           A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
           Z"
        fill="${item.color}"
      />
    `;

    currentAngle = endAngle;
  });

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      ${paths}
    </svg>
  `;
}

/**
 * Formata número de forma compacta
 */
function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'k';
  }
  return value.toFixed(0);
}

/**
 * Prepara dados de gráficos para inclusão no PDF
 */
export interface ChartDataForPDF {
  evolucaoDiaria: string; // SVG ou base64
  despesasPorCategoria: string;
}

export async function prepareChartsForPDF(
  evolucaoData: Array<{ dataFormatada: string; entradas: number; saidas: number }>,
  categoriasData: Array<{ name: string; value: number; percentage: number }>
): Promise<ChartDataForPDF> {
  const cores = ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6'];

  // Gerar SVG da evolução diária (barras)
  const evolucaoBarras = evolucaoData.slice(-10).flatMap((item, i) => [
    { label: item.dataFormatada, value: item.entradas, color: '#10b981' },
  ]);

  const evolucaoDiaria = generateBarChartSVG(
    evolucaoData.slice(-10).map(item => ({
      label: item.dataFormatada,
      value: item.entradas - item.saidas,
      color: item.entradas >= item.saidas ? '#10b981' : '#ef4444',
    })),
    { width: 500, height: 200 }
  );

  // Gerar SVG de despesas por categoria (pizza)
  const despesasPorCategoria = generatePieChartSVG(
    categoriasData.slice(0, 6).map((cat, i) => ({
      label: cat.name,
      value: cat.value,
      color: cores[i % cores.length],
    })),
    { width: 250, height: 250, innerRadius: 50 }
  );

  return {
    evolucaoDiaria,
    despesasPorCategoria,
  };
}
