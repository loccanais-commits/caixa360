'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Card } from '@/components/ui';
import { 
  TipoNegocio, 
  FaixaFaturamento, 
  DorPrincipal,
  PROLABORE_REFERENCIA,
  FATURAMENTO_VALORES
} from '@/lib/types';
import { 
  Scissors, 
  UtensilsCrossed, 
  ShoppingBag, 
  Laptop, 
  Wrench, 
  Package,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles
} from 'lucide-react';

const TIPOS_NEGOCIO = [
  { value: 'beleza' as TipoNegocio, label: 'Beleza e Estética', icon: Scissors, emoji: '💇' },
  { value: 'alimentacao' as TipoNegocio, label: 'Comida e Bebida', icon: UtensilsCrossed, emoji: '🍽️' },
  { value: 'comercio' as TipoNegocio, label: 'Comércio e Loja', icon: ShoppingBag, emoji: '🛒' },
  { value: 'servicos' as TipoNegocio, label: 'Serviços e Freela', icon: Laptop, emoji: '💻' },
  { value: 'oficina' as TipoNegocio, label: 'Oficina e Reparo', icon: Wrench, emoji: '🔧' },
  { value: 'outro' as TipoNegocio, label: 'Outro', icon: Package, emoji: '📦' },
];

const FAIXAS_FATURAMENTO = [
  { value: 'ate5k' as FaixaFaturamento, label: 'Até R$ 5 mil' },
  { value: '5a10k' as FaixaFaturamento, label: 'R$ 5 a 10 mil' },
  { value: '10a20k' as FaixaFaturamento, label: 'R$ 10 a 20 mil' },
  { value: 'acima20k' as FaixaFaturamento, label: 'Acima de R$ 20 mil' },
  { value: 'naosei' as FaixaFaturamento, label: '🤷 Não sei', desc: 'Isso é comum, vamos descobrir juntos!' },
];

