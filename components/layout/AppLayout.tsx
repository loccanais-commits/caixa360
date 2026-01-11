'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Avatar, Button, Badge, Input, Select, Modal } from '@/components/ui';
import { CATEGORIAS_BASE, Categoria, TipoLancamento, Fornecedor } from '@/lib/types';
import { InstallPWA } from '@/components/InstallPWA';
import { NotificacoesPanel, useNotificacoesCount } from '@/components/NotificacoesPanel';
import clsx from 'clsx';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  Wallet,
  Calendar,
  Upload,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Mic,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Bot,
  Send,
  MessageCircle,
  UserPlus,
  Tag
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

// Menu reorganizado: Meu Salário antes de Relatório
const menuItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/lancamentos', label: 'Lançamentos', icon: ArrowLeftRight },
  { href: '/fornecedores', label: 'Fornecedores', icon: Package },
  { href: '/contas', label: 'Contas', icon: Calendar, badge: true },
  { href: '/categorias', label: 'Categorias', icon: Tag },
  { href: '/salario', label: 'Meu Salário', icon: Wallet },
  { href: '/relatorio', label: 'Relatório', icon: FileText },
  { href: '/importar', label: 'Importar', icon: Upload },
];

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [contasPendentes, setContasPendentes] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showLancamentoModal, setShowLancamentoModal] = useState(false);
  const [tipoLancamento, setTipoLancamento] = useState<'entrada' | 'saida'>('entrada');
  const [showAssistente, setShowAssistente] = useState(false);
  const [showNotificacoes, setShowNotificacoes] = useState(false);
  
  // Hook para contar notificações
  const notificacoesCount = useNotificacoesCount(empresaId);

  useEffect(() => {
    if (!authLoading && user) {
      loadUserData();
    }
  }, [authLoading, user]);

  async function loadUserData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Carregar dados do usuário
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('nome')
      .eq('id', user.id)
      .single();
    
    if (usuario) setUserName(usuario.nome);

    // Carregar empresa
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, nome')
      .eq('usuario_id', user.id)
      .single();
    
    if (empresa) {
      setEmpresaNome(empresa.nome);
      setEmpresaId(empresa.id);

      // Contar contas pendentes/atrasadas
      const { count } = await supabase
        .from('contas')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresa.id)
        .in('status', ['pendente', 'atrasado']);
      
      setContasPendentes(count || 0);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-neutral-100">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-neutral-100">
          <img src="/logo.png" alt="Caixa360" className="w-10 h-10 rounded-xl mr-3" />
          <span className="font-bold text-xl gradient-text">Caixa360</span>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx('sidebar-link relative', isActive && 'active')}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.badge && contasPendentes > 0 && (
                  <span className="notification-badge">{contasPendentes}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 space-y-2">
          <Link href="/configuracoes" className="sidebar-link">
            <Settings className="w-5 h-5" />
            <span>Configurações</span>
          </Link>
          <button onClick={handleLogout} className="sidebar-link w-full text-saida hover:text-saida-dark hover:bg-saida-light">
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-neutral-100 h-16">
        <div className="flex items-center justify-between px-4 h-full">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 hover:bg-neutral-100 rounded-lg"
          >
            <Menu className="w-6 h-6 text-neutral-600" />
          </button>
          
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Caixa360" className="w-8 h-8 rounded-lg" />
            <span className="font-bold gradient-text">Caixa360</span>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative">
              <button 
                onClick={() => setShowNotificacoes(!showNotificacoes)}
                className="p-2 hover:bg-neutral-100 rounded-lg relative"
              >
                <Bell className="w-6 h-6 text-neutral-600" />
                {notificacoesCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-saida text-white text-xs rounded-full flex items-center justify-center">
                    {notificacoesCount > 9 ? '9+' : notificacoesCount}
                  </span>
                )}
              </button>
              <NotificacoesPanel 
                isOpen={showNotificacoes} 
                onClose={() => setShowNotificacoes(false)}
                empresaId={empresaId}
              />
            </div>
            <Link href="/configuracoes" className="p-2 hover:bg-neutral-100 rounded-lg">
              <Settings className="w-6 h-6 text-neutral-600" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white animate-slide-up">
            <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-100">
              <span className="font-bold text-lg">Menu</span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx('sidebar-link relative', isActive && 'active')}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    {item.badge && contasPendentes > 0 && (
                      <span className="notification-badge">{contasPendentes}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        {/* Top Bar com ações rápidas */}
        <div className="sticky top-0 lg:top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-neutral-100">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Saudação - Desktop */}
              <div className="hidden lg:block">
                <p className="text-sm text-neutral-500">Bem-vindo(a) de volta</p>
                <h1 className="font-semibold text-neutral-900">{userName}</h1>
              </div>

              {/* Ações Rápidas */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap lg:mt-0 mt-16 w-full lg:w-auto justify-center lg:justify-end">
                <Button variant="entrada" size="md" onClick={() => { setTipoLancamento('entrada'); setShowLancamentoModal(true); }} className="min-w-[90px] sm:min-w-[100px] h-10 sm:h-11">
                  <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">Entrada</span>
                </Button>
                <Button variant="saida" size="md" onClick={() => { setTipoLancamento('saida'); setShowLancamentoModal(true); }} className="min-w-[90px] sm:min-w-[100px] h-10 sm:h-11">
                  <ArrowDownCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">Saída</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="bg-secondary-50 text-secondary-700 hover:bg-secondary-100 h-10 sm:h-11 min-w-[40px] sm:min-w-[100px]"
                  onClick={() => setShowAssistente(true)}
                >
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Assistente</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className={clsx(
          "p-4 lg:p-8 pb-24 lg:pb-8 transition-all",
          showAssistente && "lg:mr-[400px]"
        )}>
          {children}
        </div>
      </main>

      {/* Modal de Lançamento Rápido */}
      <QuickLancamentoModal 
        isOpen={showLancamentoModal}
        onClose={() => setShowLancamentoModal(false)}
        tipo={tipoLancamento}
        empresaId={empresaId}
        onSuccess={() => {
          setShowLancamentoModal(false);
          window.location.reload();
        }}
      />

      {/* Assistente IA - Sidebar no desktop, Modal no mobile */}
      <AssistenteSidebar
        isOpen={showAssistente}
        onClose={() => setShowAssistente(false)}
        empresaId={empresaId}
      />

      {/* Floating Voice Button - Ajustado para mobile */}
      <VoiceButton empresaId={empresaId} onSuccess={() => window.location.reload()} />

      {/* PWA Install Banner */}
      <InstallPWA />
    </div>
  );
}

