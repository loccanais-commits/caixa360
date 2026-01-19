# SPEC - Especificação Técnica de Correções

## Visão Geral

Este documento detalha todas as modificações necessárias para preparar o Caixa360 para deploy em produção, baseado na análise do PRD.

---

## Fase 1: Segurança Crítica

### 1.1 Criar Helper de Autenticação

**Novo arquivo:** `lib/auth-helpers.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function getAuthenticatedUser(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  return session?.user || null
}

export async function requireAuth(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  }
  return { user }
}

export async function getEmpresaByUserId(supabase: any, userId: string) {
  const { data } = await supabase
    .from('empresas')
    .select('id')
    .eq('usuario_id', userId)
    .single()
  return data?.id || null
}
```

---

### 1.2 Corrigir Middleware

**Arquivo:** `middleware.ts`

**Modificação:** Remover exceção para `/api/assistente` (linhas 77-80)

```diff
  // Para APIs protegidas, retorna 401
  if (!session && request.nextUrl.pathname.startsWith('/api')) {
-   // Exceção para API do assistente que faz validação própria
-   if (request.nextUrl.pathname === '/api/assistente') {
-     return response
-   }
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    )
  }
```

---

### 1.3 Corrigir API Assistente

**Arquivo:** `app/api/assistente/route.ts`

**Modificação:** Adicionar autenticação no início da função POST

```typescript
import { getAuthenticatedUser, getEmpresaByUserId } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  // Verificar autenticação
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Rate limiting por userId
  const identifier = `user:${user.id}`
  const rateLimit = checkRateLimit(identifier, RATE_LIMIT_CONFIG.assistente)
  if (!rateLimit.allowed) {
    return NextResponse.json({
      error: `Limite de requisições atingido. Tente novamente em ${rateLimit.retryAfter} segundos.`
    }, { status: 429 })
  }

  // ... resto do código existente
}
```

---

### 1.4 Corrigir API Importar Planilha

**Arquivo:** `app/api/importar-planilha/route.ts`

**Modificação:** Adicionar autenticação e validações

```typescript
import { getAuthenticatedUser } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  // Verificar autenticação
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File

  // Validar tamanho (máx 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10MB.' }, { status: 400 })
  }

  // Validar tipo de arquivo
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de arquivo não permitido.' }, { status: 400 })
  }

  // ... resto do código existente
}
```

---

### 1.5 Corrigir API Processar Documento

**Arquivo:** `app/api/processar-documento/route.ts`

**Modificação:** Adicionar autenticação

```typescript
import { getAuthenticatedUser } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  // Verificar autenticação
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // ... resto do código existente
}
```

---

### 1.6 Corrigir API Voice Process

**Arquivo:** `app/api/voice-process/route.ts`

**Modificação:** Adicionar autenticação

```typescript
import { getAuthenticatedUser } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  // Verificar autenticação
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // ... resto do código existente
}
```

---

### 1.7 Remover API Key do localStorage

**Arquivo:** `lib/ai.ts`

**Modificação:** Remover funções de localStorage, usar apenas env vars

```diff
- export function getApiKey(): string | null {
-   if (typeof window === 'undefined') return null;
-   return localStorage.getItem('caixaclaro_xai_api_key');
- }
-
- export function setApiKey(key: string): void {
-   if (typeof window === 'undefined') return;
-   localStorage.setItem('caixaclaro_xai_api_key', key);
- }
-
- export function removeApiKey(): void {
-   if (typeof window === 'undefined') return;
-   localStorage.removeItem('caixaclaro_xai_api_key');
- }

+ // API Key agora é gerenciada apenas no servidor via env vars
+ // Todas as chamadas à IA devem passar pelas APIs do backend
```

**Arquivos que usam getApiKey/setApiKey para atualizar:**
- Verificar `app/configuracoes/page.tsx` - remover campo de API key
- Verificar componentes que chamam essas funções

---

## Fase 2: Segurança Alta

### 2.1 Corrigir Rate Limiting

**Arquivo:** `lib/rate-limit.ts`

**Modificação:** Encapsular interval e adicionar limite de tamanho

```typescript
const MAX_STORE_SIZE = 10000

let cleanupInterval: NodeJS.Timeout | null = null

function startCleanup() {
  if (cleanupInterval) return

  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

function enforceStoreLimit() {
  if (rateLimitStore.size > MAX_STORE_SIZE) {
    // Remove oldest entries
    const entries = Array.from(rateLimitStore.entries())
      .sort((a, b) => a[1].resetTime - b[1].resetTime)

    const toRemove = entries.slice(0, rateLimitStore.size - MAX_STORE_SIZE + 1000)
    toRemove.forEach(([key]) => rateLimitStore.delete(key))
  }
}

// Inicializar cleanup apenas uma vez
startCleanup()
```

---

### 2.2 Melhorar Validações

**Arquivo:** `lib/validations.ts`

**Modificação:** Melhorar regex de email e sanitização

```typescript
// Regex de email mais robusto (RFC 5322 simplificado)
export function validarEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  return regex.test(email) && email.length <= 254
}

// Sanitização mais robusta
export function sanitizarTexto(texto: string): string {
  return texto
    .trim()
    .replace(/[<>&"'`]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#x60;'
      }
      return entities[char] || char
    })
    .slice(0, 1000)
}

