'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, StatCard, Button, Badge, EmptyState, Loading, Modal } from '@/components/ui';
import { formatarMoeda, formatarDataCurta, formatarPercentual, calcularVariacao } from '@/lib/utils';
import { Empresa, Lancamento, Conta, CATEGORIAS_BASE } from '@/lib/types';
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
  Plus,
  X,
  Bell
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
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  
  // Métricas
  const [saldoAtual, setSaldoAtual] = useState(0);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalSaidas, setTotalSaidas] = useState(0);
  const [resultado, setResultado] = useState(0);
  const [prolaboreRetirado, setProlaboreRetirado] = useState(0);
  const [saudeCaixa, setSaudeCaixa] = useState(50);
  
  // Listas
  const [proximasContas, setProximasContas] = useState<Conta[]>([]);
  const [aReceber, setAReceber] = useState<Conta[]>([]);
  const [ultimosLancamentos, setUltimosLancamentos] = useState<Lancamento[]>([]);
  const [contasAtrasadas, setContasAtrasadas] = useState<Conta[]>([]);
  
  // Dados gráficos
  const [dadosEvolucao, setDadosEvolucao] = useState<any[]>([]);
  const [dadosCategorias, setDadosCategorias] = useState<any[]>([]);
  const [dadosComparativo, setDadosComparativo] = useState<any[]>([]);
  
  // Modal de alertas
  const [showAlertas, setShowAlertas] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Carregar empresa
    const { data: emp } = await supabase
      .from('empresas')
      .select('*')
      .eq('usuario_id', user.id)
      .single();
    
    if (!emp) return;
    setEmpresa(emp);

    // Carregar lançamentos do mês atual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioMesStr = inicioMes.toISOString().split('T')[0];

    const { data: lancamentos } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('empresa_id', emp.id)
      .order('data', { ascending: false });

    const lancamentosMes = (lancamentos || []).filter(l => l.data >= inicioMesStr);
    
    // Calcular totais
    const entradas = lancamentosMes.filter(l => l.tipo === 'entrada').reduce((a, l) => a + Number(l.valor), 0);
    const saidas = lancamentosMes.filter(l => l.tipo === 'saida').reduce((a, l) => a + Number(l.valor), 0);
    
    // Calcular saldo (saldo inicial + todas as entradas - todas as saídas)
    const todasEntradas = (lancamentos || []).filter(l => l.tipo === 'entrada').reduce((a, l) => a + Number(l.valor), 0);
    const todasSaidas = (lancamentos || []).filter(l => l.tipo === 'saida').reduce((a, l) => a + Number(l.valor), 0);
    const saldo = Number(emp.saldo_inicial) + todasEntradas - todasSaidas;

    setTotalEntradas(entradas);
    setTotalSaidas(saidas);
    setResultado(entradas - saidas);
    setSaldoAtual(saldo);
    setUltimosLancamentos((lancamentos || []).slice(0, 5));

    // Carregar pró-labore do mês
    const { data: retiradas } = await supabase
      .from('retiradas_prolabore')
      .select('valor')
      .eq('empresa_id', emp.id)
      .gte('data', inicioMesStr);
    
    const totalRetirado = (retiradas || []).reduce((a, r) => a + Number(r.valor), 0);
    setProlaboreRetirado(totalRetirado);

    // Carregar contas
    const hoje = new Date().toISOString().split('T')[0];
    const { data: contas } = await supabase
      .from('contas')
      .select('*')
      .eq('empresa_id', emp.id)
      .in('status', ['pendente', 'atrasado'])
      .order('data_vencimento', { ascending: true });

    const atrasadas = (contas || []).filter(c => c.data_vencimento < hoje);
    const proximasPagar = (contas || []).filter(c => c.data_vencimento >= hoje && c.tipo === 'saida').slice(0, 5);
    const proximasReceber = (contas || []).filter(c => c.data_vencimento >= hoje && c.tipo === 'entrada').slice(0, 5);
    
    setContasAtrasadas(atrasadas);
    setProximasContas(proximasPagar);
    setAReceber(proximasReceber);

    // Calcular saúde do caixa
    let pontos = 50;
    if (saldo > 0) pontos += 15;
    if (saldo > 5000) pontos += 10;
    if (entradas - saidas > 0) pontos += 15;
    if (entradas - saidas < 0) pontos -= 20;
    pontos -= atrasadas.length * 10;
    setSaudeCaixa(Math.max(0, Math.min(100, pontos)));

    // Preparar dados para gráficos
    prepararDadosGraficos(lancamentos || [], emp.saldo_inicial);

    // Mostrar modal de alertas se tiver contas atrasadas
    if (atrasadas.length > 0) {
      setShowAlertas(true);
    }

    setLoading(false);
  }

  function prepararDadosGraficos(lancamentos: Lancamento[], saldoInicial: number) {
    // Evolução do saldo (últimos 30 dias)
    const hoje = new Date();
    const evolucao: any[] = [];
    let saldoAcumulado = saldoInicial;

    // Ordenar por data
    const ordenados = [...lancamentos].sort((a, b) => 
      new Date(a.data).getTime() - new Date(b.data).getTime()
    );

    // Calcular saldo até 30 dias atrás
    const ha30Dias = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
    for (const l of ordenados) {
      if (new Date(l.data) < ha30Dias) {
        saldoAcumulado += l.tipo === 'entrada' ? Number(l.valor) : -Number(l.valor);
      }
    }

    for (let i = 30; i >= 0; i--) {
      const data = new Date(hoje.getTime() - i * 24 * 60 * 60 * 1000);
      const dataStr = data.toISOString().split('T')[0];

      const lancamentosDia = ordenados.filter(l => l.data === dataStr);
      for (const l of lancamentosDia) {
        saldoAcumulado += l.tipo === 'entrada' ? Number(l.valor) : -Number(l.valor);
      }

      evolucao.push({
        data: data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        saldo: saldoAcumulado,
      });
    }
    setDadosEvolucao(evolucao);

    // Gastos por categoria (mês atual)
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const lancamentosMes = lancamentos.filter(l => 
      new Date(l.data) >= inicioMes && l.tipo === 'saida'
    );

    const porCategoria: Record<string, number> = {};
    for (const l of lancamentosMes) {
      const cat = CATEGORIAS_BASE[l.categoria as keyof typeof CATEGORIAS_BASE]?.label || l.categoria;
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(l.valor);
    }

    const categorias = Object.entries(porCategoria)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);
    setDadosCategorias(categorias);

    // Comparativo últimas 4 semanas (com datas)
    const comparativo: any[] = [];
    for (let i = 3; i >= 0; i--) {
      const inicioSemana = new Date(hoje.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const fimSemana = new Date(hoje.getTime() - i * 7 * 24 * 60 * 60 * 1000);

      const lancamentosSemana = lancamentos.filter(l => {
        const d = new Date(l.data);
        return d >= inicioSemana && d < fimSemana;
      });

      // Formatar período com datas
      const diaInicio = inicioSemana.getDate().toString().padStart(2, '0');
      const mesInicio = (inicioSemana.getMonth() + 1).toString().padStart(2, '0');
      const diaFim = fimSemana.getDate().toString().padStart(2, '0');
      const mesFim = (fimSemana.getMonth() + 1).toString().padStart(2, '0');

      comparativo.push({
        periodo: `${diaInicio}/${mesInicio}-${diaFim}/${mesFim}`,
        entradas: lancamentosSemana.filter(l => l.tipo === 'entrada').reduce((a, l) => a + Number(l.valor), 0),
        saidas: lancamentosSemana.filter(l => l.tipo === 'saida').reduce((a, l) => a + Number(l.valor), 0),
      });
    }
    setDadosComparativo(comparativo);
  }

  // Gauge de saúde
  const GaugeSaude = ({ valor }: { valor: number }) => {
    let cor = '#ef4444';
    let status = 'Crítico';
    if (valor >= 70) { cor = '#10b981'; status = 'Saudável'; }
    else if (valor >= 40) { cor = '#f59e0b'; status = 'Atenção'; }

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-24 h-12">
          <svg viewBox="0 0 100 50" className="w-full">
            <path
              d="M 5 50 A 45 45 0 0 1 95 50"
              fill="none"
              stroke="#e5e5e5"
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
            <span className="text-lg font-bold">{valor}%</span>
          </div>
        </div>
        <span className="text-xs font-medium mt-1" style={{ color: cor }}>{status}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <Loading />
      </AppLayout>
    );
  }

  const prolaboreDisponivel = (empresa?.prolabore_definido || 0) - prolaboreRetirado;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Modal de Alertas */}
        <Modal 
          isOpen={showAlertas} 
          onClose={() => setShowAlertas(false)}
          title="⚠️ Atenção!"
        >
          <div className="space-y-4">
            {contasAtrasadas.length > 0 && (
              <div className="p-4 bg-saida-light rounded-xl">
                <p className="font-medium text-saida-dark mb-2">
                  🔴 {contasAtrasadas.length} conta(s) atrasada(s)
                </p>
                <ul className="text-sm text-neutral-700 space-y-1">
                  {contasAtrasadas.slice(0, 3).map(c => (
                    <li key={c.id}>
                      • {c.descricao} - {formatarMoeda(Number(c.valor))} (venceu {formatarDataCurta(c.data_vencimento)})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {proximasContas.length > 0 && (
              <div className="p-4 bg-alerta-light rounded-xl">
                <p className="font-medium text-alerta-dark mb-2">
                  🟡 {proximasContas.length} conta(s) a vencer
                </p>
                <ul className="text-sm text-neutral-700 space-y-1">
                  {proximasContas.slice(0, 3).map(c => (
                    <li key={c.id}>
                      • {c.descricao} - {formatarMoeda(Number(c.valor))} ({formatarDataCurta(c.data_vencimento)})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Link href="/contas" className="flex-1">
                <Button variant="primary" className="w-full">
                  Ver todas as contas
                </Button>
              </Link>
              <Button variant="ghost" onClick={() => setShowAlertas(false)}>
                Lembrar depois
              </Button>
            </div>
          </div>
        </Modal>

        {/* Cards de métricas - 1 coluna no mobile, 2 no tablet, 5 no desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatCard
            label="Caixa da Empresa"
            value={formatarMoeda(saldoAtual)}
            variant={saldoAtual >= 0 ? 'entrada' : 'saida'}
          />
          <StatCard
            label="Entradas (mês)"
            value={formatarMoeda(totalEntradas)}
            variant="entrada"
          />
          <StatCard
            label="Saídas (mês)"
            value={formatarMoeda(totalSaidas)}
            variant="saida"
          />
          <StatCard
            label="Resultado (mês)"
            value={formatarMoeda(resultado)}
            variant={resultado >= 0 ? 'entrada' : 'saida'}
          />
          <Card className="flex flex-col items-center justify-center py-4">
            <p className="text-xs text-neutral-500 mb-2">Saúde do Caixa</p>
            <GaugeSaude valor={saudeCaixa} />
          </Card>
        </div>

        {/* Card Pró-labore */}
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-secondary-500" />
                Seu Salário
              </CardTitle>
              <Link href="/salario">
                <Button variant="ghost" size="sm">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-neutral-500">Pró-labore definido</p>
                <p className="text-lg font-bold">{formatarMoeda(empresa?.prolabore_definido || 0)}</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Retirado</span>
                <span className="font-medium">{formatarMoeda(prolaboreRetirado)}</span>
              </div>
              <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-secondary-500 rounded-full transition-all"
                  style={{ width: `${Math.min((prolaboreRetirado / (empresa?.prolabore_definido || 1)) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Disponível</span>
                <span className={`font-medium ${prolaboreDisponivel < 0 ? 'text-saida' : 'text-entrada'}`}>
                  {formatarMoeda(Math.max(0, prolaboreDisponivel))}
                </span>
              </div>
            </div>
          </Card>

          {/* Evolução do saldo */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Evolução do Saldo (30 dias)</CardTitle>
            </CardHeader>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dadosEvolucao}>
                <defs>
                  <linearGradient id="gradientSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [formatarMoeda(v), 'Saldo']} />
                <Area type="monotone" dataKey="saldo" stroke="#06b6d4" fill="url(#gradientSaldo)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Gráficos lado a lado */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Gastos por categoria */}
          <Card>
            <CardHeader>
              <CardTitle>Despesas por Categoria</CardTitle>
            </CardHeader>
            {dadosCategorias.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-1/2 h-[140px] sm:h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosCategorias}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        dataKey="valor"
                        paddingAngle={2}
                      >
                        {dadosCategorias.map((_, i) => (
                          <Cell key={i} fill={CORES[i % CORES.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-1.5">
                  {dadosCategorias.slice(0, 5).map((cat, i) => (
                    <div key={cat.nome} className="flex items-center gap-2 text-xs sm:text-sm">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CORES[i % CORES.length] }} />
                      <span className="text-neutral-600 truncate flex-1">{cat.nome}</span>
                      <span className="font-medium text-neutral-900">{formatarMoeda(cat.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                title="Sem despesas"
                description="Nenhuma despesa registrada este mês"
              />
            )}
          </Card>

          {/* Comparativo semanal */}
          <Card>
            <CardHeader>
              <CardTitle>Comparativo Semanal</CardTitle>
            </CardHeader>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dadosComparativo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                <Bar dataKey="entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Contas a Pagar e a Receber */}
        <div className="grid lg:grid-cols-2 gap-4">
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

            {proximasContas.length > 0 ? (
              <ul className="space-y-2">
                {proximasContas.map((conta) => (
                  <li key={conta.id} className="flex items-center justify-between p-2.5 bg-saida-light/30 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-saida-light flex-shrink-0">
                        <ArrowDownCircle className="w-3.5 h-3.5 text-saida-dark" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm text-neutral-900 truncate">{conta.descricao}</p>
                        <p className="text-xs text-neutral-500">{formatarDataCurta(conta.data_vencimento)}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-sm text-saida-dark flex-shrink-0 ml-2">
                      {formatarMoeda(Number(conta.valor))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<Calendar className="w-6 h-6" />}
                title="Nenhuma conta a pagar"
                description="Tudo em dia! 🎉"
              />
            )}
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

            {aReceber.length > 0 ? (
              <ul className="space-y-2">
                {aReceber.map((conta) => (
                  <li key={conta.id} className="flex items-center justify-between p-2.5 bg-entrada-light/30 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-entrada-light flex-shrink-0">
                        <ArrowUpCircle className="w-3.5 h-3.5 text-entrada-dark" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm text-neutral-900 truncate">{conta.descricao}</p>
                        <p className="text-xs text-neutral-500">{formatarDataCurta(conta.data_vencimento)}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-sm text-entrada-dark flex-shrink-0 ml-2">
                      {formatarMoeda(Number(conta.valor))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<ArrowUpCircle className="w-6 h-6" />}
                title="Nenhum recebimento"
                description="Sem entradas previstas"
              />
            )}
          </Card>
        </div>

        {/* Últimos Lançamentos */}
        <div className="grid lg:grid-cols-1 gap-6">
          {/* Últimos lançamentos */}
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

            {ultimosLancamentos.length > 0 ? (
              <ul className="space-y-3">
                {ultimosLancamentos.map((lanc) => (
                  <li key={lanc.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${lanc.tipo === 'entrada' ? 'bg-entrada-light' : 'bg-saida-light'}`}>
                        {lanc.tipo === 'entrada'
                          ? <ArrowUpCircle className="w-4 h-4 text-entrada-dark" />
                          : <ArrowDownCircle className="w-4 h-4 text-saida-dark" />
                        }
                      </div>
                      <div>
                        <p className="font-medium text-sm text-neutral-900">{lanc.descricao}</p>
                        <p className="text-xs text-neutral-500">{formatarDataCurta(lanc.data)}</p>
                      </div>
                    </div>
                    <p className={`font-semibold ${lanc.tipo === 'entrada' ? 'text-entrada-dark' : 'text-saida-dark'}`}>
                      {lanc.tipo === 'entrada' ? '+' : '-'}{formatarMoeda(Number(lanc.valor))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<TrendingUp className="w-8 h-8" />}
                title="Nenhum lançamento"
                description="Comece registrando suas entradas e saídas"
                action={
                  <Link href="/lancamentos">
                    <Button variant="primary" size="sm">
                      <Plus className="w-4 h-4" />
                      Novo lançamento
                    </Button>
                  </Link>
                }
              />
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
