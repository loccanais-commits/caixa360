// Sistema de Notificações Push

// ==================== TIPOS ====================

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, any>;
  requireInteraction?: boolean;
  silent?: boolean;
}

// ==================== VERIFICAÇÕES ====================

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

// ==================== PERMISSÃO ====================

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return 'denied';
}

// ==================== ENVIAR NOTIFICAÇÃO ====================

export function sendNotification(options: NotificationOptions): Notification | null {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/icon-192.png',
      tag: options.tag,
      data: options.data,
      requireInteraction: options.requireInteraction,
      silent: options.silent,
    });

    // Auto-fechar após 5 segundos se não for requireInteraction
    if (!options.requireInteraction) {
      setTimeout(() => notification.close(), 5000);
    }

    return notification;
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return null;
  }
}

// ==================== NOTIFICAÇÕES ESPECÍFICAS ====================

export function notifyContaVencendo(descricao: string, valor: number, diasRestantes: number) {
  const title = diasRestantes === 0
    ? 'Conta vence hoje!'
    : `Conta vence em ${diasRestantes} dia${diasRestantes > 1 ? 's' : ''}`;

  return sendNotification({
    title,
    body: `${descricao} - R$ ${valor.toFixed(2).replace('.', ',')}`,
    tag: `conta-vencendo-${descricao}`,
    requireInteraction: diasRestantes === 0,
  });
}

export function notifyContaAtrasada(descricao: string, valor: number, diasAtraso: number) {
  return sendNotification({
    title: 'Conta atrasada!',
    body: `${descricao} está ${diasAtraso} dia${diasAtraso > 1 ? 's' : ''} atrasada - R$ ${valor.toFixed(2).replace('.', ',')}`,
    tag: `conta-atrasada-${descricao}`,
    requireInteraction: true,
  });
}

export function notifyEstoqueBaixo(produto: string, quantidade: number, minimo: number) {
  return sendNotification({
    title: 'Estoque baixo!',
    body: `${produto}: ${quantidade} unidades (mínimo: ${minimo})`,
    tag: `estoque-baixo-${produto}`,
  });
}

export function notifySaldoBaixo(saldo: number, limite: number) {
  return sendNotification({
    title: 'Saldo baixo!',
    body: `Seu saldo atual é R$ ${saldo.toFixed(2).replace('.', ',')} (abaixo de R$ ${limite.toFixed(2).replace('.', ',')})`,
    tag: 'saldo-baixo',
    requireInteraction: true,
  });
}

// ==================== AGENDAMENTO DE VERIFICAÇÕES ====================

interface ScheduledCheck {
  id: number;
  interval: number;
}

const scheduledChecks: ScheduledCheck[] = [];

export function scheduleNotificationCheck(
  checkFn: () => void,
  intervalMinutes: number = 60
): number {
  const intervalId = setInterval(checkFn, intervalMinutes * 60 * 1000) as unknown as number;

  scheduledChecks.push({
    id: intervalId,
    interval: intervalMinutes,
  });

  // Executa imediatamente também
  checkFn();

  return intervalId;
}

export function cancelNotificationCheck(id: number) {
  clearInterval(id);
  const index = scheduledChecks.findIndex(c => c.id === id);
  if (index !== -1) {
    scheduledChecks.splice(index, 1);
  }
}

export function cancelAllNotificationChecks() {
  scheduledChecks.forEach(c => clearInterval(c.id));
  scheduledChecks.length = 0;
}

// ==================== SERVICE WORKER REGISTRATION ====================

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registrado:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Erro ao registrar Service Worker:', error);
    return null;
  }
}

// ==================== HOOK DE NOTIFICAÇÕES ====================

import { useState, useEffect, useCallback } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isNotificationSupported());
    setPermission(getNotificationPermission());
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  const notify = useCallback((options: NotificationOptions) => {
    if (permission !== 'granted') return null;
    return sendNotification(options);
  }, [permission]);

  return {
    isSupported,
    permission,
    requestPermission,
    notify,
    notifyContaVencendo,
    notifyContaAtrasada,
    notifyEstoqueBaixo,
    notifySaldoBaixo,
  };
}