const DORES_PRINCIPAIS = [
  { value: 'nao_sobra' as DorPrincipal, label: 'Nunca sobra dinheiro no fim do mês', emoji: '💸' },
  { value: 'mistura_dinheiro' as DorPrincipal, label: 'Misturo dinheiro pessoal com o da empresa', emoji: '🔀' },
  { value: 'esquece_contas' as DorPrincipal, label: 'Esqueço de pagar contas e levo multa', emoji: '📅' },
  { value: 'nao_sabe_lucro' as DorPrincipal, label: 'Não sei quanto estou lucrando de verdade', emoji: '📊' },
  { value: 'comecando' as DorPrincipal, label: 'Estou começando agora', emoji: '🆕' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [userName, setUserName] = useState('');
  
  // Dados do onboarding
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio | null>(null);
  const [faixaFaturamento, setFaixaFaturamento] = useState<FaixaFaturamento | null>(null);
  const [dorPrincipal, setDorPrincipal] = useState<DorPrincipal | null>(null);
  const [saldoInicial, setSaldoInicial] = useState('');

  // Verificar se já tem empresa cadastrada
  useEffect(() => {
    async function checkExistingEmpresa() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      const nome = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';
      setUserName(nome);

      // Verificar se já tem empresa
      const { data: empresa } = await supabase
        .from('empresas')
        .select('id')
        .eq('usuario_id', user.id)
        .maybeSingle();

      if (empresa) {
        // Já tem empresa, redirecionar para dashboard
        router.push('/dashboard');
        return;
      }

      setCheckingExisting(false);
    }
    checkExistingEmpresa();
  }, [supabase, router]);

  // Calcular sugestão de pró-labore
  const calcularProlaboreSugerido = () => {
    if (!tipoNegocio || !faixaFaturamento) return { min: 0, max: 0 };
    
    const ref = PROLABORE_REFERENCIA[tipoNegocio];
    const fat = FATURAMENTO_VALORES[faixaFaturamento];
    
    const min = Math.round((fat.medio * ref.prolaboreMin) / 100);
    const max = Math.round((fat.medio * ref.prolaboreMax) / 100);
    
    return { min, max };
  };

  // Salvar dados e ir para dashboard
  const handleFinish = async () => {
    if (!tipoNegocio || !faixaFaturamento || !dorPrincipal) return;
    
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }

    // Verificar se usuário existe na tabela usuarios, se não, criar
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingUser) {
      const { error: userError } = await supabase.from('usuarios').insert({
        id: user.id,
        email: user.email,
        nome: user.user_metadata?.full_name || 
              user.user_metadata?.name || 
              user.email?.split('@')[0] || 
              'Usuário',
      });

      if (userError) {
        console.error('Erro ao criar usuário:', userError);
        setLoading(false);
        return;
      }
    }

    // Verificar se já existe empresa (evitar duplicatas)
    const { data: existingEmpresa } = await supabase
      .from('empresas')
      .select('id')
      .eq('usuario_id', user.id)
      .maybeSingle();

    if (existingEmpresa) {
      // Já tem empresa, só redirecionar
      router.push('/dashboard');
      return;
    }

    // Criar empresa (sem pró-labore definido - será sugerido depois com dados)
    const valorSaldoInicial = saldoInicial ? parseFloat(saldoInicial.replace(',', '.')) : 0;
    
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .insert({
        usuario_id: user.id,
        nome: nomeEmpresa || `Empresa de ${userName}`,
        tipo_negocio: tipoNegocio,
        faixa_faturamento: faixaFaturamento,
        dor_principal: dorPrincipal,
        saldo_inicial: valorSaldoInicial,
        prolabore_definido: 0, // Será sugerido pela IA após ter dados
      })
      .select()
      .single();

    if (empresaError) {
      console.error('Erro ao criar empresa:', empresaError);
      setLoading(false);
      return;
    }

    // Criar configurações padrão
    await supabase.from('configuracoes').insert({
      empresa_id: empresa.id,
      alerta_dias_antes: 3,
      notificacoes_push: true,
      dia_resumo_semanal: 1, // Segunda-feira
    });

    // Redirecionar para dashboard
    router.push('/dashboard');
  };

  const canProceed = () => {
    switch (step) {
      case 1: return tipoNegocio !== null;
      case 2: return faixaFaturamento !== null;
      case 3: return dorPrincipal !== null;
      default: return false;
    }
  };

  const prolabore = calcularProlaboreSugerido();

  // Mostrar loading enquanto verifica se já tem empresa
  if (checkingExisting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.svg" alt="Caixa360" className="w-16 h-16 mx-auto mb-4 rounded-2xl animate-pulse" />
          <p className="text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Caixa360" className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
          <h1 className="text-2xl font-bold text-neutral-900">
            {step < 4 ? 'Vamos personalizar sua experiência!' : `Tudo pronto, ${userName.split(' ')[0]}!`}
          </h1>
          <p className="text-neutral-500 mt-1">
            {step < 4 ? '30 segundos, prometemos 😉' : 'Seu Caixa360 está configurado'}
          </p>
        </div>

        {/* Progress */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div 
                key={s}
                className={`w-12 h-1.5 rounded-full transition-all ${
                  s <= step ? 'bg-primary-500' : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
        )}

        <Card className="shadow-xl">
          {/* Step 1: Tipo de negócio */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                Qual é o tipo do seu negócio?
              </h2>
              <p className="text-sm text-neutral-500 mb-6">
                Isso nos ajuda a personalizar as categorias e sugestões
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {TIPOS_NEGOCIO.map((tipo) => (
                  <button
                    key={tipo.value}
                    onClick={() => setTipoNegocio(tipo.value)}
                    className={`option-card text-center ${
                      tipoNegocio === tipo.value ? 'selected' : ''
                    }`}
                  >
                    <span className="text-3xl mb-2 block">{tipo.emoji}</span>
                    <span className="text-sm font-medium text-neutral-700">{tipo.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Faturamento */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                Quanto você fatura por mês, mais ou menos?
              </h2>
              <p className="text-sm text-neutral-500 mb-6">
                Não precisa ser exato, é só para calibrar as sugestões
              </p>

              <div className="space-y-3">
                {FAIXAS_FATURAMENTO.map((faixa) => (
                  <button
                    key={faixa.value}
                    onClick={() => setFaixaFaturamento(faixa.value)}
                    className={`option-card w-full text-left flex items-center justify-between ${
                      faixaFaturamento === faixa.value ? 'selected' : ''
                    }`}
                  >
                    <div>
                      <span className="font-medium text-neutral-700">{faixa.label}</span>
                      {faixa.desc && (
                        <p className="text-xs text-neutral-500 mt-0.5">{faixa.desc}</p>
                      )}
                    </div>
                    {faixaFaturamento === faixa.value && (
                      <Check className="w-5 h-5 text-primary-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Dor principal */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                Qual sua maior dificuldade hoje?
              </h2>
              <p className="text-sm text-neutral-500 mb-6">
                Vamos focar em resolver isso primeiro
              </p>

              <div className="space-y-3">
                {DORES_PRINCIPAIS.map((dor) => (
                  <button
                    key={dor.value}
                    onClick={() => setDorPrincipal(dor.value)}
                    className={`option-card w-full text-left flex items-center gap-3 ${
                      dorPrincipal === dor.value ? 'selected' : ''
                    }`}
                  >
                    <span className="text-2xl">{dor.emoji}</span>
                    <span className="font-medium text-neutral-700 flex-1">{dor.label}</span>
                    {dorPrincipal === dor.value && (
                      <Check className="w-5 h-5 text-primary-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Finalização */}
          {step === 4 && (
            <div className="animate-fade-in text-center py-4">
              <div className="w-20 h-20 bg-entrada-light rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-entrada-dark" />
              </div>

              <div className="space-y-4 mb-6">
                <Input
                  label="Nome do seu negócio (opcional)"
                  placeholder={`Ex: Salão da ${userName.split(' ')[0]}`}
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                />
                
                <div className="text-left">
                  <Input
                    label="💰 Quanto tem no caixa hoje? (opcional)"
                    placeholder="Ex: 1500,00"
                    value={saldoInicial}
                    onChange={(e) => setSaldoInicial(e.target.value)}
                    type="text"
                    inputMode="decimal"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Se você já tem um saldo na empresa, informe aqui para começarmos com o valor correto
                  </p>
                </div>
              </div>

              <div className="bg-primary-50 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm font-medium text-primary-700 mb-2">
                  💡 O que vai acontecer agora:
                </p>
                <ul className="text-sm text-neutral-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-entrada">✓</span>
                    <span>Registre suas entradas e saídas (por voz ou digitando)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-entrada">✓</span>
                    <span>A IA vai categorizar automaticamente</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-entrada">✓</span>
                    <span>Depois de 1 semana, a IA vai sugerir seu pró-labore ideal</span>
                  </li>
                </ul>
              </div>

              <p className="text-sm text-neutral-500">
                {dorPrincipal === 'mistura_dinheiro' && 
                  'Vamos te ajudar a separar o dinheiro pessoal do da empresa! 💪'}
                {dorPrincipal === 'esquece_contas' && 
                  'Vamos configurar alertas para você nunca mais esquecer! 🔔'}
                {dorPrincipal === 'nao_sobra' && 
                  'Vamos descobrir para onde o dinheiro está indo! 🔍'}
                {dorPrincipal === 'nao_sabe_lucro' && 
                  'Vamos calcular seu lucro real automaticamente! 📊'}
                {dorPrincipal === 'comecando' && 
                  'Ótimo momento para começar organizado! 🚀'}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-100">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <Button 
                variant="primary"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                variant="primary"
                onClick={handleFinish}
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    🚀 Começar a usar
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
