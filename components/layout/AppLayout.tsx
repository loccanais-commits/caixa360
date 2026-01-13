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
  ShoppingBag
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

// Menu reorganizado: Meu Salário antes de Relatório
const menuItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/lancamentos', label: 'Lançamentos', icon: ArrowLeftRight },
  { href: '/fornecedores', label: 'Fornecedores', icon: Package },
  { href: '/produtos', label: 'Produtos/Serviços', icon: ShoppingBag },
  { href: '/contas', label: 'Contas', icon: Calendar, badge: true },
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
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [userName, setUserName] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [contasPendentes, setContasPendentes] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showLancamentoModal, setShowLancamentoModal] = useState(false);
  const [tipoLancamento, setTipoLancamento] = useState<'entrada' | 'saida'>('entrada');
  const [showAssistente, setShowAssistente] = useState(false);
  const [showNotificacoes, setShowNotificacoes] = useState(false);
  
  // Toast de alertas ao entrar
  const [showAlertaToast, setShowAlertaToast] = useState(false);
  const [alertaContas, setAlertaContas] = useState<{atrasadas: number; vencendoHoje: number; proximosDias: number}>({
    atrasadas: 0,
    vencendoHoje: 0,
    proximosDias: 0
  });
  
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

      // Verificar alertas de contas para toast
      await verificarAlertasContas(empresa.id);
    }
  }

  async function verificarAlertasContas(empId: string) {
    // Verificar se já mostrou o toast nesta sessão
    const jaNotificou = sessionStorage.getItem('caixa360_alerta_contas_mostrado');
    if (jaNotificou) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = hoje.toISOString().split('T')[0];
    
    // Data daqui 5 dias
    const proximosDias = new Date(hoje);
    proximosDias.setDate(proximosDias.getDate() + 5);
    const proximosDiasStr = proximosDias.toISOString().split('T')[0];

    // Contas atrasadas
    const { count: atrasadas } = await supabase
      .from('contas')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empId)
      .eq('status', 'atrasado');

    // Contas vencendo hoje
    const { count: vencendoHoje } = await supabase
      .from('contas')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empId)
      .eq('status', 'pendente')
      .eq('data_vencimento', hojeStr);

    // Contas vencendo nos próximos 5 dias (exceto hoje)
    const { count: proximosDiasCount } = await supabase
      .from('contas')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empId)
      .eq('status', 'pendente')
      .gt('data_vencimento', hojeStr)
      .lte('data_vencimento', proximosDiasStr);

    const alertas = {
      atrasadas: atrasadas || 0,
      vencendoHoje: vencendoHoje || 0,
      proximosDias: proximosDiasCount || 0
    };

    setAlertaContas(alertas);

    // Mostrar toast se tiver alertas
    if (alertas.atrasadas > 0 || alertas.vencendoHoje > 0 || alertas.proximosDias > 0) {
      setShowAlertaToast(true);
      // Marcar que já mostrou nesta sessão
      sessionStorage.setItem('caixa360_alerta_contas_mostrado', 'true');
      // Auto-fechar após 8 segundos
      setTimeout(() => setShowAlertaToast(false), 8000);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="grid-background" />
        <div className="relative z-10 flex flex-col items-center">
          {/* Ampulheta Animada */}
          <svg
            aria-label="Carregando..."
            role="img"
            height="80px"
            width="80px"
            viewBox="0 0 56 56"
            className="loader"
          >
            <clipPath id="sand-mound-top-main">
              <path
                d="M 14.613 13.087 C 15.814 12.059 19.3 8.039 20.3 6.539 C 21.5 4.789 21.5 2.039 21.5 2.039 L 3 2.039 C 3 2.039 3 4.789 4.2 6.539 C 5.2 8.039 8.686 12.059 9.887 13.087 C 11 14.039 12.25 14.039 12.25 14.039 C 12.25 14.039 13.5 14.039 14.613 13.087 Z"
                className="loader__sand-mound-top"
              />
            </clipPath>
            <clipPath id="sand-mound-bottom-main">
              <path
                d="M 14.613 20.452 C 15.814 21.48 19.3 25.5 20.3 27 C 21.5 28.75 21.5 31.5 21.5 31.5 L 3 31.5 C 3 31.5 3 28.75 4.2 27 C 5.2 25.5 8.686 21.48 9.887 20.452 C 11 19.5 12.25 19.5 12.25 19.5 C 12.25 19.5 13.5 19.5 14.613 20.452 Z"
                className="loader__sand-mound-bottom"
              />
            </clipPath>
            <g transform="translate(2,2)">
              <g transform="rotate(-90,26,26)" strokeLinecap="round" strokeDashoffset="153.94" strokeDasharray="153.94 153.94" stroke="hsl(0,0%,100%)" fill="none">
                <circle r="24.5" cy="26" cx="26" strokeWidth="2.5" className="loader__motion-thick" />
                <circle r="24.5" cy="26" cx="26" strokeWidth="1.75" className="loader__motion-medium" />
                <circle r="24.5" cy="26" cx="26" strokeWidth="1" className="loader__motion-thin" />
              </g>
              <g transform="translate(13.75,9.25)" className="loader__model">
                <path d="M 1.5 2 L 23 2 C 23 2 22.5 8.5 19 12 C 16 15.5 13.5 13.5 13.5 16.75 C 13.5 20 16 18 19 21.5 C 22.5 25 23 31.5 23 31.5 L 1.5 31.5 C 1.5 31.5 2 25 5.5 21.5 C 8.5 18 11 20 11 16.75 C 11 13.5 8.5 15.5 5.5 12 C 2 8.5 1.5 2 1.5 2 Z" fill="#e0f2fe" />
                <g strokeLinecap="round" stroke="#fbbf24">
                  <line y2="20.75" x2="12" y1="15.75" x1="12" strokeDasharray="0.25 33.75" strokeWidth="1" className="loader__sand-grain-left" />
                  <line y2="21.75" x2="12.5" y1="16.75" x1="12.5" strokeDasharray="0.25 33.75" strokeWidth="1" className="loader__sand-grain-right" />
                  <line y2="31.5" x2="12.25" y1="18" x1="12.25" strokeDasharray="0.5 107.5" strokeWidth="1" className="loader__sand-drop" />
                  <line y2="31.5" x2="12.25" y1="14.75" x1="12.25" strokeDasharray="54 54" strokeWidth="1.5" className="loader__sand-fill" />
                  <g strokeWidth="0" fill="#fbbf24">
                    <path d="M 12.25 15 L 15.392 13.486 C 21.737 11.168 22.5 2 22.5 2 L 2 2.013 C 2 2.013 2.753 11.046 9.009 13.438 L 12.25 15 Z" clipPath="url(#sand-mound-top-main)" />
                    <path d="M 12.25 18.5 L 15.392 20.014 C 21.737 22.332 22.5 31.5 22.5 31.5 L 2 31.487 C 2 31.487 2.753 22.454 9.009 20.062 Z" clipPath="url(#sand-mound-bottom-main)" />
                  </g>
                </g>
                <rect height="2" width="24.5" fill="#10b981" />
                <rect height="1" width="19.5" y="0.5" x="2.5" ry="0.5" rx="0.5" fill="#34d399" />
                <rect height="2" width="24.5" y="31.5" fill="#10b981" />
                <rect height="1" width="19.5" y="32" x="2.5" ry="0.5" rx="0.5" fill="#34d399" />
              </g>
            </g>
          </svg>
          <p className="mt-4 text-neutral-500 animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex relative">
      {/* Grid Background Pattern */}
      <div className="grid-background" />
      
      {/* Sidebar Desktop - Animated */}
      <aside 
        className={clsx(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-white/95 backdrop-blur-sm border-r border-neutral-100 z-30 transition-all duration-300 ease-in-out",
          sidebarExpanded ? "lg:w-64" : "lg:w-20"
        )}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-neutral-100">
          <img src="/logo.png" alt="Caixa360" className="w-10 h-10 rounded-xl" />
          <span className={clsx(
            "font-bold text-xl gradient-text ml-3 transition-all duration-300 whitespace-nowrap overflow-hidden",
            sidebarExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
          )}>Caixa360</span>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive 
                    ? 'bg-primary-50 text-primary-600 font-medium shadow-sm' 
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                )}
                title={!sidebarExpanded ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className={clsx(
                  "flex-1 transition-all duration-300 whitespace-nowrap overflow-hidden",
                  sidebarExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                )}>{item.label}</span>
                {item.badge && contasPendentes > 0 && sidebarExpanded && (
                  <span className="ml-auto w-5 h-5 bg-saida text-white text-xs font-bold rounded-full flex items-center justify-center" style={{ fontSize: '10px' }}>
                    {contasPendentes > 9 ? '9+' : contasPendentes}
                  </span>
                )}
                {item.badge && contasPendentes > 0 && !sidebarExpanded && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-saida rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-100 space-y-1">
          <Link 
            href="/configuracoes" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-600 hover:bg-neutral-100 transition-all duration-200"
            title={!sidebarExpanded ? "Configurações" : undefined}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span className={clsx(
              "transition-all duration-300 whitespace-nowrap overflow-hidden",
              sidebarExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
            )}>Configurações</span>
          </Link>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-saida hover:text-saida-dark hover:bg-saida-light transition-all duration-200"
            title={!sidebarExpanded ? "Sair" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={clsx(
              "transition-all duration-300 whitespace-nowrap overflow-hidden",
              sidebarExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
            )}>Sair</span>
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
                    className={clsx('sidebar-link', isActive && 'active')}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && contasPendentes > 0 && (
                      <span className="ml-auto w-5 h-5 bg-saida text-white text-xs font-bold rounded-full flex items-center justify-center" style={{ fontSize: '10px' }}>
                        {contasPendentes > 9 ? '9+' : contasPendentes}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={clsx(
        "flex-1 relative z-10 transition-all duration-300",
        sidebarExpanded ? "lg:ml-64" : "lg:ml-20"
      )}>
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
              <div className="flex items-center gap-2 lg:mt-0 mt-16 w-full lg:w-auto justify-center lg:justify-end">
                <button 
                  onClick={() => { setTipoLancamento('entrada'); setShowLancamentoModal(true); }} 
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-medium text-sm bg-entrada-light text-entrada-dark hover:bg-entrada hover:text-white transition-all shadow-sm hover:shadow-md"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>Entrada</span>
                </button>
                <button 
                  onClick={() => { setTipoLancamento('saida'); setShowLancamentoModal(true); }} 
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-medium text-sm bg-saida-light text-saida-dark hover:bg-saida hover:text-white transition-all shadow-sm hover:shadow-md"
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>Saída</span>
                </button>
                <button 
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-medium text-sm bg-secondary-50 text-secondary-700 hover:bg-secondary-500 hover:text-white transition-all shadow-sm hover:shadow-md"
                  onClick={() => setShowAssistente(true)}
                >
                  <Bot className="w-4 h-4" />
                  <span className="hidden sm:inline">Assistente</span>
                </button>
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

      {/* Toast de Alertas de Contas ao Entrar */}
      {showAlertaToast && (alertaContas.atrasadas > 0 || alertaContas.vencendoHoje > 0 || alertaContas.proximosDias > 0) && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-alerta-light rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-alerta-dark" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-neutral-900 mb-1">Atenção às suas contas!</h4>
                <div className="space-y-1 text-sm">
                  {alertaContas.atrasadas > 0 && (
                    <p className="text-saida-dark flex items-center gap-1">
                      <span className="w-2 h-2 bg-saida rounded-full"></span>
                      {alertaContas.atrasadas} conta{alertaContas.atrasadas > 1 ? 's' : ''} atrasada{alertaContas.atrasadas > 1 ? 's' : ''}
                    </p>
                  )}
                  {alertaContas.vencendoHoje > 0 && (
                    <p className="text-alerta-dark flex items-center gap-1">
                      <span className="w-2 h-2 bg-alerta rounded-full"></span>
                      {alertaContas.vencendoHoje} conta{alertaContas.vencendoHoje > 1 ? 's' : ''} vence{alertaContas.vencendoHoje > 1 ? 'm' : ''} hoje
                    </p>
                  )}
                  {alertaContas.proximosDias > 0 && (
                    <p className="text-primary-600 flex items-center gap-1">
                      <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                      {alertaContas.proximosDias} conta{alertaContas.proximosDias > 1 ? 's' : ''} nos próximos 5 dias
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => router.push('/contas')}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Ver contas →
                </button>
              </div>
              <button 
                onClick={() => setShowAlertaToast(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [transacoesMultiplas, setTransacoesMultiplas] = useState<any[]>([]);
  const [isMultiplo, setIsMultiplo] = useState(false);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [produtosVoz, setProdutosVoz] = useState<any[]>([]);
  const [recognitionRef, setRecognitionRef] = useState<any>(null);
  
  // Estados para edição do resultado
  const [editDescricao, setEditDescricao] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editFormaPagamento, setEditFormaPagamento] = useState('');
  const [editTaxaMaquina, setEditTaxaMaquina] = useState('');
  const [editParcelas, setEditParcelas] = useState('1');
  
  // Taxas padrão das configurações
  const [taxasPadrao, setTaxasPadrao] = useState<any>({});
  
  // Modal de pergunta (quantidade sem nomes)
  const [showPergunta, setShowPergunta] = useState(false);
  const [perguntaDados, setPerguntaDados] = useState<any>(null);
  
  const supabase = createClient();

  // Carregar fornecedores, produtos e taxas padrão
  useEffect(() => {
    if (empresaId) {
      supabase
        .from('fornecedores')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .then(({ data }) => setFornecedores(data || []));
      
      supabase
        .from('produtos')
        .select('id, nome, tipo, preco')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .then(({ data }) => setProdutosVoz(data || []));
      
      // Carregar taxas padrão das configurações
      supabase
        .from('configuracoes')
        .select('taxa_pix, taxa_cartao, taxa_boleto, taxa_ticket')
        .eq('empresa_id', empresaId)
        .single()
        .then(({ data }) => {
          if (data) setTaxasPadrao(data);
        });
    }
  }, [empresaId]);

  // Quando resultado mudar, popular campos de edição
  useEffect(() => {
    if (resultado) {
      setEditDescricao(resultado.descricao || '');
      setEditValor(String(resultado.valor || ''));
      setEditFormaPagamento(resultado.forma_pagamento || '');
      setEditTaxaMaquina('');
      setEditParcelas('1');
    }
  }, [resultado]);

  // Calcular taxa automática quando mudar forma de pagamento
  useEffect(() => {
    if (editFormaPagamento && editValor && resultado?.tipo === 'entrada') {
      const valor = parseFloat(editValor.replace(',', '.')) || 0;
      let taxa = 0;
      
      if (editFormaPagamento === 'pix' && taxasPadrao.taxa_pix) {
        taxa = taxasPadrao.taxa_pix; // Valor fixo
      } else if (editFormaPagamento === 'cartao' && taxasPadrao.taxa_cartao) {
        taxa = (valor * taxasPadrao.taxa_cartao) / 100; // Percentual
      } else if (editFormaPagamento === 'boleto' && taxasPadrao.taxa_boleto) {
        taxa = taxasPadrao.taxa_boleto; // Valor fixo
      } else if (editFormaPagamento === 'ticket' && taxasPadrao.taxa_ticket) {
        taxa = (valor * taxasPadrao.taxa_ticket) / 100; // Percentual
      }
      
      if (taxa > 0) {
        setEditTaxaMaquina(taxa.toFixed(2).replace('.', ','));
      }
    }
  }, [editFormaPagamento, editValor, taxasPadrao, resultado?.tipo]);

  const cancelRecording = () => {
    if (recognitionRef) {
      recognitionRef.abort();
      setRecognitionRef(null);
    }
    setIsRecording(false);
    setTranscript('');
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    setRecognitionRef(recognition);
    
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
      if (event.error !== 'aborted') {
        alert('Erro ao capturar áudio. Tente novamente.');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      setRecognitionRef(null);
    };

    recognition.start();
  };

  const processarComIA = async (texto: string) => {
    try {
      const response = await fetch('/api/voice-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, fornecedores, produtos: produtosVoz }),
      });

      const data = await response.json();
      
      if (data.error) {
        alert('Erro ao processar: ' + data.error);
        setIsProcessing(false);
        return;
      }

      // Verificar se deve perguntar sobre separação (quantidade > 1 sem nomes)
      if (data.perguntarSeparacao || (!data.multiplos && data.quantidade && data.quantidade > 1 && !data.fornecedor_nome)) {
        setPerguntaDados(data);
        setShowPergunta(true);
        setIsProcessing(false);
        return;
      }

      // Verificar se são múltiplas transações
      if (data.multiplos && data.transacoes && data.transacoes.length > 0) {
        setIsMultiplo(true);
        setTransacoesMultiplas(data.transacoes);
        setResultado(null);
      } else {
        // Transação única
        setIsMultiplo(false);
        setTransacoesMultiplas([]);
        setResultado(data);
      }
      
      setShowModal(true);
      setIsProcessing(false);
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao processar o áudio');
      setIsProcessing(false);
    }
  };

  // Responder à pergunta de separar por cliente ou não
  const responderPergunta = (separarPorCliente: boolean) => {
    if (!perguntaDados) return;
    
    if (separarPorCliente) {
      // Criar múltiplas transações vazias para o usuário preencher
      const qtd = perguntaDados.quantidade || 2;
      const valorUnitario = (perguntaDados.valor || 0) / qtd;
      const transacoes = [];
      for (let i = 0; i < qtd; i++) {
        transacoes.push({
          tipo: perguntaDados.tipo,
          valor: valorUnitario,
          descricao: `${perguntaDados.produto_nome || perguntaDados.descricao} - Cliente ${i + 1}`,
          categoria: perguntaDados.categoria,
          data: perguntaDados.data,
          produto_nome: perguntaDados.produto_nome,
          produto_id: perguntaDados.produto_id,
          fornecedor_nome: '',
        });
      }
      setIsMultiplo(true);
      setTransacoesMultiplas(transacoes);
      setResultado(null);
    } else {
      // Manter como transação única
      setIsMultiplo(false);
      setTransacoesMultiplas([]);
      setResultado(perguntaDados);
    }
    
    setShowPergunta(false);
    setPerguntaDados(null);
    setShowModal(true);
  };

  const confirmarLancamento = async () => {
    if (!resultado || !empresaId) return;

    const hoje = new Date().toISOString().split('T')[0];
    const dataLancamento = resultado.data || hoje;
    const ehFuturo = dataLancamento > hoje;
    
    // Usar valores editados
    const valorFinal = parseFloat(editValor.replace(',', '.')) || resultado.valor;
    const descricaoFinal = editDescricao || resultado.descricao;
    
    // Calcular taxa - aceita percentual (ex: "3%") ou valor fixo (ex: "2,50")
    let taxaNum = 0;
    if (editTaxaMaquina) {
      if (editTaxaMaquina.includes('%')) {
        // Percentual
        const percent = parseFloat(editTaxaMaquina.replace('%', '').replace(',', '.')) || 0;
        taxaNum = (valorFinal * percent) / 100;
      } else {
        // Valor fixo
        taxaNum = parseFloat(editTaxaMaquina.replace(',', '.')) || 0;
      }
    }
    
    const numParcelas = parseInt(editParcelas) || 1;

    // Se tem parcelas > 1, criar contas a pagar/receber (independente da data)
    if (numParcelas > 1) {
      const valorParcela = valorFinal / numParcelas;
      const tipoTrans = resultado.tipo;
      
      for (let i = 0; i < numParcelas; i++) {
        const dataVenc = new Date(dataLancamento);
        dataVenc.setMonth(dataVenc.getMonth() + i);
        
        await supabase.from('contas').insert({
          empresa_id: empresaId,
          tipo: tipoTrans,
          descricao: `${descricaoFinal} (${i + 1}/${numParcelas})`,
          valor: valorParcela,
          categoria: resultado.categoria,
          data_vencimento: dataVenc.toISOString().split('T')[0],
          status: i === 0 && !ehFuturo ? 'pago' : 'pendente', // Primeira parcela paga se for hoje
          fornecedor_id: resultado.fornecedor_id || null,
          forma_pagamento: editFormaPagamento || null,
        });
        
        // Se a primeira parcela já foi paga (data não futura), criar lançamento
        if (i === 0 && !ehFuturo) {
          await supabase.from('lancamentos').insert({
            empresa_id: empresaId,
            tipo: tipoTrans,
            descricao: `${descricaoFinal} (1/${numParcelas})`,
            valor: valorParcela,
            categoria: resultado.categoria,
            data: dataLancamento,
            fornecedor_id: resultado.fornecedor_id || null,
            produto_id: resultado.produto_id || null,
            forma_pagamento: editFormaPagamento || null,
          });
        }
      }
      
      // Se teve taxa da máquina em entrada parcelada
      if (resultado.tipo === 'entrada' && taxaNum > 0) {
        await supabase.from('lancamentos').insert({
          empresa_id: empresaId,
          tipo: 'saida',
          descricao: `Taxa máquina - ${descricaoFinal}`,
          valor: taxaNum,
          categoria: 'outros_despesas',
          data: dataLancamento,
        });
      }
    } else if (ehFuturo) {
      // Sem parcelas, data futura -> criar conta
      await supabase.from('contas').insert({
        empresa_id: empresaId,
        tipo: resultado.tipo,
        descricao: descricaoFinal,
        valor: valorFinal,
        categoria: resultado.categoria,
        data_vencimento: dataLancamento,
        status: 'pendente',
        fornecedor_id: resultado.fornecedor_id || null,
        forma_pagamento: editFormaPagamento || null,
      });
    } else {
      // Sem parcelas, data atual ou passada -> criar lançamento
      await supabase.from('lancamentos').insert({
        empresa_id: empresaId,
        tipo: resultado.tipo,
        descricao: descricaoFinal,
        valor: valorFinal,
        categoria: resultado.categoria,
        data: dataLancamento,
        fornecedor_id: resultado.fornecedor_id || null,
        produto_id: resultado.produto_id || null,
        forma_pagamento: editFormaPagamento || null,
      });
      
      // Se teve taxa da máquina, registrar como saída
      if (taxaNum > 0) {
        await supabase.from('lancamentos').insert({
          empresa_id: empresaId,
          tipo: 'saida',
          descricao: `Taxa máquina - ${descricaoFinal}`,
          valor: taxaNum,
          categoria: 'outros_despesas',
          data: dataLancamento,
        });
      }
      
      // Se tem produto físico, dar baixa no estoque
      if (resultado.produto_id && resultado.tipo === 'entrada') {
        const prod = produtosVoz.find(p => p.id === resultado.produto_id);
        if (prod && prod.tipo === 'produto') {
          await supabase
            .from('produtos')
            .update({ estoque: Math.max(0, (prod.estoque || 0) - 1) })
            .eq('id', resultado.produto_id);
        }
      }
    }

    setShowModal(false);
    setResultado(null);
    setTranscript('');
    onSuccess();
  };

  // Confirmar múltiplas transações de uma vez
  const confirmarMultiplas = async () => {
    if (!transacoesMultiplas.length || !empresaId) return;

    const hoje = new Date().toISOString().split('T')[0];

    for (const trans of transacoesMultiplas) {
      const dataLancamento = trans.data || hoje;
      const ehFuturo = dataLancamento > hoje;

      if (ehFuturo) {
        await supabase.from('contas').insert({
          empresa_id: empresaId,
          tipo: trans.tipo,
          descricao: trans.descricao,
          valor: trans.valor,
          categoria: trans.categoria,
          data_vencimento: dataLancamento,
          status: 'pendente',
          fornecedor_id: trans.fornecedor_id || null,
        });
      } else {
        await supabase.from('lancamentos').insert({
          empresa_id: empresaId,
          tipo: trans.tipo,
          descricao: trans.descricao,
          valor: trans.valor,
          categoria: trans.categoria,
          data: dataLancamento,
          fornecedor_id: trans.fornecedor_id || null,
          produto_id: trans.produto_id || null,
        });
        
        // Se tem produto físico, dar baixa no estoque
        if (trans.produto_id && trans.tipo === 'entrada') {
          const prod = produtosVoz.find(p => p.id === trans.produto_id);
          if (prod && prod.tipo === 'produto') {
            await supabase
              .from('produtos')
              .update({ estoque: Math.max(0, (prod.estoque || 0) - 1) })
              .eq('id', trans.produto_id);
          }
        }
      }
    }

    setShowModal(false);
    setTransacoesMultiplas([]);
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

  // Calcular total das múltiplas transações
  const totalMultiplas = transacoesMultiplas.reduce((acc, t) => acc + (t.valor || 0), 0);

  return (
    <>
      {/* Botão de gravação */}
      {isRecording ? (
        <button 
          onClick={cancelRecording}
          className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-40 bg-saida animate-pulse"
          title="Cancelar gravação"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      ) : (
        <button 
          onClick={startRecording}
          disabled={isProcessing}
          className={clsx(
            "fixed bottom-20 lg:bottom-6 right-4 lg:right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-40",
            isProcessing 
              ? "bg-alerta"
              : "bg-gradient-to-r from-primary-500 to-secondary-500"
          )}
          title="Lançar por voz"
        >
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>
      )}

      {/* Modal de confirmação - Transação ÚNICA - EDITÁVEL */}
      {showModal && !isMultiplo && resultado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-5 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg mb-3">
              {resultado.tipo === 'entrada' ? '↑ Confirmar Entrada' : '↓ Confirmar Saída'}
            </h3>
            
            <div className="p-2 bg-neutral-50 rounded-lg mb-4 text-xs text-neutral-500">
              🎤 "{transcript}"
            </div>

            <div className="space-y-3">
              {/* Tipo - botões para trocar */}
              <div className="flex gap-2">
                <button
                  onClick={() => setResultado({...resultado, tipo: 'entrada'})}
                  className={clsx(
                    "flex-1 py-2 rounded-lg font-medium text-sm transition-all",
                    resultado.tipo === 'entrada' 
                      ? 'bg-entrada text-white' 
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  )}
                >
                  ↑ Entrada
                </button>
                <button
                  onClick={() => setResultado({...resultado, tipo: 'saida'})}
                  className={clsx(
                    "flex-1 py-2 rounded-lg font-medium text-sm transition-all",
                    resultado.tipo === 'saida' 
                      ? 'bg-saida text-white' 
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  )}
                >
                  ↓ Saída
                </button>
              </div>

              {/* Descrição - editável */}
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Descrição</label>
                <input
                  type="text"
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Valor - editável */}
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Valor (R$)</label>
                <input
                  type="text"
                  value={editValor}
                  onChange={(e) => setEditValor(e.target.value)}
                  className={clsx(
                    "w-full px-3 py-2 border border-neutral-200 rounded-lg text-lg font-bold focus:ring-2 focus:ring-primary-500",
                    resultado.tipo === 'entrada' ? 'text-entrada-dark' : 'text-saida-dark'
                  )}
                />
              </div>

              {/* Categoria e Cliente */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Categoria</label>
                  <span className="text-sm font-medium">{resultado.categoria}</span>
                </div>
                {resultado.fornecedor_nome && (
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Cliente</label>
                    <span className="text-sm font-medium">{resultado.fornecedor_nome}</span>
                  </div>
                )}
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block">Forma de Pagamento</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { value: '', label: '-', icone: '❌' },
                    { value: 'pix', label: 'PIX', icone: '📱' },
                    { value: 'debito', label: 'Débito', icone: '💳' },
                    { value: 'credito', label: 'Crédito', icone: '💳' },
                    { value: 'dinheiro', label: 'Dinheiro', icone: '💵' },
                    { value: 'boleto', label: 'Boleto', icone: '📄' },
                    { value: 'ticket', label: 'Ticket', icone: '🎟️' },
                    { value: 'transferencia', label: 'TED/DOC', icone: '🏦' },
                  ].map(fp => (
                    <button
                      key={fp.value}
                      type="button"
                      onClick={() => setEditFormaPagamento(fp.value)}
                      className={clsx(
                        "p-1.5 rounded-lg text-xs font-medium border transition-all",
                        editFormaPagamento === fp.value 
                          ? 'bg-primary-100 border-primary-500 text-primary-700' 
                          : 'bg-neutral-50 border-neutral-200 hover:border-primary-300'
                      )}
                    >
                      <span className="text-sm">{fp.icone}</span>
                      <span className="block text-[10px]">{fp.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Taxa da Máquina (para entradas com cartão/pix/etc - não dinheiro) */}
              {resultado.tipo === 'entrada' && editFormaPagamento && !['dinheiro', ''].includes(editFormaPagamento) && (
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Taxa ({editFormaPagamento === 'pix' ? 'R$ ou %' : 'R$ ou %'})</label>
                  <input
                    type="text"
                    value={editTaxaMaquina}
                    onChange={(e) => setEditTaxaMaquina(e.target.value)}
                    placeholder="0,00 ou 3%"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-neutral-400 mt-1">
                    {editTaxaMaquina && editTaxaMaquina.includes('%') 
                      ? `Taxa: R$ ${((parseFloat(editValor.replace(',', '.') || '0') * parseFloat(editTaxaMaquina.replace('%', '').replace(',', '.') || '0')) / 100).toFixed(2)}`
                      : editTaxaMaquina && parseFloat(editTaxaMaquina.replace(',', '.')) > 0 
                        ? `Líquido: R$ ${(parseFloat(editValor.replace(',', '.') || '0') - parseFloat(editTaxaMaquina.replace(',', '.') || '0')).toFixed(2)}`
                        : taxasPadrao[`taxa_${editFormaPagamento}`] 
                          ? `Taxa padrão: ${taxasPadrao[`taxa_${editFormaPagamento}`]}${taxasPadrao[`taxa_${editFormaPagamento}`]?.toString().includes('%') ? '' : '%'}`
                          : 'Digite valor (ex: 2,50) ou percentual (ex: 3%)'
                    }
                  </p>
                </div>
              )}

              {/* Parcelas (para crédito, pix ou boleto) */}
              {editFormaPagamento && ['credito', 'pix', 'boleto'].includes(editFormaPagamento) && (
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Parcelas</label>
                  <select
                    value={editParcelas}
                    onChange={(e) => setEditParcelas(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12,18,24,36,48].map(n => (
                      <option key={n} value={n}>{n}x {n > 1 ? `de R$ ${(parseFloat(editValor.replace(',', '.') || '0') / n).toFixed(2)}` : '(à vista)'}</option>
                    ))}
                  </select>
                  {parseInt(editParcelas) > 1 && (
                    <p className="text-xs text-neutral-500 mt-1">
                      📅 Serão criadas {editParcelas} {resultado.tipo === 'entrada' ? 'contas a receber' : 'contas a pagar'}
                    </p>
                  )}
                </div>
              )}

              {/* Data */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500">Data:</span>
                <span className="font-medium">{formatarDataExibicao(resultado.data)}</span>
              </div>
            </div>

            {/* Aviso de data futura */}
            {ehFuturo && (
              <div className="mt-3 p-2 bg-alerta-light rounded-lg text-xs text-alerta-dark flex items-center gap-2">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>Data futura: será salvo como <strong>{resultado.tipo === 'entrada' ? 'A Receber' : 'Conta a Pagar'}</strong>
                {parseInt(editParcelas) > 1 && ` em ${editParcelas}x`}
                </span>
              </div>
            )}

            {/* Aviso de parcelamento */}
            {parseInt(editParcelas) > 1 && !ehFuturo && (
              <div className="mt-3 p-2 bg-primary-50 rounded-lg text-xs text-primary-700 flex items-center gap-2">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>Parcelado em <strong>{editParcelas}x</strong>: 1ª parcela registrada hoje, demais como {resultado.tipo === 'entrada' ? 'A Receber' : 'Contas a Pagar'}</span>
              </div>
            )}

            <div className="flex gap-2 mt-4">
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

      {/* Modal de confirmação - MÚLTIPLAS transações */}
      {showModal && isMultiplo && transacoesMultiplas.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg mb-2">Confirmar {transacoesMultiplas.length} lançamentos</h3>
            <p className="text-sm text-neutral-500 mb-4">Identificamos múltiplas transações na sua fala</p>
            
            <div className="p-3 bg-neutral-50 rounded-xl mb-4 text-sm text-neutral-600">
              "{transcript}"
            </div>

            {/* Lista de transações - EDITÁVEL */}
            <div className="space-y-3 mb-4 max-h-[50vh] overflow-y-auto">
              {transacoesMultiplas.map((trans, idx) => (
                <div 
                  key={idx} 
                  className={clsx(
                    "p-3 rounded-xl border-2",
                    trans.tipo === 'entrada' 
                      ? 'border-entrada-light bg-entrada-light/30' 
                      : 'border-saida-light bg-saida-light/30'
                  )}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={clsx(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      trans.tipo === 'entrada' ? 'bg-entrada text-white' : 'bg-saida text-white'
                    )}>
                      {trans.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'} #{idx + 1}
                    </span>
                    <button
                      onClick={() => {
                        const newList = transacoesMultiplas.filter((_, i) => i !== idx);
                        setTransacoesMultiplas(newList);
                      }}
                      className="text-neutral-400 hover:text-saida text-xs"
                    >
                      ✕ Remover
                    </button>
                  </div>
                  
                  {/* Descrição editável */}
                  <input
                    type="text"
                    value={trans.descricao}
                    onChange={(e) => {
                      const newList = [...transacoesMultiplas];
                      newList[idx] = { ...newList[idx], descricao: e.target.value };
                      setTransacoesMultiplas(newList);
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded-lg mb-2"
                    placeholder="Descrição"
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    {/* Cliente editável */}
                    <input
                      type="text"
                      value={trans.fornecedor_nome || ''}
                      onChange={(e) => {
                        const newList = [...transacoesMultiplas];
                        newList[idx] = { ...newList[idx], fornecedor_nome: e.target.value };
                        setTransacoesMultiplas(newList);
                      }}
                      className="px-2 py-1.5 text-sm border border-neutral-200 rounded-lg"
                      placeholder="👤 Cliente"
                    />
                    
                    {/* Valor editável */}
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-neutral-500">R$</span>
                      <input
                        type="text"
                        value={trans.valor?.toFixed(2) || ''}
                        onChange={(e) => {
                          const newList = [...transacoesMultiplas];
                          newList[idx] = { ...newList[idx], valor: parseFloat(e.target.value.replace(',', '.')) || 0 };
                          setTransacoesMultiplas(newList);
                        }}
                        className={clsx(
                          "w-full pl-8 pr-2 py-1.5 text-sm border border-neutral-200 rounded-lg font-bold",
                          trans.tipo === 'entrada' ? 'text-entrada-dark' : 'text-saida-dark'
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Forma de pagamento */}
                  <div className="mt-2">
                    <div className="flex gap-1 flex-wrap">
                      {[
                        { value: '', label: '-', icone: '❌' },
                        { value: 'pix', label: 'PIX', icone: '📱' },
                        { value: 'debito', label: 'Déb', icone: '💳' },
                        { value: 'credito', label: 'Créd', icone: '💳' },
                        { value: 'dinheiro', label: 'R$', icone: '💵' },
                      ].map(fp => (
                        <button
                          key={fp.value}
                          type="button"
                          onClick={() => {
                            const newList = [...transacoesMultiplas];
                            newList[idx] = { ...newList[idx], forma_pagamento: fp.value };
                            setTransacoesMultiplas(newList);
                          }}
                          className={clsx(
                            "px-2 py-1 rounded text-xs border transition-all",
                            trans.forma_pagamento === fp.value 
                              ? 'bg-primary-100 border-primary-500 text-primary-700' 
                              : 'bg-neutral-50 border-neutral-200 hover:border-primary-300'
                          )}
                        >
                          {fp.icone}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl mb-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-neutral-700">Total:</span>
                <span className="font-bold text-xl text-primary-700">
                  R$ {totalMultiplas.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => { setShowModal(false); setTransacoesMultiplas([]); }}
                className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarMultiplas}
                className="flex-1 py-2.5 rounded-xl text-white font-medium bg-gradient-to-r from-primary-500 to-secondary-500"
              >
                Confirmar Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de pergunta - Quantidade sem nomes */}
      {showPergunta && perguntaDados && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowPergunta(false); setPerguntaDados(null); }} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-5 animate-slide-up">
            <h3 className="font-semibold text-lg mb-3">🎤 Como registrar?</h3>
            
            <div className="p-3 bg-neutral-50 rounded-lg mb-4 text-sm text-neutral-600">
              "{transcript}"
            </div>

            <div className="p-4 bg-entrada-light rounded-xl mb-4">
              <p className="text-entrada-dark font-medium">
                {perguntaDados.quantidade || 2}x {perguntaDados.produto_nome || perguntaDados.descricao}
              </p>
              <p className="text-entrada-dark text-lg font-bold mt-1">
                Total: R$ {perguntaDados.valor?.toFixed(2)}
              </p>
            </div>

            <p className="text-sm text-neutral-600 mb-4">
              Deseja registrar como uma única entrada ou separar por cliente/nome?
            </p>

            <div className="space-y-2">
              <button 
                onClick={() => responderPergunta(false)}
                className="w-full py-3 bg-entrada text-white rounded-xl font-medium hover:bg-entrada-dark transition-colors"
              >
                ✅ Uma entrada só (R$ {perguntaDados.valor?.toFixed(2)})
              </button>
              <button 
                onClick={() => responderPergunta(true)}
                className="w-full py-3 bg-secondary-500 text-white rounded-xl font-medium hover:bg-secondary-600 transition-colors"
              >
                👥 Separar por cliente ({perguntaDados.quantidade}x R$ {((perguntaDados.valor || 0) / (perguntaDados.quantidade || 1)).toFixed(2)})
              </button>
              <button 
                onClick={() => { setShowPergunta(false); setPerguntaDados(null); }}
                className="w-full py-2.5 border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-50"
              >
                Cancelar
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
  const [produtos, setProdutos] = useState<any[]>([]);
  const [produtoId, setProdutoId] = useState('');
  const [showNovoFornecedor, setShowNovoFornecedor] = useState(false);
  const [novoFornecedorNome, setNovoFornecedorNome] = useState('');
  const [observacao, setObservacao] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<string>('');
  const [taxaMaquina, setTaxaMaquina] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [taxasPadrao, setTaxasPadrao] = useState<any>({});
  const [salvando, setSalvando] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setTipo(tipoInicial);
    setCategoria(tipoInicial === 'entrada' ? 'vendas' : 'outros_despesas');
  }, [tipoInicial]);

  // Carregar dados só quando modal abrir (lazy loading)
  useEffect(() => {
    if (isOpen && empresaId && !carregado) {
      carregarDados();
    }
  }, [isOpen, empresaId]);

  // Calcular taxa automática quando mudar forma de pagamento
  useEffect(() => {
    if (formaPagamento && valor && tipo === 'entrada' && formaPagamento !== 'dinheiro') {
      const valorNum = parseFloat(valor.replace(',', '.')) || 0;
      let taxa = 0;
      
      if (formaPagamento === 'pix' && taxasPadrao.taxa_pix) {
        taxa = taxasPadrao.taxa_pix;
      } else if (formaPagamento === 'cartao' && taxasPadrao.taxa_cartao) {
        taxa = (valorNum * taxasPadrao.taxa_cartao) / 100;
      } else if (formaPagamento === 'boleto' && taxasPadrao.taxa_boleto) {
        taxa = taxasPadrao.taxa_boleto;
      } else if (formaPagamento === 'ticket' && taxasPadrao.taxa_ticket) {
        taxa = (valorNum * taxasPadrao.taxa_ticket) / 100;
      }
      
      if (taxa > 0) {
        setTaxaMaquina(taxa.toFixed(2).replace('.', ','));
      }
    }
  }, [formaPagamento, valor, taxasPadrao, tipo]);

  async function carregarDados() {
    // Carregar fornecedores, produtos e taxas em paralelo
    const [fornecedoresRes, produtosRes, configRes] = await Promise.all([
      supabase.from('fornecedores').select('id, nome').eq('empresa_id', empresaId).order('nome'),
      supabase.from('produtos').select('id, nome, tipo, preco, estoque').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
      supabase.from('configuracoes').select('taxa_pix, taxa_cartao, taxa_boleto, taxa_ticket').eq('empresa_id', empresaId).single()
    ]);
    
    setFornecedores(fornecedoresRes.data || []);
    setProdutos(produtosRes.data || []);
    if (configRes.data) setTaxasPadrao(configRes.data);
    setCarregado(true);
  }

  // Quando selecionar produto, preencher dados
  function selecionarProduto(id: string) {
    setProdutoId(id);
    const prod = produtos.find(p => p.id === id);
    if (prod) {
      setDescricao(prod.nome);
      setValor(String(prod.preco));
      setCategoria(prod.tipo === 'servico' ? 'servicos' : 'vendas');
    }
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
    
    // Calcular taxa - aceita percentual (ex: "3%") ou valor fixo (ex: "2,50")
    let taxaNum = 0;
    if (taxaMaquina) {
      if (taxaMaquina.includes('%')) {
        const percent = parseFloat(taxaMaquina.replace('%', '').replace(',', '.')) || 0;
        taxaNum = (valorNum * percent) / 100;
      } else {
        taxaNum = parseFloat(taxaMaquina.replace(',', '.')) || 0;
      }
    }
    
    const numParcelas = parseInt(parcelas) || 1;

    // Se tem parcelas > 1, criar contas a pagar/receber (independente da data)
    if (numParcelas > 1) {
      const valorParcela = valorNum / numParcelas;
      
      for (let i = 0; i < numParcelas; i++) {
        const dataVenc = new Date(dataEscolhida);
        dataVenc.setMonth(dataVenc.getMonth() + i);
        
        await supabase.from('contas').insert({
          empresa_id: empresaId,
          tipo,
          descricao: `${descricao} (${i + 1}/${numParcelas})`,
          valor: valorParcela,
          categoria,
          data_vencimento: dataVenc.toISOString().split('T')[0],
          status: i === 0 && !ehFuturo ? 'pago' : 'pendente',
          fornecedor_id: fornecedorId || null,
          forma_pagamento: formaPagamento || null,
          observacao: observacao || null,
        });
        
        // Se a primeira parcela já foi paga (data não futura), criar lançamento
        if (i === 0 && !ehFuturo) {
          await supabase.from('lancamentos').insert({
            empresa_id: empresaId,
            tipo,
            descricao: `${descricao} (1/${numParcelas})`,
            valor: valorParcela,
            categoria,
            data: dataEscolhida,
            fornecedor_id: fornecedorId || null,
            produto_id: tipo === 'entrada' ? (produtoId || null) : null,
            forma_pagamento: formaPagamento || null,
            observacao: observacao || null,
          });
        }
      }
      
      // Se entrada parcelada com taxa da máquina
      if (tipo === 'entrada' && taxaNum > 0) {
        await supabase.from('lancamentos').insert({
          empresa_id: empresaId,
          tipo: 'saida',
          descricao: `Taxa máquina - ${descricao}`,
          valor: taxaNum,
          categoria: 'outros_despesas',
          data: dataEscolhida,
        });
      }
    } else if (ehFuturo) {
      // Sem parcelas, data futura -> criar conta
      await supabase.from('contas').insert({
        empresa_id: empresaId,
        tipo,
        descricao,
        valor: valorNum,
        categoria,
        data_vencimento: dataEscolhida,
        status: 'pendente',
        fornecedor_id: fornecedorId || null,
        forma_pagamento: formaPagamento || null,
        observacao: observacao || null,
      });
    } else {
      // Sem parcelas, data atual ou passada -> criar lançamento
      await supabase.from('lancamentos').insert({
        empresa_id: empresaId,
        tipo,
        descricao,
        valor: valorNum,
        categoria,
        data: dataEscolhida,
        fornecedor_id: fornecedorId || null,
        produto_id: tipo === 'entrada' ? (produtoId || null) : null,
        forma_pagamento: formaPagamento || null,
        observacao: observacao || null,
      });

      // Se é entrada e tem taxa da máquina, registrar como saída
      if (tipo === 'entrada' && taxaNum > 0) {
        await supabase.from('lancamentos').insert({
          empresa_id: empresaId,
          tipo: 'saida',
          descricao: `Taxa máquina - ${descricao}`,
          valor: taxaNum,
          categoria: 'outros_despesas',
          data: dataEscolhida,
        });
      }

      // Se é entrada e tem produto físico, dar baixa no estoque
      if (tipo === 'entrada' && produtoId) {
        const prod = produtos.find(p => p.id === produtoId);
        if (prod && prod.tipo === 'produto' && prod.estoque !== null) {
          await supabase
            .from('produtos')
            .update({ estoque: Math.max(0, prod.estoque - 1) })
            .eq('id', produtoId);
        }
      }
    }
    
    setSalvando(false);
    setDescricao('');
    setValor('');
    setFornecedorId('');
    setProdutoId('');
    setObservacao('');
    setFormaPagamento('');
    setTaxaMaquina('');
    setParcelas('1');
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
              onClick={() => { setTipo('entrada'); setCategoria('vendas'); setProdutoId(''); }}
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
              onClick={() => { setTipo('saida'); setCategoria('outros_despesas'); setProdutoId(''); }}
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

          {/* Produto/Serviço (apenas para entradas) */}
          {tipo === 'entrada' && produtos.length > 0 && (
            <Select
              label="Produto/Serviço (opcional)"
              value={produtoId}
              onChange={(e) => selecionarProduto(e.target.value)}
              options={[
                { value: '', label: '-- Selecionar --' },
                ...produtos.map(p => ({ 
                  value: p.id, 
                  label: `${p.tipo === 'servico' ? '✂️' : '📦'} ${p.nome} - R$ ${p.preco.toFixed(2)}${p.tipo === 'produto' && p.estoque !== null ? ` (${p.estoque} un.)` : ''}` 
                }))
              ]}
            />
          )}

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

          {/* Cliente (para entradas) */}
          {tipo === 'entrada' && (
            <div>
              {!showNovoFornecedor ? (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      label="Cliente (opcional)"
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
                    title="Adicionar cliente"
                  >
                    <UserPlus className="w-5 h-5 text-neutral-600" />
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-neutral-50 rounded-xl space-y-2">
                  <p className="text-sm font-medium text-neutral-700">Novo cliente</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome do cliente"
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

          {/* Forma de Pagamento (para AMBOS) */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Forma de Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: '', label: '-', icone: '❌' },
                { value: 'pix', label: 'PIX', icone: '📱' },
                { value: 'cartao', label: 'Cartão', icone: '💳' },
                { value: 'dinheiro', label: 'Dinheiro', icone: '💵' },
                { value: 'boleto', label: 'Boleto', icone: '📄' },
                { value: 'ticket', label: 'Ticket', icone: '🎟️' },
              ].map(fp => (
                <button
                  key={fp.value}
                  type="button"
                  onClick={() => setFormaPagamento(fp.value)}
                  className={`p-2 rounded-lg text-xs font-medium border transition-all ${
                    formaPagamento === fp.value 
                      ? 'bg-primary-100 border-primary-500 text-primary-700' 
                      : 'bg-neutral-50 border-neutral-200 hover:border-primary-300'
                  }`}
                >
                  <span className="text-base">{fp.icone}</span>
                  <span className="block mt-0.5">{fp.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Taxa da Máquina (apenas para entradas com cartão/pix) */}
          {tipo === 'entrada' && formaPagamento && formaPagamento !== 'dinheiro' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Taxa da Máquina</label>
              <Input
                placeholder="0,00 ou 3%"
                value={taxaMaquina}
                onChange={(e) => setTaxaMaquina(e.target.value)}
              />
              <p className="text-xs text-neutral-500 mt-1">
                {taxaMaquina && taxaMaquina.includes('%') 
                  ? `Taxa: R$ ${((parseFloat(valor.replace(',', '.') || '0') * parseFloat(taxaMaquina.replace('%', '').replace(',', '.') || '0')) / 100).toFixed(2)}`
                  : taxaMaquina && parseFloat(taxaMaquina.replace(',', '.')) > 0 
                    ? `💰 Líquido: R$ ${(parseFloat(valor.replace(',', '.') || '0') - parseFloat(taxaMaquina.replace(',', '.') || '0')).toFixed(2)}`
                    : taxasPadrao[`taxa_${formaPagamento}`] 
                      ? `Taxa padrão: ${['pix', 'boleto'].includes(formaPagamento) ? 'R$ ' + taxasPadrao[`taxa_${formaPagamento}`] : taxasPadrao[`taxa_${formaPagamento}`] + '%'}`
                      : 'Digite valor (ex: 2,50) ou percentual (ex: 3%)'
                }
              </p>
            </div>
          )}

          {/* Parcelas (para cartão, pix ou boleto) */}
          {formaPagamento && ['cartao', 'pix', 'boleto'].includes(formaPagamento) && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Parcelas</label>
              <select
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12,18,24,36,48].map(n => (
                  <option key={n} value={n}>
                    {n}x {n > 1 ? `de R$ ${(parseFloat(valor.replace(',', '.') || '0') / n).toFixed(2)}` : '(à vista)'}
                  </option>
                ))}
              </select>
              {parseInt(parcelas) > 1 && (
                <p className="text-xs text-neutral-500 mt-1">
                  📅 Serão criadas {parcelas} {tipo === 'entrada' ? 'contas a receber' : 'contas a pagar'}
                </p>
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
          {ehFuturo && parseInt(parcelas) === 1 && (
            <div className="p-3 bg-alerta-light rounded-xl text-sm text-alerta-dark flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Data futura: será salvo como <strong>{tipo === 'entrada' ? 'A Receber' : 'Conta a Pagar'}</strong></span>
            </div>
          )}

          {/* Aviso de parcelamento */}
          {parseInt(parcelas) > 1 && (
            <div className="p-3 bg-primary-50 rounded-xl text-sm text-primary-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                Parcelado em <strong>{parcelas}x</strong>: 
                {ehFuturo 
                  ? ` todas como ${tipo === 'entrada' ? 'A Receber' : 'Contas a Pagar'}`
                  : ` 1ª parcela registrada hoje, demais como ${tipo === 'entrada' ? 'A Receber' : 'Contas a Pagar'}`
                }
              </span>
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