// Componente do botão de voz
function VoiceButton({ empresaId, onSuccess }: { empresaId: string; onSuccess: () => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const supabase = createClient();

  // Carregar fornecedores
  useEffect(() => {
    if (empresaId) {
      supabase
        .from('fornecedores')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .then(({ data }) => setFornecedores(data || []));
    }
  }, [empresaId]);

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript('');
    };

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setIsRecording(false);
      setIsProcessing(true);
      
      // Processar com IA
      await processarComIA(text);
    };

    recognition.onerror = (event: any) => {
      console.error('Erro no reconhecimento:', event.error);
      setIsRecording(false);
      alert('Erro ao capturar áudio. Tente novamente.');
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const processarComIA = async (texto: string) => {
    try {
      const response = await fetch('/api/voice-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, fornecedores }),
      });

      const data = await response.json();
      
      if (data.error) {
        alert('Erro ao processar: ' + data.error);
        setIsProcessing(false);
        return;
      }

      setResultado(data);
      setShowModal(true);
      setIsProcessing(false);
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao processar o áudio');
      setIsProcessing(false);
    }
  };

  const confirmarLancamento = async () => {
    if (!resultado || !empresaId) return;

    const hoje = new Date().toISOString().split('T')[0];
    const dataLancamento = resultado.data || hoje;
    const ehFuturo = dataLancamento > hoje;

    if (ehFuturo) {
      // Salvar em contas (a pagar/receber)
      await supabase.from('contas').insert({
        empresa_id: empresaId,
        tipo: resultado.tipo,
        descricao: resultado.descricao,
        valor: resultado.valor,
        categoria: resultado.categoria,
        data_vencimento: dataLancamento,
        status: 'pendente',
        fornecedor_id: resultado.fornecedor_id || null,
      });
    } else {
      // Salvar em lançamentos
      await supabase.from('lancamentos').insert({
        empresa_id: empresaId,
        tipo: resultado.tipo,
        descricao: resultado.descricao,
        valor: resultado.valor,
        categoria: resultado.categoria,
        data: dataLancamento,
        fornecedor_id: resultado.fornecedor_id || null,
      });
    }

    setShowModal(false);
    setResultado(null);
    setTranscript('');
    onSuccess();
  };

  // Formatar data para exibição
  const formatarDataExibicao = (data: string) => {
    if (!data) return 'Hoje';
    const d = new Date(data + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const hoje = new Date().toISOString().split('T')[0];
  const ehFuturo = resultado?.data && resultado.data > hoje;

  return (
    <>
      <button 
        onClick={startRecording}
        disabled={isRecording || isProcessing}
        className={clsx(
          "fixed bottom-20 lg:bottom-6 right-4 lg:right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-40",
          isRecording 
            ? "bg-saida animate-pulse" 
            : isProcessing 
            ? "bg-alerta"
            : "bg-gradient-to-r from-primary-500 to-secondary-500"
        )}
        title="Lançar por voz"
      >
        {isProcessing ? (
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Mic className={clsx("w-6 h-6 text-white", isRecording && "animate-pulse")} />
        )}
      </button>

      {/* Modal de confirmação */}
      {showModal && resultado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 animate-slide-up">
            <h3 className="font-semibold text-lg mb-4">Confirmar lançamento</h3>
            
            <div className="p-3 bg-neutral-50 rounded-xl mb-4 text-sm text-neutral-600">
              "{transcript}"
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-500">Tipo:</span>
                <span className={resultado.tipo === 'entrada' ? 'text-entrada font-medium' : 'text-saida font-medium'}>
                  {resultado.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Descrição:</span>
                <span className="font-medium text-right flex-1 ml-4">{resultado.descricao}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Valor:</span>
                <span className="font-bold text-lg">R$ {resultado.valor?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Categoria:</span>
                <span>{resultado.categoria}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Data:</span>
                <span className="font-medium">{formatarDataExibicao(resultado.data)}</span>
              </div>
              {resultado.fornecedor_nome && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Fornecedor:</span>
                  <span className="font-medium">{resultado.fornecedor_nome}</span>
                </div>
              )}
            </div>

            {/* Aviso de data futura */}
            {ehFuturo && (
              <div className="mt-4 p-3 bg-alerta-light rounded-xl text-sm text-alerta-dark flex items-center gap-2">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>Data futura: será salvo como <strong>{resultado.tipo === 'entrada' ? 'A Receber' : 'Conta a Pagar'}</strong></span>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarLancamento}
                className={clsx(
                  "flex-1 py-2.5 rounded-xl text-white font-medium",
                  resultado.tipo === 'entrada' ? 'bg-entrada' : 'bg-saida'
                )}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Modal de Lançamento Rápido
function QuickLancamentoModal({ 
  isOpen, 
  onClose, 
  tipo: tipoInicial, 
  empresaId, 
  onSuccess 
}: { 
  isOpen: boolean;
  onClose: () => void;
  tipo: 'entrada' | 'saida';
  empresaId: string;
  onSuccess: () => void;
}) {
  const [tipo, setTipo] = useState<TipoLancamento>(tipoInicial);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState<Categoria>(tipoInicial === 'entrada' ? 'vendas' : 'outros_despesas');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [fornecedorId, setFornecedorId] = useState('');
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [showNovoFornecedor, setShowNovoFornecedor] = useState(false);
  const [novoFornecedorNome, setNovoFornecedorNome] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setTipo(tipoInicial);
    setCategoria(tipoInicial === 'entrada' ? 'vendas' : 'outros_despesas');
    if (empresaId) carregarFornecedores();
  }, [tipoInicial, empresaId]);

  async function carregarFornecedores() {
    const { data } = await supabase
      .from('fornecedores')
      .select('id, nome')
      .eq('empresa_id', empresaId)
      .order('nome');
    setFornecedores(data || []);
  }

  async function criarFornecedor() {
    if (!novoFornecedorNome.trim()) return;
    
    const { data: novo } = await supabase
      .from('fornecedores')
      .insert({
        empresa_id: empresaId,
        nome: novoFornecedorNome.trim(),
        categoria: categoria,
      })
      .select()
      .single();
    
    if (novo) {
      setFornecedores([...fornecedores, novo]);
      setFornecedorId(novo.id);
      setNovoFornecedorNome('');
      setShowNovoFornecedor(false);
    }
  }

  const handleSalvar = async () => {
    if (!descricao || !valor || !empresaId) return;
    
    setSalvando(true);
    
    const valorNum = parseFloat(valor.replace(',', '.'));
    const hoje = new Date().toISOString().split('T')[0];
    const dataEscolhida = data;
    const ehFuturo = dataEscolhida > hoje;

    if (ehFuturo) {
      // Se for data futura, criar como conta a pagar/receber
      await supabase.from('contas').insert({
        empresa_id: empresaId,
        tipo: tipo === 'entrada' ? 'entrada' : 'saida',
        descricao,
        valor: valorNum,
        categoria,
        data_vencimento: dataEscolhida,
        status: 'pendente',
        fornecedor_id: tipo === 'saida' ? (fornecedorId || null) : null,
        observacao: observacao || null,
      });
    } else {
      // Se for hoje ou passado, criar como lançamento
      await supabase.from('lancamentos').insert({
        empresa_id: empresaId,
        tipo,
        descricao,
        valor: valorNum,
        categoria,
        data: dataEscolhida,
        fornecedor_id: tipo === 'saida' ? (fornecedorId || null) : null,
        observacao: observacao || null,
      });
    }
    
    setSalvando(false);
    setDescricao('');
    setValor('');
    setFornecedorId('');
    setObservacao('');
    onSuccess();
  };

  const categoriasTipo = Object.entries(CATEGORIAS_BASE).filter(([_, c]) => c.tipo === tipo);
  const hoje = new Date().toISOString().split('T')[0];
  const ehFuturo = data > hoje;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md p-5 animate-slide-up max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-lg mb-4">
          {tipo === 'entrada' ? '↑ Nova Entrada' : '↓ Nova Saída'}
        </h3>

        <div className="space-y-3">
          {/* Tipo */}
          <div className="flex gap-2">
            <button
              onClick={() => { setTipo('entrada'); setCategoria('vendas'); }}
              className={clsx(
                "flex-1 py-3 rounded-xl font-medium transition-all",
                tipo === 'entrada' 
                  ? 'bg-entrada text-white' 
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              )}
            >
              <ArrowUpCircle className="w-5 h-5 inline mr-2" />
              Entrada
            </button>
            <button
              onClick={() => { setTipo('saida'); setCategoria('outros_despesas'); }}
              className={clsx(
                "flex-1 py-3 rounded-xl font-medium transition-all",
                tipo === 'saida' 
                  ? 'bg-saida text-white' 
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              )}
            >
              <ArrowDownCircle className="w-5 h-5 inline mr-2" />
              Saída
            </button>
          </div>

          <Input
            label="Descrição"
            placeholder={tipo === 'entrada' ? 'Ex: Venda para cliente X' : 'Ex: Conta de luz'}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
          />

          <Input
            label="Valor (R$)"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
          />

          <Select
            label="Categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as Categoria)}
            options={categoriasTipo.map(([key, cat]) => ({
              value: key,
              label: `${cat.icone} ${cat.label}`,
            }))}
          />

          {/* Fornecedor (apenas para saídas) */}
          {tipo === 'saida' && (
            <div>
              {!showNovoFornecedor ? (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      label="Fornecedor (opcional)"
                      value={fornecedorId}
                      onChange={(e) => setFornecedorId(e.target.value)}
                      options={[
                        { value: '', label: 'Nenhum' },
                        ...fornecedores.map(f => ({ value: f.id, label: f.nome }))
                      ]}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNovoFornecedor(true)}
                    className="mt-7 p-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
                    title="Adicionar fornecedor"
                  >
                    <UserPlus className="w-5 h-5 text-neutral-600" />
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-neutral-50 rounded-xl space-y-2">
                  <p className="text-sm font-medium text-neutral-700">Novo fornecedor</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome do fornecedor"
                      value={novoFornecedorNome}
                      onChange={(e) => setNovoFornecedorNome(e.target.value)}
                    />
                    <button
                      onClick={criarFornecedor}
                      className="px-3 bg-primary-500 text-white rounded-lg text-sm"
                    >
                      Criar
                    </button>
                    <button
                      onClick={() => setShowNovoFornecedor(false)}
                      className="px-3 bg-neutral-200 rounded-lg text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Input
            label="Data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />

          <Input
            label="Observação (opcional)"
            placeholder="Detalhes adicionais..."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />

          {/* Aviso de data futura */}
          {ehFuturo && (
            <div className="p-3 bg-alerta-light rounded-xl text-sm text-alerta-dark flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Data futura: será salvo como <strong>{tipo === 'entrada' ? 'A Receber' : 'Conta a Pagar'}</strong></span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSalvar}
              disabled={salvando || !descricao || !valor}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-white font-medium disabled:opacity-50",
                tipo === 'entrada' ? 'bg-entrada' : 'bg-saida'
              )}
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sidebar do Assistente IA
function AssistenteSidebar({ 
  isOpen, 
  onClose, 
  empresaId 
}: { 
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
}) {
  const [mensagem, setMensagem] = useState('');
  const [conversas, setConversas] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'Olá! 👋 Sou seu assistente financeiro.\n\nPosso ajudar com:\n• "Quanto gastei esse mês?"\n• "Qual minha maior despesa?"\n• Enviar documentos para análise 📎' }
  ]);
  const [processando, setProcessando] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const supabase = createClient();

  const enviarMensagem = async () => {
    if (!mensagem.trim() || processando) return;

    const novaMensagem = mensagem.trim();
    setMensagem('');
    setConversas(prev => [...prev, { role: 'user', content: novaMensagem }]);
    setProcessando(true);

    try {
      // Buscar TODOS os dados necessários incluindo fornecedores
      const [lancamentos, contas, empresa, fornecedores] = await Promise.all([
        supabase.from('lancamentos').select('*').eq('empresa_id', empresaId).order('data', { ascending: false }).limit(100),
        supabase.from('contas').select('*').eq('empresa_id', empresaId),
        supabase.from('empresas').select('*').eq('id', empresaId).single(),
        supabase.from('fornecedores').select('*').eq('empresa_id', empresaId),
      ]);

      const response = await fetch('/api/assistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem: novaMensagem,
          contexto: {
            lancamentos: lancamentos.data,
            contas: contas.data,
            empresa: empresa.data,
            fornecedores: fornecedores.data,
          }
        }),
      });

      const data = await response.json();
      setConversas(prev => [...prev, { role: 'assistant', content: data.resposta || 'Desculpe, não consegui processar.' }]);
    } catch (error) {
      setConversas(prev => [...prev, { role: 'assistant', content: 'Erro ao processar. Tente novamente.' }]);
    }

    setProcessando(false);
  };

  const handleDocumentoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setConversas(prev => [...prev, { role: 'user', content: `📎 Enviando: ${file.name}` }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('empresaId', empresaId);

      const response = await fetch('/api/processar-documento', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        setConversas(prev => [...prev, { role: 'assistant', content: `❌ ${data.error}` }]);
      } else {
        setConversas(prev => [...prev, { 
          role: 'assistant', 
          content: `📄 **Documento analisado:** ${data.arquivo.nome}\n\n${data.analise}` 
        }]);
      }
    } catch (error) {
      setConversas(prev => [...prev, { role: 'assistant', content: 'Erro ao processar documento. Tente novamente.' }]);
    }

    setUploadingDoc(false);
    // Limpar input
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay no mobile */}
      <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      
      {/* Sidebar/Modal */}
      <div className={clsx(
        "fixed z-50 bg-white flex flex-col shadow-2xl",
        // Mobile: modal quase fullscreen
        "inset-x-0 bottom-0 h-[85vh] rounded-t-2xl",
        // Desktop: sidebar lateral direita
        "lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[400px] lg:h-full lg:rounded-none lg:rounded-l-2xl"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Assistente Caixa360</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversas.map((c, i) => (
            <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={clsx(
                "max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap",
                c.role === 'user' 
                  ? 'bg-primary-500 text-white rounded-br-sm'
                  : 'bg-neutral-100 text-neutral-800 rounded-bl-sm'
              )}>
                {c.content}
              </div>
            </div>
          ))}
          {processando && (
            <div className="flex justify-start">
              <div className="bg-neutral-100 p-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                  <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                  <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-neutral-100">
          <div className="flex gap-2">
            {/* Botão de upload */}
            <label className="p-2.5 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer transition-colors">
              <input
                type="file"
                accept=".txt,.csv,.pdf,image/*"
                onChange={handleDocumentoUpload}
                className="hidden"
                disabled={uploadingDoc}
              />
              {uploadingDoc ? (
                <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-5 h-5 text-neutral-500" />
              )}
            </label>
            <input
              type="text"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviarMensagem()}
              placeholder="Digite sua pergunta..."
              className="flex-1 px-4 py-2.5 bg-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={enviarMensagem}
              disabled={!mensagem.trim() || processando}
              className="p-2.5 bg-primary-500 text-white rounded-xl disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-neutral-400 mt-1 text-center">
            📎 Envie documentos TXT, CSV ou imagens
          </p>
        </div>
      </div>
    </>
  );
}
