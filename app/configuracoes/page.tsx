'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, Button, Input, Select, Badge } from '@/components/ui';
import { Empresa, Configuracao, TipoNegocio, FaixaFaturamento } from '@/lib/types';
import {
  Building2,
  Bell,
  Database,
  Shield,
  Download,
  Check,
  LogOut
} from 'lucide-react';

const TIPOS_NEGOCIO = [
  { value: 'beleza', label: '💇 Beleza e Estética' },
  { value: 'alimentacao', label: '🍽️ Comida e Bebida' },
  { value: 'comercio', label: '🛒 Comércio e Loja' },
  { value: 'servicos', label: '💻 Serviços e Freela' },
  { value: 'oficina', label: '🔧 Oficina e Reparo' },
  { value: 'outro', label: '📦 Outro' },
];

const FAIXAS_FATURAMENTO = [
  { value: 'ate5k', label: 'Até R$ 5 mil' },
  { value: '5a10k', label: 'R$ 5 a 10 mil' },
  { value: '10a20k', label: 'R$ 10 a 20 mil' },
  { value: 'acima20k', label: 'Acima de R$ 20 mil' },
  { value: 'naosei', label: 'Não sei' },
];

export default function ConfiguracoesPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  
  // Dados
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [userEmail, setUserEmail] = useState('');
  
  // Form empresa
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio>('outro');
  const [faixaFaturamento, setFaixaFaturamento] = useState<FaixaFaturamento>('naosei');
  const [saldoInicial, setSaldoInicial] = useState('');
  
  // Form config
  const [alertaDiasAntes, setAlertaDiasAntes] = useState(3);
  const [notificacoesPush, setNotificacoesPush] = useState(true);
  const [diaResumoSemanal, setDiaResumoSemanal] = useState(1);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    setUserEmail(user.email || '');

    // Carregar empresa
    const { data: emp } = await supabase
      .from('empresas')
      .select('*')
      .eq('usuario_id', user.id)
      .single();
    
    if (emp) {
      setEmpresa(emp);
      setNomeEmpresa(emp.nome);
      setCnpj(emp.cnpj || '');
      setTipoNegocio(emp.tipo_negocio as TipoNegocio);
      setFaixaFaturamento(emp.faixa_faturamento as FaixaFaturamento);
      setSaldoInicial(emp.saldo_inicial?.toString() || '0');
    }

    // Carregar configurações
    const { data: cfg } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('empresa_id', emp?.id)
      .single();
    
    if (cfg) {
      setConfig(cfg);
      setAlertaDiasAntes(cfg.alerta_dias_antes);
      setNotificacoesPush(cfg.notificacoes_push);
      setDiaResumoSemanal(cfg.dia_resumo_semanal);
    }
    
    setLoading(false);
  }

  async function salvarEmpresa() {
    if (!empresa) return;
    
    setSalvando(true);
    
    const valorSaldo = parseFloat(saldoInicial.replace(',', '.')) || 0;
    
    const { error } = await supabase
      .from('empresas')
      .update({
        nome: nomeEmpresa,
        cnpj: cnpj || null,
        tipo_negocio: tipoNegocio,
        faixa_faturamento: faixaFaturamento,
        saldo_inicial: valorSaldo,
        moeda_padrao: empresa.moeda_padrao || 'BRL',
      })
      .eq('id', empresa.id);
    
    if (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar dados da empresa' });
    } else {
      setMensagem({ tipo: 'sucesso', texto: 'Dados da empresa salvos!' });
    }
    
    setSalvando(false);
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3000);
  }

  async function salvarConfig() {
    if (!config) return;
    
    setSalvando(true);
    
    const { error } = await supabase
      .from('configuracoes')
      .update({
        alerta_dias_antes: alertaDiasAntes,
        notificacoes_push: notificacoesPush,
        dia_resumo_semanal: diaResumoSemanal,
      })
      .eq('id', config.id);
    
    if (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar configurações' });
    } else {
      setMensagem({ tipo: 'sucesso', texto: 'Configurações salvas!' });
    }
    
    setSalvando(false);
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3000);
  }

  async function exportarDados() {
    if (!empresa) return;
    
    // Carregar todos os dados
    const [lancamentos, contas, fornecedores, retiradas] = await Promise.all([
      supabase.from('lancamentos').select('*').eq('empresa_id', empresa.id),
      supabase.from('contas').select('*').eq('empresa_id', empresa.id),
      supabase.from('fornecedores').select('*').eq('empresa_id', empresa.id),
      supabase.from('retiradas_prolabore').select('*').eq('empresa_id', empresa.id),
    ]);

    const backup = {
      versao: '1.0.0',
      exportadoEm: new Date().toISOString(),
      empresa: { ...empresa, id: undefined, usuario_id: undefined },
      lancamentos: lancamentos.data?.map(l => ({ ...l, id: undefined, empresa_id: undefined })) || [],
      contas: contas.data?.map(c => ({ ...c, id: undefined, empresa_id: undefined })) || [],
      fornecedores: fornecedores.data?.map(f => ({ ...f, id: undefined, empresa_id: undefined })) || [],
      retiradas: retiradas.data?.map(r => ({ ...r, id: undefined, empresa_id: undefined })) || [],
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caixa360-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setMensagem({ tipo: 'sucesso', texto: 'Backup exportado com sucesso!' });
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Configurações</h1>
          <p className="text-neutral-500">Gerencie sua conta e preferências</p>
        </div>

        {/* Mensagem */}
        {mensagem.texto && (
          <div className={`p-4 rounded-xl ${mensagem.tipo === 'sucesso' ? 'bg-entrada-light text-entrada-dark' : 'bg-saida-light text-saida-dark'}`}>
            {mensagem.tipo === 'sucesso' && <Check className="w-5 h-5 inline mr-2" />}
            {mensagem.texto}
          </div>
        )}

        {/* Dados da empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-500" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <Input
              label="Nome da empresa"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
            />

            <Input
              label="CNPJ (opcional)"
              placeholder="00.000.000/0001-00"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
            />

            <Select
              label="Tipo de negócio"
              value={tipoNegocio}
              onChange={(e) => setTipoNegocio(e.target.value as TipoNegocio)}
              options={TIPOS_NEGOCIO}
            />

            <Select
              label="Faixa de faturamento"
              value={faixaFaturamento}
              onChange={(e) => setFaixaFaturamento(e.target.value as FaixaFaturamento)}
              options={FAIXAS_FATURAMENTO}
            />

            <Input
              label="💰 Saldo inicial do caixa"
              placeholder="Ex: 1500.00"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              type="text"
              inputMode="decimal"
            />
            <p className="text-xs text-neutral-500 -mt-3">
              O valor que havia no caixa quando você começou a usar o sistema
            </p>

            <Select
              label="💱 Moeda padrão"
              value={empresa?.moeda_padrao || 'BRL'}
              onChange={(e) => {
                if (empresa) {
                  setEmpresa({...empresa, moeda_padrao: e.target.value});
                }
              }}
              options={[
                { value: 'BRL', label: '🇧🇷 Real Brasileiro (R$)' },
                { value: 'USD', label: '🇺🇸 Dólar Americano ($)' },
                { value: 'EUR', label: '🇪🇺 Euro (€)' },
                { value: 'GBP', label: '🇬🇧 Libra Esterlina (£)' },
              ]}
            />
            <p className="text-xs text-neutral-500 -mt-3">
              A moeda principal usada nos lançamentos
            </p>

            <Button variant="primary" onClick={salvarEmpresa} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary-500" />
              Notificações
            </CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-900">Alertas de contas</p>
                <p className="text-sm text-neutral-500">Avisar antes do vencimento</p>
              </div>
              <Select
                value={alertaDiasAntes.toString()}
                onChange={(e) => setAlertaDiasAntes(parseInt(e.target.value))}
                options={[
                  { value: '1', label: '1 dia antes' },
                  { value: '2', label: '2 dias antes' },
                  { value: '3', label: '3 dias antes' },
                  { value: '5', label: '5 dias antes' },
                  { value: '7', label: '1 semana antes' },
                ]}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-900">Resumo semanal</p>
                <p className="text-sm text-neutral-500">Receber resumo automático</p>
              </div>
              <Select
                value={diaResumoSemanal.toString()}
                onChange={(e) => setDiaResumoSemanal(parseInt(e.target.value))}
                options={[
                  { value: '0', label: 'Domingo' },
                  { value: '1', label: 'Segunda' },
                  { value: '6', label: 'Sábado' },
                ]}
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notificacoesPush}
                onChange={(e) => setNotificacoesPush(e.target.checked)}
                className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-neutral-900">Notificações Push</p>
                <p className="text-sm text-neutral-500">Receber alertas no navegador</p>
              </div>
            </label>

            <Button variant="primary" onClick={salvarConfig} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar preferências'}
            </Button>
          </div>
        </Card>

        {/* Backup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary-500" />
              Backup de Dados
            </CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              Exporte todos os seus dados em formato JSON para manter uma cópia de segurança.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={exportarDados}>
                <Download className="w-4 h-4" />
                Exportar dados
              </Button>
            </div>
          </div>
        </Card>

        {/* Conta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-500" />
              Sua Conta
            </CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <div className="p-4 bg-neutral-50 rounded-xl">
              <p className="text-sm text-neutral-500">Email</p>
              <p className="font-medium text-neutral-900">{userEmail}</p>
            </div>

            <Button variant="ghost" onClick={handleLogout} className="text-saida hover:bg-saida-light">
              <LogOut className="w-4 h-4" />
              Sair da conta
            </Button>
          </div>
        </Card>

        {/* Versão */}
        <div className="text-center text-sm text-neutral-400 pb-8">
          <p>Caixa360 v1.0.0</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Badge variant="info">IA</Badge>
            <Badge variant="entrada">Voz</Badge>
            <Badge variant="default">Beta</Badge>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
