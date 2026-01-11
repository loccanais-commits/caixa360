'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado como PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('SW registrado:', reg.scope))
        .catch((err) => console.log('SW erro:', err));
    }

    // Capturar evento de instalação (Android/Desktop)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Mostrar banner após 3 segundos se não estiver instalado
      if (!standalone) {
        setTimeout(() => setShowInstallBanner(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Mostrar opção para iOS após 3 segundos
    if (isIOSDevice && !standalone) {
      setTimeout(() => setShowInstallBanner(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
  };

  // Não mostrar se já está instalado ou foi dispensado
  if (isStandalone) return null;
  
  // Verificar sessionStorage apenas no cliente
  useEffect(() => {
    if (sessionStorage.getItem('pwa-banner-dismissed')) {
      setShowInstallBanner(false);
    }
  }, []);

  if (!showInstallBanner) return null;

  return (
    <>
      {/* Banner de instalação */}
      <div className="fixed bottom-24 lg:bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-96 bg-white rounded-2xl shadow-2xl border border-neutral-200 p-4 z-50 animate-slide-up">
        <button 
          onClick={dismissBanner}
          className="absolute top-2 right-2 p-1 hover:bg-neutral-100 rounded-full"
        >
          <X className="w-4 h-4 text-neutral-400" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex-shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-neutral-900">Instalar Caixa360</h3>
            <p className="text-sm text-neutral-500 mt-0.5">
              Acesse mais rápido direto da sua tela inicial
            </p>
            <button
              onClick={handleInstallClick}
              className="mt-3 w-full py-2.5 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" />
              Adicionar à Tela Inicial
            </button>
          </div>
        </div>
      </div>

      {/* Modal iOS com instruções */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowIOSModal(false)} />
          <div className="relative bg-white rounded-t-2xl w-full max-w-md p-6 animate-slide-up">
            <h3 className="font-semibold text-lg text-center mb-4">
              Instalar no iPhone/iPad
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-primary-600">1</span>
                </div>
                <div>
                  <p className="font-medium">Toque no botão Compartilhar</p>
                  <p className="text-sm text-neutral-500">
                    O ícone de quadrado com seta para cima (⬆️) na barra do Safari
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-primary-600">2</span>
                </div>
                <div>
                  <p className="font-medium">Role e toque em "Adicionar à Tela de Início"</p>
                  <p className="text-sm text-neutral-500">
                    Pode ser necessário rolar para baixo no menu
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-primary-600">3</span>
                </div>
                <div>
                  <p className="font-medium">Toque em "Adicionar"</p>
                  <p className="text-sm text-neutral-500">
                    O Caixa360 aparecerá como um app na sua tela inicial!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-6 w-full py-3 bg-neutral-100 text-neutral-700 rounded-xl font-medium"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
