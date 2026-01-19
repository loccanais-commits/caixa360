// Rate Limiter para APIs
// Implementa sliding window com armazenamento em memória

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 10000;

// Variável para controlar o intervalo de cleanup
let cleanupInterval: NodeJS.Timeout | null = null;

// Função para iniciar o cleanup
function startCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

// Função para parar o cleanup (útil para testes)
export function stopCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// Função para limitar o tamanho do store
function enforceStoreLimit() {
  if (rateLimitStore.size > MAX_STORE_SIZE) {
    // Remove as entradas mais antigas (menor resetTime)
    const entries = Array.from(rateLimitStore.entries())
      .sort((a, b) => a[1].resetTime - b[1].resetTime);

    const toRemove = entries.slice(0, rateLimitStore.size - MAX_STORE_SIZE + 1000);
    toRemove.forEach(([key]) => rateLimitStore.delete(key));
  }
}

// Inicializa o cleanup apenas uma vez
startCleanup();

export interface RateLimitConfig {
  maxRequests: number;  // Número máximo de requisições
  windowMs: number;     // Janela de tempo em milissegundos
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number;  // Segundos até reset
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  // Verificar e limitar tamanho do store
  enforceStoreLimit();

  let entry = rateLimitStore.get(key);

  // Se não existe ou expirou, cria nova entrada
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetIn: Math.ceil(config.windowMs / 1000),
    };
  }

  // Incrementa contador
  entry.count++;

  // Verifica se excedeu limite
  if (entry.count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

// Obtém identificador único do request (userId preferencial)
export function getRequestIdentifier(
  request: Request,
  userId?: string
): string {
  // Prioriza userId para rate limiting mais preciso
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback para IP (menos confiável)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  // Usar apenas IP para identificação (user-agent pode ser facilmente spoofado)
  return `ip:${ip}`;
}

// Limpa o store (útil para testes)
export function clearRateLimitStore() {
  rateLimitStore.clear();
}
