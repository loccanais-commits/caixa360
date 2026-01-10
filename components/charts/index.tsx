'use client';

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { formatarMoeda } from '@/lib/storage';

// Cores do tema
const CORES = {
  entrada: '#22c55e',
  entradaLight: '#86efac',
  saida: '#ef4444',
  saidaLight: '#fca5a5',
  primary: '#16a34a',
  neutral: '#737373',
};

const CORES_CATEGORIAS = [
  '#22c55e', // verde
  '#3b82f6', // azul
  '#f59e0b', // amarelo
  '#ef4444', // vermelho
  '#8b5cf6', // roxo
  '#ec4899', // rosa
  '#14b8a6', // teal
  '#f97316', // laranja
  '#6366f1', // indigo
  '#84cc16', // lime
];

// ==================== GRÁFICO DE ÁREA - EVOLUÇÃO DO SALDO ====================

interface DadoEvolucao {
  data: string;
  saldo: number;
  entradas?: number;
  saidas?: number;
}

interface GraficoEvolucaoProps {
  dados: DadoEvolucao[];
  altura?: number;
}

export function GraficoEvolucaoSaldo({ dados, altura = 300 }: GraficoEvolucaoProps) {
  if (!dados || dados.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-neutral-400">
        Sem dados para exibir
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <AreaChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradientSaldo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CORES.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CORES.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis 
          dataKey="data" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#737373' }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#737373' }}
          tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip 
          formatter={(value: number) => [formatarMoeda(value), 'Saldo']}
          labelStyle={{ color: '#171717' }}
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
        />
        <Area
          type="monotone"
          dataKey="saldo"
          stroke={CORES.primary}
          strokeWidth={2}
          fill="url(#gradientSaldo)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ==================== GRÁFICO DE PIZZA - CATEGORIAS ====================

interface DadoCategoria {
  nome: string;
  valor: number;
  percentual?: number;
}

interface GraficoCategoriasProps {
  dados: DadoCategoria[];
  altura?: number;
  tipo?: 'entrada' | 'saida';
}

export function GraficoCategorias({ dados, altura = 250, tipo = 'saida' }: GraficoCategoriasProps) {
  if (!dados || dados.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-neutral-400">
        Sem dados para exibir
      </div>
    );
  }

  const total = dados.reduce((acc, d) => acc + d.valor, 0);
  const dadosComPercentual = dados.map(d => ({
    ...d,
    percentual: total > 0 ? (d.valor / total) * 100 : 0,
  }));

  return (
    <div className="flex flex-col md:flex-row items-center gap-4">
      <ResponsiveContainer width="100%" height={altura}>
        <PieChart>
          <Pie
            data={dadosComPercentual}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="valor"
          >
            {dadosComPercentual.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={CORES_CATEGORIAS[index % CORES_CATEGORIAS.length]} 
              />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number, name: string) => [formatarMoeda(value), name]}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e5e5',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Legenda */}
      <div className="flex flex-col gap-2 min-w-[140px]">
        {dadosComPercentual.slice(0, 5).map((item, index) => (
          <div key={item.nome} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: CORES_CATEGORIAS[index % CORES_CATEGORIAS.length] }}
            />
            <span className="text-xs text-neutral-600 truncate flex-1">{item.nome}</span>
            <span className="text-xs font-medium text-neutral-900">{item.percentual?.toFixed(0)}%</span>
          </div>
        ))}
        {dadosComPercentual.length > 5 && (
          <span className="text-xs text-neutral-400">+{dadosComPercentual.length - 5} mais</span>
        )}
      </div>
    </div>
  );
}

// ==================== GRÁFICO DE BARRAS - COMPARATIVO ====================

interface DadoComparativo {
  periodo: string;
  entradas: number;
  saidas: number;
}

interface GraficoComparativoProps {
  dados: DadoComparativo[];
  altura?: number;
}

export function GraficoComparativo({ dados, altura = 300 }: GraficoComparativoProps) {
  if (!dados || dados.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-neutral-400">
        Sem dados para exibir
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis 
          dataKey="periodo" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#737373' }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#737373' }}
          tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip 
          formatter={(value: number, name: string) => [
            formatarMoeda(value), 
            name === 'entradas' ? 'Entradas' : 'Saídas'
          ]}
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
        />
        <Legend 
          formatter={(value) => value === 'entradas' ? 'Entradas' : 'Saídas'}
        />
        <Bar 
          dataKey="entradas" 
          fill={CORES.entrada} 
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
        <Bar 
          dataKey="saidas" 
          fill={CORES.saida} 
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ==================== GAUGE / INDICADOR DE SAÚDE ====================

interface GaugeSaudeProps {
  valor: number; // 0 a 100
  tamanho?: number;
}

export function GaugeSaude({ valor, tamanho = 120 }: GaugeSaudeProps) {
  // Garantir que valor está entre 0 e 100
  const valorNormalizado = Math.max(0, Math.min(100, valor));
  
  // Determinar cor baseado no valor
  let cor = CORES.saida;
  let status = 'Crítico';
  if (valorNormalizado >= 70) {
    cor = CORES.entrada;
    status = 'Saudável';
  } else if (valorNormalizado >= 40) {
    cor = '#f59e0b';
    status = 'Atenção';
  }

  // Calcular ângulo do arco (180 graus = semicírculo)
  const angulo = (valorNormalizado / 100) * 180;
  
  // Calcular path do arco
  const raio = (tamanho - 20) / 2;
  const centroX = tamanho / 2;
  const centroY = tamanho / 2 + 10;
  
  const x1 = centroX - raio;
  const y1 = centroY;
  
  const anguloRad = (angulo * Math.PI) / 180;
  const x2 = centroX - raio * Math.cos(anguloRad);
  const y2 = centroY - raio * Math.sin(anguloRad);
  
  const largeArc = angulo > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width={tamanho} height={tamanho * 0.6} viewBox={`0 0 ${tamanho} ${tamanho * 0.6}`}>
        {/* Fundo do arco */}
        <path
          d={`M ${centroX - raio} ${centroY} A ${raio} ${raio} 0 0 1 ${centroX + raio} ${centroY}`}
          fill="none"
          stroke="#e5e5e5"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Arco de progresso */}
        {valorNormalizado > 0 && (
          <path
            d={`M ${x1} ${y1} A ${raio} ${raio} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none"
            stroke={cor}
            strokeWidth="12"
            strokeLinecap="round"
          />
        )}
        {/* Texto do valor */}
        <text
          x={centroX}
          y={centroY - 10}
          textAnchor="middle"
          className="text-2xl font-bold"
          fill="#171717"
        >
          {valorNormalizado.toFixed(0)}%
        </text>
      </svg>
      <span className="text-sm font-medium" style={{ color: cor }}>{status}</span>
    </div>
  );
}

// ==================== MINI SPARKLINE ====================

interface SparklineProps {
  dados: number[];
  cor?: string;
  altura?: number;
  largura?: number;
}

export function Sparkline({ dados, cor = CORES.primary, altura = 40, largura = 100 }: SparklineProps) {
  if (!dados || dados.length < 2) {
    return <div style={{ width: largura, height: altura }} />;
  }

  const max = Math.max(...dados);
  const min = Math.min(...dados);
  const range = max - min || 1;

  const pontos = dados.map((valor, index) => {
    const x = (index / (dados.length - 1)) * largura;
    const y = altura - ((valor - min) / range) * (altura - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={largura} height={altura} className="overflow-visible">
      <polyline
        points={pontos}
        fill="none"
        stroke={cor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
