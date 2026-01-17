// Service Worker para Caixa360 - PWA + Push Notifications

const CACHE_NAME = 'caixa360-v3';

// Apenas arquivos estáticos que existem
const urlsToCache = [
  '/logo.png',
  '/manifest.json',
];

// Instalação - não falha se alguns recursos não carregarem
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aberto');
        // Cachear individualmente para não falhar tudo se um arquivo não existir
        return Promise.allSettled(
          urlsToCache.map(url =>
            cache.add(url).catch(err => console.warn('[SW] Falha ao cachear:', url, err))
          )
        );
      })
  );
  self.skipWaiting();
});

// Ativação
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network First com fallback para cache
self.addEventListener('fetch', (event) => {
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorar requisições de API e Supabase
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ==================== PUSH NOTIFICATIONS ====================

self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido');

  let data = {
    title: 'Caixa360',
    body: 'Você tem uma nova notificação',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'caixa360-notification',
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    vibrate: [200, 100, 200],
    data: data.data,
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [
      { action: 'ver', title: 'Ver detalhes' },
      { action: 'fechar', title: 'Fechar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event.action);
  event.notification.close();

  // Ação fechar
  if (event.action === 'fechar') {
    return;
  }

  // Determina URL baseado no tipo de notificação
  let urlToOpen = '/dashboard';

  if (event.notification.data) {
    const { type, id } = event.notification.data;

    switch (type) {
      case 'conta_vencendo':
      case 'conta_atrasada':
        urlToOpen = '/contas';
        break;
      case 'estoque_baixo':
        urlToOpen = '/produtos';
        break;
      case 'saldo_baixo':
        urlToOpen = '/dashboard';
        break;
    }

    if (event.action === 'pagar' && id) {
      urlToOpen = `/contas?pagar=${id}`;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Procura janela já aberta
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }

        // Abre nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Fechamento da notificação
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação fechada');
});

// ==================== BACKGROUND SYNC ====================

self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag === 'sync-lancamentos') {
    event.waitUntil(syncLancamentos());
  }

  if (event.tag === 'check-contas') {
    event.waitUntil(checkContasVencendo());
  }
});

async function syncLancamentos() {
  console.log('[SW] Sincronizando lançamentos offline...');
  // Implementar sincronização quando houver suporte offline
}

async function checkContasVencendo() {
  console.log('[SW] Verificando contas vencendo...');
  // Implementar verificação periódica de contas
}

// ==================== PERIODIC SYNC ====================

self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);

  if (event.tag === 'check-contas-diario') {
    event.waitUntil(checkContasVencendo());
  }
});

// ==================== MENSAGENS ====================

self.addEventListener('message', (event) => {
  console.log('[SW] Mensagem recebida:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CHECK_CONTAS') {
    checkContasVencendo();
  }
});
