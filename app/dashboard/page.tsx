'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, StatCard, Button, Badge, EmptyState, Loading, Modal } from '@/components/ui';
import { ExpandableCardList, ExpandableItem } from '@/components/ui/ExpandableCard';
import { formatarMoeda, formatarDataCurta, formatarPercentual } from '@/lib/utils';
import { Lancamento, Conta, CATEGORIAS_BASE } from '@/lib/types';
import { useEmpresa, useDashboardData } from '@/lib/hooks/useSWRHooks';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Bell,
  Package,
  Lightbulb,
  X
} from 'lucide-react';
import Link from 'next/link';
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

const CORES = ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6'];

export default function DashboardPage() {
  const router = useRouter();
  
  // SWR Hooks - dados cacheados automaticamente!
  const { empresa, isLoading: loadingEmpresa } = useEmpresa();
  const { data: dashboardData, isLoading: loadingDashboard, refresh } = useDashboardData(empresa?.id || null);
  
  // Modal de alertas
  const [showAlertas, setShowAlertas] = useState(false);
  const [alertasVistos, setAlertasVistos] = useState(false);
  const [alertaDismissed, setAlertaDismissed] = useState(false);
  
  // Filtro de período para evolução
  const [filtroEvolucao, setFiltroEvolucao] = useState<'semana' | 'mes' | 'ano'>('mes');

  // Métricas calculadas
  const metricas = useMemo(() => {
    if (!dashboardData || !empresa) {
      return {
        saldoAtual: 0,
        totalEntradas: 0,
        totalSaidas: 0,
        resultado: 0,
        prolaboreRetirado: 0,
        saudeCaixa: 50
      };
    }

    const { metricas: m, todosLancamentos, contasAtrasadas } = dashboardData;
    
    // Calcular saldo atual
    const todasEntradas = todosLancamentos
      .filter((l: Lancamento) => l.tipo === 'entrada')
      .reduce((a: number, l: Lancamento) => a + Number(l.valor), 0);
    const todasSaidas = todosLancamentos
      .filter((l: Lancamento) => l.tipo === 'saida')
      .reduce((a: number, l: Lancamento) => a + Number(l.valor), 0);
    const saldoAtual = Number(empresa.saldo_inicial || 0) + todasEntradas - todasSaidas;

    // Calcular saúde do caixa
    let pontos = 50;
    if (saldoAtual > 0) pontos += 15;
    if (saldoAtual > 5000) pontos += 10;
    if (m.resultado > 0) pontos += 15;
    if (m.resultado < 0) pontos -= 20;
    pontos -= (contasAtrasadas?.length || 0) * 10;

    return {
      saldoAtual,
      totalEntradas: m.entradas,
      totalSaidas: m.saidas,
      resultado: m.resultado,
      prolaboreRetirado: m.prolabore,
      saudeCaixa: Math.max(0, Math.min(100, pontos))
    };
  }, [dashboardData, empresa]);

  // Dados dos gráficos
  const dadosGraficos = useMemo(() => {
    if (!dashboardData || !empresa) {
      return { evolucao: [], categorias: [], comparativo: [], topProdutos: [] };
    }

    const { todosLancamentos, lancamentosMes } = dashboardData;
    
    // Determinar período baseado no filtro
    const hoje = new Date();
    let diasParaVoltar = 30;
    let formatoData = { day: '2-digit', month: '2-digit' } as const;
    
    if (filtroEvolucao === 'semana') {
      diasParaVoltar = 7;
      formatoData = { day: '2-digit', month: '2-digit' } as const;
    } else if (filtroEvolucao === 'ano') {
      diasParaVoltar = 365;
      formatoData = { month: 'short' } as const;
    }
    
    const evolucao: any[] = [];
    let saldoAcumulado = Number(empresa.saldo_inicial || 0);
    
    // Processar todos os lançamentos ordenados por data
    const lancamentosOrdenados = [...todosLancamentos].sort((a: Lancamento, b: Lancamento) => 
      new Date(a.data).getTime() - new Date(b.data).getTime()
    );
    
    // Para ano, agrupar por mês
    if (filtroEvolucao === 'ano') {
      for (let i = 11; i >= 0; i--) {
        const mesData = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mesNome = mesData.toLocaleDateString('pt-BR', { month: 'short' });
        // Formatação local para evitar bug de timezone
        const mesYear = mesData.getFullYear();
        const mesMonth = String(mesData.getMonth() + 1).padStart(2, '0');
        const mesLastDay = new Date(mesYear, mesData.getMonth() + 1, 0).getDate();
        const inicioMes = `${mesYear}-${mesMonth}-01`;
        const fimMes = `${mesYear}-${mesMonth}-${String(mesLastDay).padStart(2, '0')}`;
        
        const lancsMes = lancamentosOrdenados.filter((l: Lancamento) => l.data >= inicioMes && l.data <= fimMes);
        const entradasMes = lancsMes.filter((l: Lancamento) => l.tipo === 'entrada').reduce((a: number, l: Lancamento) => a + Number(l.valor), 0);
        const saidasMes = lancsMes.filter((l: Lancamento) => l.tipo === 'saida').reduce((a: number, l: Lancamento) => a + Number(l.valor), 0);
        
        // Calcular saldo acumulado até o fim do mês
        const lancAnteriores = lancamentosOrdenados.filter((l: Lancamento) => l.data <= fimMes);
        const saldo = Number(empresa.saldo_inicial || 0) + 
          lancAnteriores.filter((l: Lancamento) => l.tipo === 'entrada').reduce((a: number, l: Lancamento) => a + Number(l.valor), 0) -
          lancAnteriores.filter((l: Lancamento) => l.tipo === 'saida').reduce((a: number, l: Lancamento) => a + Number(l.valor), 0);
        
        evolucao.push({ data: mesNome, saldo, entradas: entradasMes, saidas: saidasMes });
      }
    } else {
      for (let i = diasParaVoltar - 1; i >= 0; i--) {
        const data = new Date(hoje);
        data.setDate(data.getDate() - i);
        // Formatação local para evitar bug de timezone
        const dataStr = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
        
        const lancsDia = lancamentosOrdenados.filter((l: Lancamento) => l.data === dataStr);
        const entradasDia = lancsDia.filter((l: Lancamento) => l.tipo === 'entrada').reduce((a: number, l: Lancamento) => a + Number(l.valor), 0);
        const saidasDia = lancsDia.filter((l: Lancamento) => l.tipo === 'saida').reduce((a: number, l: Lancamento) => a + Number(l.valor), 0);
        
        if (i === diasParaVoltar - 1) {
          const lancAnteriores = lancamentosOrdenados.filter((l: Lancamento) => l.data < dataStr);
          saldoAcumulado = Number(empresa.saldo_inicial || 0) + 
            lancAnteriores.filter((l: Lancamento) => l.tipo === 'entrada').reduce((a: number, l: Lancamento) => a + Number(l.valor), 0) -
            lancAnteriores.filter((l: Lancamento) => l.tipo === 'saida').reduce((a: number, l: Lancamento) => a + Number(l.valor), 0);
        }
        
        saldoAcumulado += entradasDia - saidasDia;
        
        evolucao.push({
          data: data.toLocaleDateString('pt-BR', formatoData),
          saldo: saldoAcumulado,
          entradas: entradasDia,
          saidas: saidasDia
        });
      }
    }

    // Categorias do mês
    const porCategoria: Record<string, number> = {};
    lancamentosMes.filter((l: Lancamento) => l.tipo === 'saida').forEach((l: Lancamento) => {
      const cat = l.categoria || 'outros';
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(l.valor);
    });
    
    const categorias = Object.entries(porCategoria)
      .map(([cat, valor]) => ({
        name: CATEGORIAS_BASE[cat as keyof typeof CATEGORIAS_BASE]?.label || cat,
        value: valor
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Comparativo mensal (últimos 6 meses)
    const comparativo: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const mesData = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesNome = mesData.toLocaleDateString('pt-BR', { month: 'short' });
      // Formatação local para evitar bug de timezone
      const compYear = mesData.getFullYear();
      const compMonth = String(mesData.getMonth() + 1).padStart(2, '0');
      const compLastDay = new Date(compYear, mesData.getMonth() + 1, 0).getDate();
      const inicioMes = `${compYear}-${compMonth}-01`;
      const fimMes = `${compYear}-${compMonth}-${String(compLastDay).padStart(2, '0')}`;
      
      const lancsMes = todosLancamentos.filter((l: Lancamento) => l.data >= inicioMes && l.data <= fimMes);
      const entradas = lancsMes.filter((l: Lancamento) => l.tipo === 'entrada').reduce((a: number, l: Lancamento) => a + Number(l.valor), 0);
      const saidas = lancsMes.filter((l: Lancamento) => l.tipo === 'saida').reduce((a: number, l: Lancamento) => a + Number(l.valor), 0);
      
      comparativo.push({ mes: mesNome, entradas, saidas });
    }

    // Top Produtos Vendidos (lançamentos de entrada com produto_id ou categoria venda_produto)
    const vendasPorProduto: Record<string, { total: number; qtd: number }> = {};
    lancamentosMes
      .filter((l: Lancamento) => l.tipo === 'entrada' && (l.produto_id || l.categoria === 'venda_produto' || l.categoria === 'vendas'))
      .forEach((l: Lancamento) => {
        const nome = l.descricao || 'Produto sem nome';
        if (!vendasPorProduto[nome]) {
          vendasPorProduto[nome] = { total: 0, qtd: 0 };
        }
        vendasPorProduto[nome].total += Number(l.valor);
        vendasPorProduto[nome].qtd += 1;
      });
    
    const topProdutos = Object.entries(vendasPorProduto)
      .map(([nome, dados]) => ({ nome, total: dados.total, qtd: dados.qtd }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { evolucao, categorias, comparativo, topProdutos };
  }, [dashboardData, empresa, filtroEvolucao]);

  // Mostrar alertas quando tiver contas atrasadas
  const contasAtrasadas = dashboardData?.contasAtrasadas || [];

  // useEffect para setTimeout com cleanup adequado
  useEffect(() => {
    if (contasAtrasadas.length > 0 && !alertasVistos && !loadingDashboard) {
      const timeoutId = setTimeout(() => {
        setShowAlertas(true);
        setAlertasVistos(true);
      }, 500);

      // Cleanup function para evitar memory leak
      return () => clearTimeout(timeoutId);
    }
  }, [contasAtrasadas.length, alertasVistos, loadingDashboard]);

  // Loading
  const isLoading = loadingEmpresa || (loadingDashboard && !dashboardData);

  // Componente de Saúde do Caixa
  const SaudeCaixa = ({ valor, size = 'md' }: { valor: number; size?: 'sm' | 'md' | 'lg' }) => {
    let cor = '#ef4444';
    let status = 'Crítico';
    if (valor >= 70) { cor = '#10b981'; status = 'Saudável'; }
    else if (valor >= 40) { cor = '#f59e0b'; status = 'Atenção'; }
    
    const sizeClasses = {
      sm: 'w-14 h-8',
      md: 'w-20 h-12',
      lg: 'w-28 h-16'
    };
    
    const fontSizes = {
      sm: 'text-sm',
      md: 'text-lg',
      lg: 'text-2xl'
    };
    
    return (
      <div className="flex flex-col items-center">
        <div className={`relative ${sizeClasses[size]}`}>
          <svg viewBox="0 0 100 60" className="w-full h-full">
            <path
              d="M 5 50 A 45 45 0 0 1 95 50"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M 5 50 A 45 45 0 0 1 95 50"
              fill="none"
              stroke={cor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(valor / 100) * 141.37} 141.37`}
            />
          </svg>
          <div className="absolute inset-0 flex items-end justify-center pb-0">
            <span className={`font-bold ${fontSizes[size]}`}>{valor}%</span>
          </div>
        </div>
        {size !== 'sm' && <span className={`font-medium mt-1 ${size === 'lg' ? 'text-sm' : 'text-xs'}`} style={{ color: cor }}>{status}</span>}
      </div>
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <Loading />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in overflow-hidden">
        {/* Modal de Alertas */}
        <Modal 
          isOpen={showAlertas} 
          onClose={() => setShowAlertas(false)}
          title="⚠️ Atenção!"
        >
          <div className="space-y-4">
            {contasAtrasadas.length > 0 && (
              <div className="p-4 bg-saida-light rounded-xl">
                <p className="font-medium text-saida-dark flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {contasAtrasadas.length} conta(s) atrasada(s)!
                </p>
                <ul className="mt-2 space-y-1">
                  {contasAtrasadas.slice(0, 3).map((c: Conta) => (
                    <li key={c.id} className="text-sm text-neutral-600">
                      • {c.descricao} - {formatarMoeda(Number(c.valor))}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="primary" className="w-full" onClick={() => { setShowAlertas(false); router.push('/contas'); }}>
              Ver todas as contas
            </Button>
          </div>
        </Modal>

        {/* Header com Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
            <p className="text-neutral-500 text-sm">Visão geral do seu negócio</p>
          </div>
          <div className="flex items-center gap-2">
            {contasAtrasadas.length > 0 && (
              <button 
                onClick={() => setShowAlertas(true)}
                className="p-2 bg-saida-light rounded-full relative"
              >
                <Bell className="w-5 h-5 text-saida-dark" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-saida text-white text-xs rounded-full flex items-center justify-center">
                  {contasAtrasadas.length}
                </span>
              </button>
            )}
            <button 
              onClick={() => refresh()}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
        </div>

        {/* Cards de Métricas - Linha única responsiva */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatCard
            title="Saldo Atual"
            value={formatarMoeda(metricas.saldoAtual)}
            icon={<Wallet className="w-5 h-5" />}
            color={metricas.saldoAtual >= 0 ? 'primary' : 'danger'}
          />
          <StatCard
            title="Entradas"
            value={formatarMoeda(metricas.totalEntradas)}
            icon={<ArrowUpCircle className="w-5 h-5" />}
            color="success"
          />
          <StatCard
            title="Saídas"
            value={formatarMoeda(metricas.totalSaidas)}
            icon={<ArrowDownCircle className="w-5 h-5" />}
            color="danger"
          />
          <StatCard
            title="Resultado"
            value={formatarMoeda(metricas.resultado)}
            icon={metricas.resultado >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            color={metricas.resultado >= 0 ? 'success' : 'danger'}
          />
        </div>

        {/* Alerta de contas a vencer - com X para fechar */}
        {!alertaDismissed && (dashboardData?.contasPagar?.length || 0) > 0 && (
          <div className="p-3 bg-alerta-light/50 rounded-xl border border-alerta/20 flex items-center gap-3 relative">
            <button 
              onClick={() => setAlertaDismissed(true)}
              className="absolute top-2 right-2 p-1 hover:bg-alerta/10 rounded-full"
            >
              <X className="w-4 h-4 text-alerta-dark" />
            </button>
            <div className="p-2 bg-alerta-light rounded-lg">
              <Calendar className="w-5 h-5 text-alerta-dark" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-alerta-dark text-sm">
                🟡 {dashboardData?.contasPagar?.length || 0} conta(s) a vencer
              </p>
              <p className="text-xs text-neutral-600">
                {dashboardData?.contasPagar?.slice(0, 3).map((c: Conta) => (
                  <span key={c.id}>{formatarDataCurta(c.data_vencimento)} • </span>
                ))}
              </p>
            </div>
          </div>
        )}

        {/* Evolução do Saldo + Saúde do Caixa */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Evolução do Saldo - 2/3 */}
          <Card className="lg:col-span-2 min-w-0">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">📈 Evolução do Saldo</CardTitle>
              <div className="flex gap-1">
                {(['semana', 'mes', 'ano'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltroEvolucao(f)}
                    className={`px-2 sm:px-3 py-1 text-xs rounded-full transition-all ${
                      filtroEvolucao === f 
                        ? 'bg-primary-500 text-white' 
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {f === 'semana' ? '7D' : f === 'mes' ? '30D' : '1A'}
                  </button>
                ))}
              </div>
            </CardHeader>
            <div className="h-48 sm:h-56 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosGraficos.evolucao}>
                  <defs>
                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="data" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} width={35} />
                  <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                  <Area type="monotone" dataKey="saldo" stroke="#06b6d4" fill="url(#colorSaldo)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Saúde do Caixa - 1/3 */}
          <Card className="bg-gradient-to-br from-primary-50 to-secondary-50 flex flex-col justify-center items-center">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary-500" />
              <span className="font-semibold text-neutral-900">Saúde do Caixa</span>
            </div>
            <SaudeCaixa valor={metricas.saudeCaixa} size="lg" />
            <div className="mt-4 text-sm text-neutral-600 space-y-1 text-center">
              {metricas.saudeCaixa >= 70 && <p>✅ Saldo positivo</p>}
              {metricas.resultado >= 0 && <p>✅ Lucro no mês</p>}
              {contasAtrasadas.length === 0 && <p>✅ Sem atrasos</p>}
              {contasAtrasadas.length > 0 && <p className="text-saida-dark">❌ {contasAtrasadas.length} atraso(s)</p>}
            </div>
          </Card>
        </div>

        {/* Comparativo + Gastos por Categoria */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Comparativo Mensal */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Comparativo Mensal</CardTitle>
            </CardHeader>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGraficos.comparativo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} width={30} />
                  <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                  <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-entrada rounded" /> Entradas</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-saida rounded" /> Saídas</span>
            </div>
          </Card>

          {/* Gastos por Categoria */}
          {dadosGraficos.categorias.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>🏷️ Gastos por Categoria</CardTitle>
              </CardHeader>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-40 h-40 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosGraficos.categorias.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {dadosGraficos.categorias.slice(0, 5).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 w-full">
                  {dadosGraficos.categorias.slice(0, 5).map((cat, idx) => (
                    <div key={cat.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CORES[idx % CORES.length] }} />
                        <span className="text-neutral-600 truncate">{cat.name}</span>
                      </div>
                      <span className="font-medium">{formatarMoeda(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Top Produtos + Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Produtos - 2/3 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>🏆 Top Produtos Vendidos</CardTitle>
              <Link href="/produtos" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                Ver todos →
              </Link>
            </CardHeader>
            {dadosGraficos.topProdutos && dadosGraficos.topProdutos.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {dadosGraficos.topProdutos.slice(0, 4).map((produto: { nome: string; total: number; qtd: number }, idx: number) => (
                  <div key={produto.nome} className="flex items-center gap-3 p-2 bg-neutral-50 rounded-xl">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                      idx === 1 ? 'bg-gray-100 text-gray-600' : 
                      idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{produto.nome}</p>
                      <p className="text-xs text-neutral-500">{produto.qtd} vendas</p>
                    </div>
                    <span className="text-sm font-semibold text-entrada-dark">{formatarMoeda(produto.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-neutral-500">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum produto vendido este mês</p>
              </div>
            )}
          </Card>

          {/* Insights - 1/3 */}
          <Card className="bg-gradient-to-br from-violet-50 to-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-violet-500" />
                Insights do Mês
              </CardTitle>
            </CardHeader>
            <div className="space-y-3 text-sm">
              {/* Maior gasto */}
              {dadosGraficos.categorias[0] && (
                <div className="flex items-start gap-2">
                  <span className="text-lg">💸</span>
                  <div>
                    <p className="text-neutral-700 font-medium">Maior gasto</p>
                    <p className="text-neutral-600">{dadosGraficos.categorias[0].name}: <strong>{formatarMoeda(dadosGraficos.categorias[0].value)}</strong></p>
                  </div>
                </div>
              )}
              
              {/* Média diária */}
              <div className="flex items-start gap-2">
                <span className="text-lg">📊</span>
                <div>
                  <p className="text-neutral-700 font-medium">Média diária</p>
                  <p className="text-neutral-600">Gasta <strong>{formatarMoeda(metricas.totalSaidas / 30)}</strong>/dia</p>
                </div>
              </div>

              {/* Previsão */}
              <div className="flex items-start gap-2">
                <span className="text-lg">🔮</span>
                <div>
                  <p className="text-neutral-700 font-medium">Previsão</p>
                  <p className="text-neutral-600">
                    Saldo fim do mês: <strong className={metricas.resultado >= 0 ? 'text-entrada-dark' : 'text-saida-dark'}>
                      {formatarMoeda(metricas.saldoAtual)}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Dica */}
              <div className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
                <span className="text-lg">💡</span>
                <p className="text-neutral-700">
                  {metricas.resultado >= 0 
                    ? 'Mês positivo! Considere guardar o excedente ou investir.'
                    : `Atenção! Reduza gastos com ${dadosGraficos.categorias[0]?.name || 'despesas'} para equilibrar.`
                  }
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Contas a Pagar e a Receber - Expandable Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Próximas contas a PAGAR */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-saida" />
                <span className="text-sm sm:text-base">A Pagar</span>
              </CardTitle>
              <Link href="/contas?tipo=saida" className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                Ver todas
                <ChevronRight className="w-4 h-4" />
              </Link>
            </CardHeader>

            <ExpandableCardList 
              items={(dashboardData?.contasPagar || []).map((conta: Conta): ExpandableItem => ({
                id: conta.id,
                title: conta.descricao,
                subtitle: formatarDataCurta(conta.data_vencimento),
                value: formatarMoeda(Number(conta.valor)),
                valueColor: 'text-saida-dark',
                icon: <ArrowDownCircle className="w-4 h-4 text-saida-dark" />,
                badge: conta.status === 'atrasado' ? 'Atrasado' : undefined,
                badgeColor: conta.status === 'atrasado' ? 'bg-saida-light text-saida-dark' : undefined,
                content: () => (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Categoria:</span>
                      <span className="font-medium">{CATEGORIAS_BASE[conta.categoria as keyof typeof CATEGORIAS_BASE]?.label || conta.categoria}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Vencimento:</span>
                      <span className="font-medium">{formatarDataCurta(conta.data_vencimento)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Status:</span>
                      <Badge variant={conta.status === 'atrasado' ? 'saida' : 'alerta'}>{conta.status}</Badge>
                    </div>
                  </div>
                ),
                ctaText: '✅ Marcar Pago',
                ctaAction: () => router.push(`/contas?tipo=saida&pagar=${conta.id}`),
                cta2Text: '📋 Ver Detalhes',
                cta2Action: () => router.push('/contas?tipo=saida')
              }))}
              emptyMessage="Tudo em dia! 🎉 Nenhuma conta a pagar"
            />
          </Card>

          {/* A RECEBER */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-entrada" />
                <span className="text-sm sm:text-base">A Receber</span>
              </CardTitle>
              <Link href="/contas?tipo=entrada" className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                Ver todas
                <ChevronRight className="w-4 h-4" />
              </Link>
            </CardHeader>

            <ExpandableCardList 
              items={(dashboardData?.contasReceber || []).map((conta: Conta): ExpandableItem => ({
                id: conta.id,
                title: conta.descricao,
                subtitle: formatarDataCurta(conta.data_vencimento),
                value: formatarMoeda(Number(conta.valor)),
                valueColor: 'text-entrada-dark',
                icon: <ArrowUpCircle className="w-4 h-4 text-entrada-dark" />,
                content: () => (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Categoria:</span>
                      <span className="font-medium">{CATEGORIAS_BASE[conta.categoria as keyof typeof CATEGORIAS_BASE]?.label || conta.categoria}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Previsão:</span>
                      <span className="font-medium">{formatarDataCurta(conta.data_vencimento)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Status:</span>
                      <Badge variant="entrada">{conta.status}</Badge>
                    </div>
                  </div>
                ),
                ctaText: '✅ Marcar Recebido',
                ctaAction: () => router.push(`/contas?tipo=entrada&receber=${conta.id}`),
                cta2Text: '📋 Ver Detalhes',
                cta2Action: () => router.push('/contas?tipo=entrada')
              }))}
              emptyMessage="Sem recebimentos previstos"
            />
          </Card>
        </div>

        {/* Últimos Lançamentos - Expandable Cards */}
        <div className="grid lg:grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-500" />
                Últimos Lançamentos
              </CardTitle>
              <Link href="/lancamentos" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                Ver todos
                <ChevronRight className="w-4 h-4" />
              </Link>
            </CardHeader>

            <ExpandableCardList 
              items={(dashboardData?.lancamentosMes?.slice(0, 5) || []).map((lanc: Lancamento): ExpandableItem => ({
                id: lanc.id,
                title: lanc.descricao,
                subtitle: formatarDataCurta(lanc.data),
                value: `${lanc.tipo === 'entrada' ? '+' : '-'}${formatarMoeda(Number(lanc.valor))}`,
                valueColor: lanc.tipo === 'entrada' ? 'text-entrada-dark' : 'text-saida-dark',
                icon: lanc.tipo === 'entrada' 
                  ? <ArrowUpCircle className="w-4 h-4 text-entrada-dark" />
                  : <ArrowDownCircle className="w-4 h-4 text-saida-dark" />,
                badge: CATEGORIAS_BASE[lanc.categoria as keyof typeof CATEGORIAS_BASE]?.label,
                badgeColor: lanc.tipo === 'entrada' ? 'bg-entrada-light text-entrada-dark' : 'bg-saida-light text-saida-dark',
                content: () => (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Tipo:</span>
                      <Badge variant={lanc.tipo === 'entrada' ? 'entrada' : 'saida'}>
                        {lanc.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Categoria:</span>
                      <span className="font-medium">{CATEGORIAS_BASE[lanc.categoria as keyof typeof CATEGORIAS_BASE]?.label || lanc.categoria}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Data:</span>
                      <span className="font-medium">{formatarDataCurta(lanc.data)}</span>
                    </div>
                    {lanc.forma_pagamento && (
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">Pagamento:</span>
                        <span className="font-medium capitalize">{lanc.forma_pagamento}</span>
                      </div>
                    )}
                  </div>
                ),
                ctaText: '📝 Ver Detalhes',
                ctaAction: () => router.push('/lancamentos')
              }))}
              emptyMessage="Nenhum lançamento ainda. Comece registrando suas entradas e saídas!"
            />
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