// Validação de data com intervalo razoável
export function validarData(data: string): boolean {
  if (!data) return false
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(data)) return false

  const d = new Date(data + 'T00:00:00')
  if (isNaN(d.getTime())) return false

  const year = d.getFullYear()
  return year >= 1900 && year <= 2100
}
```

---

### 2.3 Adicionar Headers de Segurança

**Arquivo:** `next.config.js`

**Modificação:** Adicionar headers e remover ignore de erros

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['ckvhazeansmkshiefoxo.supabase.co'],
  },
  // Remover em produção após corrigir erros
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

---

## Fase 3: Qualidade de Código

### 3.1 Corrigir Memory Leak useAuth

**Arquivo:** `lib/hooks/useAuth.ts`

**Modificação:** Memoizar cliente e corrigir dependências

```typescript
import { useMemo, useEffect, useState, useCallback } from 'react'

export function useAuth(requireAuth = true) {
  const router = useRouter()

  // Memoizar cliente Supabase
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (isMounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted) {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase]) // Apenas supabase como dependência

  // ... resto do código
}
```

---

### 3.2 Corrigir DataContext

**Arquivo:** `lib/contexts/DataContext.tsx`

**Modificação:** Corrigir dependências e adicionar limite

```typescript
const MAX_CACHE_ITEMS = 1000

const refreshLancamentos = useCallback(async (force = false) => {
  const cacheKey = 'lancamentos'
  if (!force && !isCacheStale(cacheKey) && cache.lancamentos.length > 0) {
    return
  }

  // ... fetch logic

  // Aplicar limite
  const lancamentos = data.slice(0, MAX_CACHE_ITEMS)

  setCache(prev => ({
    ...prev,
    lancamentos,
    timestamps: { ...prev.timestamps, lancamentos: Date.now() }
  }))
}, [supabase, empresaId]) // Dependências estáveis, não cache.lancamentos.length
```

---

### 3.3 Otimizar Dashboard

**Arquivo:** `app/dashboard/page.tsx`

**Modificação:** Adicionar cleanup ao setTimeout

```typescript
useEffect(() => {
  if (contasAtrasadas.length > 0 && !alertasVistos && !loadingDashboard) {
    const timeoutId = setTimeout(() => {
      setShowAlertas(true)
      setAlertasVistos(true)
    }, 500)

    // Cleanup function
    return () => clearTimeout(timeoutId)
  }
}, [contasAtrasadas.length, alertasVistos, loadingDashboard])
```

---

## Arquivos a Modificar (Resumo)

| # | Arquivo | Ação | Prioridade |
|---|---------|------|------------|
| 1 | `lib/auth-helpers.ts` | CRIAR | CRÍTICA |
| 2 | `middleware.ts` | MODIFICAR | CRÍTICA |
| 3 | `app/api/assistente/route.ts` | MODIFICAR | CRÍTICA |
| 4 | `app/api/importar-planilha/route.ts` | MODIFICAR | CRÍTICA |
| 5 | `app/api/processar-documento/route.ts` | MODIFICAR | CRÍTICA |
| 6 | `app/api/voice-process/route.ts` | MODIFICAR | CRÍTICA |
| 7 | `lib/ai.ts` | MODIFICAR | CRÍTICA |
| 8 | `lib/rate-limit.ts` | MODIFICAR | ALTA |
| 9 | `lib/validations.ts` | MODIFICAR | ALTA |
| 10 | `next.config.js` | MODIFICAR | ALTA |
| 11 | `lib/hooks/useAuth.ts` | MODIFICAR | MÉDIA |
| 12 | `lib/contexts/DataContext.tsx` | MODIFICAR | MÉDIA |
| 13 | `app/dashboard/page.tsx` | MODIFICAR | MÉDIA |

---

## Verificação

### Testes Manuais

1. **Autenticação**
   - [ ] Login funciona
   - [ ] Logout funciona
   - [ ] APIs retornam 401 sem sessão
   - [ ] `/api/assistente` requer autenticação

2. **Rate Limiting**
   - [ ] Limite de 10 msgs/min no assistente funciona
   - [ ] Retorna 429 quando excede

3. **Importação**
   - [ ] Upload de planilha funciona
   - [ ] Rejeita arquivos > 10MB
   - [ ] Rejeita tipos não permitidos

4. **Build**
   - [ ] `npm run build` passa sem erros
   - [ ] Sem warnings críticos de TypeScript

---

## Ordem de Implementação

1. Criar `lib/auth-helpers.ts`
2. Corrigir `middleware.ts`
3. Corrigir APIs (assistente, importar-planilha, processar-documento, voice-process)
4. Corrigir `lib/ai.ts`
5. Corrigir `lib/rate-limit.ts`
6. Corrigir `lib/validations.ts`
7. Corrigir `next.config.js`
8. Corrigir `lib/hooks/useAuth.ts`
9. Corrigir `lib/contexts/DataContext.tsx`
10. Corrigir `app/dashboard/page.tsx`
11. Testar build
12. Testes manuais

---

**Documento gerado em:** Janeiro 2025
