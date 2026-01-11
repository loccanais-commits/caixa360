'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, Button, Input, Modal, Loading, EmptyState, Badge, ProgressBar } from '@/components/ui';
import { formatarMoeda, formatarDataCurta, formatarMesAno } from '@/lib/utils';
import { Empresa, RetiradaProlabore, PROLABORE_REFERENCIA, FATURAMENTO_VALORES } from '@/lib/types';
import {
  Wallet,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Check,
  Sparkles,
  Edit,
  Trash2,
  Info
} from 'lucide-react';

export default function SalarioPage() {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [retiradas, setRetiradas] = useState<RetiradaProlabore[]>([]);
  
  // Métricas
  const [totalRetiradoMes, setTotalRetiradoMes] = useState(0);
  const [mediaFaturamento, setMediaFaturamento] = useState(0);
  const [mediaSaidas, setMediaSaidas] = useState(0);
  const [lucroMedio, setLucroMedio] = useState(0);
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editandoRetirada, setEditandoRetirada] = useState<RetiradaProlabore | null>(null);
  
  // Form retirada
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  
  // Form config
  const [novoProlabore, setNovoProlabore] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: emp } = await supabase
      .from('empresas')
      .select('*')
      .eq('usuario_id', user.id)
      .single();
    
    if (!emp) return;
    setEmpresa(emp);
    setNovoProlabore(emp.prolabore_definido.toString());

    // Carregar retiradas
    const { data: rets } = await supabase
      .from('retiradas_prolabore')
      .select('*')
      .eq('empresa_id', emp.id)
      .order('data', { ascending: false });
    
    setRetiradas(rets || []);

    // Calcular retirado no mês atual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioMesStr = inicioMes.toISOString().split('T')[0];
    
    const retiradoMes = (rets || [])
      .filter(r => r.data >= inicioMesStr)
      .reduce((a, r) => a + Number(r.valor), 0);
    setTotalRetiradoMes(retiradoMes);

    // Calcular médias dos últimos 3 meses
    const ha3Meses = new Date();
    ha3Meses.setMonth(ha3Meses.getMonth() - 3);
    const ha3MesesStr = ha3Meses.toISOString().split('T')[0];

    const { data: lancamentos } = await supabase
      .from('lancamentos')
      .select('tipo, valor')
      .eq('empresa_id', emp.id)
      .gte('data', ha3MesesStr);

    const entradas = (lancamentos || []).filter(l => l.tipo === 'entrada').reduce((a, l) => a + Number(l.valor), 0);
    const saidas = (lancamentos || []).filter(l => l.tipo === 'saida').reduce((a, l) => a + Number(l.valor), 0);
    
    setMediaFaturamento(entradas / 3);
    setMediaSaidas(saidas / 3);
    setLucroMedio((entradas - saidas) / 3);
    
    setLoading(false);
  }

  async function handleRetirar() {
    if (!valor || !empresa) return;
    
    setSalvando(true);
    
    const valorNum = parseFloat(valor.replace(',', '.'));
    
    if (editandoRetirada) {
      // Atualizar retirada existente
      await supabase.from('retiradas_prolabore').update({
        valor: valorNum,
        data,
        observacao: observacao || null,
      }).eq('id', editandoRetirada.id);
    } else {
      // Criar nova retirada
      await supabase.from('retiradas_prolabore').insert({
        empresa_id: empresa.id,
        valor: valorNum,
        data,
        observacao: observacao || null,
      });

      // Criar lançamento de saída correspondente
      await supabase.from('lancamentos').insert({
        empresa_id: empresa.id,
        tipo: 'saida',
        descricao: `Pró-labore - ${observacao || 'Retirada mensal'}`,
        valor: valorNum,
        categoria: 'prolabore',
        data,
      });
    }
    
    setSalvando(false);
    setShowModal(false);
    setEditandoRetirada(null);
    setValor('');
    setObservacao('');
    carregarDados();
  }

  function abrirEditarRetirada(retirada: RetiradaProlabore) {
    setEditandoRetirada(retirada);
    setValor(retirada.valor.toString());
    setData(retirada.data);
    setObservacao(retirada.observacao || '');
    setShowModal(true);
  }

  function limparFormRetirada() {
    setEditandoRetirada(null);
    setValor('');
    setData(new Date().toISOString().split('T')[0]);
    setObservacao('');
  }

  async function handleSalvarConfig() {
    if (!novoProlabore || !empresa) return;
    
    setSalvando(true);
    
    await supabase
      .from('empresas')
      .update({ prolabore_definido: parseFloat(novoProlabore.replace(',', '.')) })
      .eq('id', empresa.id);
    
    setSalvando(false);
    setShowConfigModal(false);
    carregarDados();
  }

  async function handleExcluirRetirada(id: string) {
    if (!confirm('Deseja excluir esta retirada?')) return;
    await supabase.from('retiradas_prolabore').delete().eq('id', id);
    carregarDados();
  }

  // Cálculos
  const prolaboreDefinido = empresa?.prolabore_definido || 0;
  const disponivel = Math.max(0, prolaboreDefinido - totalRetiradoMes);
  const percentualUsado = prolaboreDefinido > 0 ? (totalRetiradoMes / prolaboreDefinido) * 100 : 0;
  const excedeu = totalRetiradoMes > prolaboreDefinido;

  // Sugestão baseada no perfil
  const calcularSugestao = () => {
    if (!empresa) return { min: 0, max: 0 };
    
    // Se tem histórico, usa o lucro médio
    if (lucroMedio > 0) {
      const min = Math.round(lucroMedio * 0.5);
      const max = Math.round(lucroMedio * 0.8);
      return { min, max };
    }
    
    // Senão usa referência do tipo de negócio
    const ref = PROLABORE_REFERENCIA[empresa.tipo_negocio];
    const fat = FATURAMENTO_VALORES[empresa.faixa_faturamento];
    
    return {
      min: Math.round((fat.medio * ref.prolaboreMin) / 100),
      max: Math.round((fat.medio * ref.prolaboreMax) / 100),
    };
  };

  const sugestao = calcularSugestao();

  if (loading) {
    return <AppLayout><Loading /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Meu Salário</h1>
            <p className="text-neutral-500">Controle seu pró-labore mensal</p>
          </div>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Wallet className="w-4 h-4" />
            Registrar Retirada
          </Button>
        </div>

        {/* Card principal */}
        <Card className="bg-gradient-to-br from-secondary-50 to-purple-50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm text-neutral-500">Pró-labore definido</p>
                <button 
                  onClick={() => setShowConfigModal(true)}
                  className="p-1 hover:bg-secondary-100 rounded transition-colors"
                >
                  <Edit className="w-4 h-4 text-secondary-600" />
                </button>
              </div>
              <p className="text-4xl font-bold text-secondary-700">{formatarMoeda(prolaboreDefinido)}</p>
              <p className="text-sm text-neutral-500 mt-1">por mês</p>
            </div>

            <div className="lg:w-px lg:h-20 lg:bg-secondary-200 hidden lg:block" />

            <div className="flex-1">
              <p className="text-sm text-neutral-500 mb-2">Este mês</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Retirado</span>
                  <span className={`font-bold ${excedeu ? 'text-saida' : 'text-neutral-900'}`}>
                    {formatarMoeda(totalRetiradoMes)}
                  </span>
                </div>
                <ProgressBar 
                  value={percentualUsado} 
                  variant={excedeu ? 'saida' : percentualUsado > 80 ? 'alerta' : 'default'} 
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Disponível</span>
                  <span className={`font-bold ${excedeu ? 'text-saida' : 'text-entrada'}`}>
                    {excedeu ? `${formatarMoeda(Math.abs(disponivel))} acima` : formatarMoeda(disponivel)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {excedeu && (
            <div className="mt-4 p-4 bg-saida-light rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-saida-dark flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-saida-dark">Atenção!</p>
                <p className="text-sm text-neutral-700">
                  Você retirou mais do que o pró-labore definido. Isso pode comprometer o capital de giro da empresa.
                </p>
              </div>
            </div>
          )}

          {/* Aviso se pró-labore está fora da faixa sugerida */}
          {prolaboreDefinido > 0 && sugestao.max > 0 && !excedeu && (
            prolaboreDefinido > sugestao.max ? (
              <div className="mt-4 p-4 bg-alerta-light rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-alerta-dark flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-alerta-dark">Acima da faixa sugerida</p>
                  <p className="text-sm text-neutral-700">
                    Seu pró-labore está acima da faixa sugerida ({formatarMoeda(sugestao.min)} a {formatarMoeda(sugestao.max)}). 
                    Considere reservar mais para o capital de giro da empresa.
                  </p>
                </div>
              </div>
            ) : prolaboreDefinido < sugestao.min && (
              <div className="mt-4 p-4 bg-primary-50 rounded-xl flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-primary-700">Você pode aumentar!</p>
                  <p className="text-sm text-neutral-700">
                    Baseado no seu negócio, você poderia definir um pró-labore entre {formatarMoeda(sugestao.min)} e {formatarMoeda(sugestao.max)}.
                  </p>
                </div>
              </div>
            )
          )}
        </Card>

        {/* Sugestão da IA */}
        <Card className="bg-gradient-to-br from-primary-50 to-cyan-50">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <Sparkles className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 mb-2">💡 Sugestão baseada no seu negócio</h3>
              
              {lucroMedio > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-neutral-600">
                    <strong>Baseado nos últimos 3 meses:</strong>
                  </p>
                  <ul className="text-sm text-neutral-600 space-y-1">
                    <li>• Faturamento médio: {formatarMoeda(mediaFaturamento)}/mês</li>
                    <li>• Despesas médias: {formatarMoeda(mediaSaidas)}/mês</li>
                    <li>• Lucro médio: <span className={lucroMedio >= 0 ? 'text-entrada-dark font-medium' : 'text-saida-dark font-medium'}>{formatarMoeda(lucroMedio)}/mês</span></li>
                  </ul>
                  <p className="text-sm text-primary-700 font-medium mt-3">
                    Pró-labore sugerido: {formatarMoeda(sugestao.min)} a {formatarMoeda(sugestao.max)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    (50% a 80% do lucro, deixando reserva para a empresa)
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-neutral-600">
                    <strong>Baseado no perfil do seu negócio ({empresa?.tipo_negocio}):</strong>
                  </p>
                  <ul className="text-sm text-neutral-600 space-y-1">
                    <li>• Margem típica: {PROLABORE_REFERENCIA[empresa?.tipo_negocio || 'outro'].margemMinima}-{PROLABORE_REFERENCIA[empresa?.tipo_negocio || 'outro'].margemMaxima}%</li>
                    <li>• Faixa de faturamento estimada: {FATURAMENTO_VALORES[empresa?.faixa_faturamento || 'naosei'].min.toLocaleString('pt-BR')} a {FATURAMENTO_VALORES[empresa?.faixa_faturamento || 'naosei'].max.toLocaleString('pt-BR')}</li>
                  </ul>
                  <p className="text-sm text-primary-700 font-medium mt-3">
                    Pró-labore sugerido: {formatarMoeda(sugestao.min)} a {formatarMoeda(sugestao.max)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Lance mais transações para ter uma sugestão mais precisa!
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary-500" />
              Histórico de Retiradas
            </CardTitle>
          </CardHeader>

          {retiradas.length > 0 ? (
            <div className="space-y-3">
              {retiradas.map((ret) => {
                const mesAno = formatarMesAno(ret.data);
                return (
                  <div key={ret.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                    <div>
                      <p className="font-medium text-neutral-900">{formatarMoeda(Number(ret.valor))}</p>
                      <p className="text-sm text-neutral-500">{formatarDataCurta(ret.data)} • {mesAno}</p>
                      {ret.observacao && (
                        <p className="text-xs text-neutral-400 mt-1">{ret.observacao}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => abrirEditarRetirada(ret)}
                        className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4 text-primary-500" />
                      </button>
                      <button 
                        onClick={() => handleExcluirRetirada(ret.id)}
                        className="p-2 hover:bg-saida-light rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-saida" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Wallet className="w-8 h-8" />}
              title="Nenhuma retirada registrada"
              description="Registre suas retiradas de pró-labore para manter o controle"
              action={
                <Button variant="primary" onClick={() => setShowModal(true)}>
                  <Plus className="w-4 h-4" />
                  Registrar Retirada
                </Button>
              }
            />
          )}
        </Card>

        {/* Dica educativa */}
        <Card className="bg-neutral-50 border-l-4 border-primary-500">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-neutral-900">O que é pró-labore?</h4>
              <p className="text-sm text-neutral-600 mt-1">
                É o "salário" que você, como dono, retira da empresa todo mês. Diferente de pegar dinheiro do caixa quando precisa, 
                o pró-labore é um valor fixo que te ajuda a ter previsibilidade financeira tanto na vida pessoal quanto no negócio.
              </p>
              <p className="text-sm text-neutral-600 mt-2">
                <strong>Regra de ouro:</strong> O pró-labore deve vir do <em>lucro</em>, não do faturamento. 
                Se você tira mais do que sobra, está "comendo" o capital da empresa.
              </p>
            </div>
          </div>
        </Card>

        {/* Modal de retirada */}
        <Modal
          isOpen={showModal}
          onClose={() => { setShowModal(false); limparFormRetirada(); }}
          title={editandoRetirada ? "Editar Retirada" : "Registrar Retirada"}
        >
          <div className="space-y-4">
            {!editandoRetirada && (
              <div className="p-4 bg-secondary-50 rounded-xl">
                <p className="text-sm text-neutral-600">Disponível este mês</p>
                <p className="text-2xl font-bold text-secondary-700">{formatarMoeda(disponivel)}</p>
              </div>
            )}

            <Input
              label="Valor (R$)"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />

            <Input
              label="Data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />

            <Input
              label="Observação (opcional)"
              placeholder="Ex: Retirada mensal, despesa pessoal..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />

            {!editandoRetirada && parseFloat(valor.replace(',', '.') || '0') > disponivel && disponivel > 0 && (
              <div className="p-3 bg-alerta-light rounded-xl text-sm text-alerta-dark">
                ⚠️ Esse valor ultrapassa seu pró-labore disponível
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="ghost" onClick={() => { setShowModal(false); limparFormRetirada(); }} className="flex-1">
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                onClick={handleRetirar}
                disabled={salvando || !valor}
                className="flex-1"
              >
                {salvando ? 'Salvando...' : 'Registrar'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal de configuração */}
        <Modal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          title="Alterar Pró-labore"
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Defina o valor que você pretende retirar por mês como seu "salário".
            </p>

            <div className="p-4 bg-primary-50 rounded-xl">
              <p className="text-sm text-neutral-600 mb-1">Sugestão baseada no seu perfil</p>
              <p className="text-lg font-bold text-primary-700">
                {formatarMoeda(sugestao.min)} a {formatarMoeda(sugestao.max)}
              </p>
            </div>

            <Input
              label="Novo valor do pró-labore (R$)"
              placeholder="0,00"
              value={novoProlabore}
              onChange={(e) => setNovoProlabore(e.target.value)}
              required
            />

            <div className="flex gap-2 pt-4">
              <Button variant="ghost" onClick={() => setShowConfigModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSalvarConfig}
                disabled={salvando || !novoProlabore}
                className="flex-1"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
