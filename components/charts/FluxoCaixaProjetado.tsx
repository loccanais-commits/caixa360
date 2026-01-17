'use client';

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatarMoeda, formatarDataCurta } from '@/lib/utils';
import { Conta, Lancamento } from '@/lib/types';
import { addDays, format, startOfDay, isBefore, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FluxoCaixaProjetadoProps {
  saldoAtual: number;
  contas: Conta[];
  lancamentosRecorrentes?: Lancamento[];
  diasProjecao?: number;
}

interface DataPoint {
  data: string;
  dataFormatada: string;
  saldo: number;
  entradas: number;
  saidas: number;
  contasAPagar: string[];
  contasAReceber: string[];
}

export function FluxoCaixaProjetado({
  saldoAtual,
  contas,
  lancamentosRecorrentes = [],
  diasProjecao = 30,
}: FluxoCaixaProjetadoProps) {
  const dados = useMemo(() => {
    const hoje = startOfDay(new Date());
    const dataFim = addDays(hoje, diasProjecao);

    // Filtra contas pendentes/atrasadas
    const contasPendentes = contas.filter(c =>
      ['pendente', 'atrasado'].includes(c.status)
    );

    // Cria array de datas
    const pontos: DataPoint[] = [];
    let saldoAcumulado = saldoAtual;

    for (let i = 0; i <= diasProjecao; i++) {
      const dataAtual = addDays(hoje, i);
      const dataStr = format(dataAtual, 'yyyy-MM-dd');

      // Encontra contas do dia
      const contasDoDia = contasPendentes.filter(c => c.data_vencimento === dataStr);

      const entradasDia = contasDoDia
        .filter(c => c.tipo === 'entrada')
        .reduce((sum, c) => sum + Number(c.valor), 0);

      const saidasDia = contasDoDia
        .filter(c => c.tipo === 'saida')
        .reduce((sum, c) => sum + Number(c.valor), 0);

      saldoAcumulado = saldoAcumulado + entradasDia - saidasDia;

      pontos.push({
        data: dataStr,
        dataFormatada: format(dataAtual, "dd/MM", { locale: ptBR }),
        saldo: saldoAcumulado,
        entradas: entradasDia,
        saidas: saidasDia,
        contasAPagar: contasDoDia.filter(c => c.tipo === 'saida').map(c => c.descricao),
        contasAReceber: contasDoDia.filter(c => c.tipo === 'entrada').map(c => c.descricao),
      });
    }

    return pontos;
  }, [saldoAtual, contas, diasProjecao]);

  // Encontra o menor saldo projetado
  const menorSaldo = useMemo(() => {
    return Math.min(...dados.map(d => d.saldo));
  }, [dados]);

  // Encontra quando o saldo fica negativo
  const diasSaldoNegativo = useMemo(() => {
    const pontoNegativo = dados.find(d => d.saldo < 0);
    if (!pontoNegativo) return null;

    const hoje = new Date();
    const dataNegativa = parseISO(pontoNegativo.data);
    const dias = Math.ceil((dataNegativa.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    return {
      dias,
      data: pontoNegativo.dataFormatada,
      saldo: pontoNegativo.saldo,
    };
  }, [dados]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as DataPoint;

      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-neutral-100">
          <p className="font-medium text-neutral-900 mb-2">{data.dataFormatada}</p>
          <p className={`text-sm ${data.saldo >= 0 ? 'text-entrada-dark' : 'text-saida-dark'}`}>
            <strong>Saldo:</strong> {formatarMoeda(data.saldo)}
          </p>
          {data.entradas > 0 && (
            <p className="text-sm text-entrada-dark">
              <strong>+</strong> {formatarMoeda(data.entradas)}
            </p>
          )}
          {data.saidas > 0 && (
            <p className="text-sm text-saida-dark">
              <strong>-</strong> {formatarMoeda(data.saidas)}
            </p>
          )}
          {data.contasAPagar.length > 0 && (
            <div className="mt-2 pt-2 border-t border-neutral-100">
              <p className="text-xs text-neutral-500">Contas a pagar:</p>
              {data.contasAPagar.map((c, i) => (
                <p key={i} className="text-xs text-saida-dark">• {c}</p>
              ))}
            </div>
          )}
          {data.contasAReceber.length > 0 && (
            <div className="mt-2 pt-2 border-t border-neutral-100">
              <p className="text-xs text-neutral-500">Contas a receber:</p>
              {data.contasAReceber.map((c, i) => (
                <p key={i} className="text-xs text-entrada-dark">• {c}</p>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {/* Alerta de saldo negativo */}
      {diasSaldoNegativo && (
        <div className="mb-4 p-3 bg-saida-light rounded-xl border border-saida/20">
          <p className="text-sm text-saida-dark">
            <strong>⚠️ Atenção:</strong> Seu saldo ficará negativo em{' '}
            <strong>{diasSaldoNegativo.dias} dia{diasSaldoNegativo.dias > 1 ? 's' : ''}</strong>{' '}
            ({diasSaldoNegativo.data}) chegando a {formatarMoeda(diasSaldoNegativo.saldo)}
          </p>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-neutral-50 rounded-lg">
          <p className="text-xs text-neutral-500">Saldo Atual</p>
          <p className={`text-sm font-bold ${saldoAtual >= 0 ? 'text-entrada-dark' : 'text-saida-dark'}`}>
            {formatarMoeda(saldoAtual)}
          </p>
        </div>
        <div className="text-center p-2 bg-neutral-50 rounded-lg">
          <p className="text-xs text-neutral-500">Menor Saldo</p>
          <p className={`text-sm font-bold ${menorSaldo >= 0 ? 'text-entrada-dark' : 'text-saida-dark'}`}>
            {formatarMoeda(menorSaldo)}
          </p>
        </div>
        <div className="text-center p-2 bg-neutral-50 rounded-lg">
          <p className="text-xs text-neutral-500">Saldo em {diasProjecao}d</p>
          <p className={`text-sm font-bold ${dados[dados.length - 1]?.saldo >= 0 ? 'text-entrada-dark' : 'text-saida-dark'}`}>
            {formatarMoeda(dados[dados.length - 1]?.saldo || 0)}
          </p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSaldoPositivo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSaldoNegativo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dataFormatada"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />
            <Area
              type="monotone"
              dataKey="saldo"
              stroke={menorSaldo >= 0 ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              fill={menorSaldo >= 0 ? 'url(#colorSaldoPositivo)' : 'url(#colorSaldoNegativo)'}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
