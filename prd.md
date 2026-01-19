# PRD - Caixa360

## Product Requirements Document

**Versão:** 1.0.0
**Data:** Janeiro 2025
**Status:** Análise Completa para Deploy em Produção

---

## 1. Visão Geral do Produto

### 1.1 Descrição
**Caixa360** é uma aplicação web de gestão financeira inteligente desenvolvida especificamente para MEIs (Microempreendedores Individuais) e pequenas empresas brasileiras. O sistema oferece controle de fluxo de caixa, gestão de lançamentos financeiros, contas a pagar/receber, e análises baseadas em IA.

### 1.2 Propósito
Simplificar a gestão financeira de pequenos negócios, oferecendo:
- Visão clara do fluxo de caixa
- Alertas de contas a vencer
- Análises inteligentes via IA
- Importação de dados de planilhas
- Relatórios profissionais

### 1.3 Público-Alvo
- MEIs (Microempreendedores Individuais)
- Pequenas empresas (até 10 funcionários)
- Freelancers e autônomos
- Negócios dos setores: beleza, alimentação, comércio, serviços, oficinas

---

## 2. Stack Tecnológica

### 2.1 Frontend
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Next.js | 14.2.5 | Framework React (App Router) |
| React | 18.2.0 | Biblioteca UI |
| TypeScript | 5.3.0 | Tipagem estática |
| Tailwind CSS | 3.3.6 | Estilização |
| Recharts | 2.10.0 | Gráficos |
| Framer Motion | 12.26.1 | Animações |
| Lucide React | 0.263.1 | Ícones |
| SWR | 2.3.8 | Data fetching com cache |

### 2.2 Backend
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Supabase | 2.90.1 | BaaS (PostgreSQL + Auth) |
| Next.js API Routes | - | Endpoints serverless |
| X.AI (Grok) | - | Análises com IA |
| xlsx | 0.18.5 | Parsing de planilhas |

### 2.3 Infraestrutura Recomendada
- **Hosting:** Vercel (recomendado) ou similar
- **Banco de Dados:** Supabase (PostgreSQL gerenciado)
- **CDN:** Vercel Edge Network
- **IA:** API X.AI (Grok 3 Fast)

---

## 3. Arquitetura do Sistema

### 3.1 Estrutura de Diretórios
```
caixa360/
├── app/                          # Next.js App Router
│   ├── api/                      # 7 endpoints de API
│   │   ├── assistente/           # Chat IA
│   │   ├── importar-planilha/    # Upload Excel/CSV
│   │   ├── processar-documento/  # OCR (em desenvolvimento)
│   │   ├── relatorio-ia/         # Geração de relatórios
│   │   ├── report-share/         # Compartilhamento
│   │   ├── report-usage/         # Controle de limites
│   │   └── voice-process/        # Voz (em desenvolvimento)
│   ├── auth/callback/            # OAuth callback
│   ├── categorias/               # Gestão de categorias
│   ├── configuracoes/            # Configurações
│   ├── contas/                   # Contas a pagar/receber
│   ├── dashboard/                # Dashboard principal
│   ├── fornecedores/             # Gestão de fornecedores
│   ├── importar/                 # Import de planilhas
│   ├── lancamentos/              # Lançamentos financeiros
│   ├── onboarding/               # Onboarding (3 etapas)
│   ├── produtos/                 # Produtos/Serviços
│   ├── relatorio/                # Relatórios + share
│   ├── salario/                  # Pró-labore
│   ├── layout.tsx                # Layout root
│   ├── page.tsx                  # Login/Registro
│   └── globals.css               # Estilos globais
├── components/                   # Componentes React
│   ├── charts/                   # Gráficos (Recharts)
│   ├── layout/                   # AppLayout, Navigation
│   ├── reports/                  # ReportPDF
│   ├── ui/                       # Design System
│   ├── InstallPWA.tsx            # Instalação PWA
│   ├── NotificacoesPanel.tsx     # Painel de notificações
│   └── Providers.tsx             # SWR Provider
├── lib/                          # Utilitários e lógica
│   ├── contexts/                 # DataContext
│   ├── hooks/                    # Custom hooks
│   ├── supabase/                 # Clientes Supabase
│   ├── ai.ts                     # Integração X.AI
│   ├── chart-to-image.ts         # SVG para imagem
│   ├── currency.ts               # Formatação moeda
│   ├── export.ts                 # Exportação dados
│   ├── notifications.ts          # Sistema de alertas
│   ├── rate-limit.ts             # Rate limiting
│   ├── report-metrics.ts         # Métricas relatórios
│   ├── storage.ts                # localStorage helpers
│   ├── types.ts                  # TypeScript types
│   ├── utils.ts                  # Funções utilitárias
│   └── validations.ts            # Validações
├── public/                       # Assets estáticos
│   ├── icons/                    # PWA icons
│   ├── manifest.json             # PWA manifest
│   └── sw.js                     # Service Worker
├── supabase/                     # Migrações SQL
│   └── migrations/
├── middleware.ts                 # Autenticação middleware
├── next.config.js                # Config Next.js
├── tailwind.config.js            # Config Tailwind
└── tsconfig.json                 # Config TypeScript
```

### 3.2 Fluxo de Dados
```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                               │
├─────────────────────────────────────────────────────────────┤
│  React Components ──► SWR Hooks ──► DataContext (Cache)     │
│         │                              │                     │
│         │                              ▼                     │
│         │                        localStorage                │
│         ▼                              │                     │
│  Next.js API Routes ◄─────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        SERVIDOR                              │
├─────────────────────────────────────────────────────────────┤
│  Middleware (Auth) ──► API Routes ──► Rate Limiter          │
│                              │                               │
│                              ▼                               │
│                    ┌─────────────────┐                       │
│                    │   Supabase      │                       │
│                    │  (PostgreSQL)   │                       │
│                    └─────────────────┘                       │
│                              │                               │
│                              ▼                               │
│                    ┌─────────────────┐                       │
│                    │   X.AI (Grok)   │                       │
│                    │   API Externa   │                       │
│                    └─────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Modelo de Dados (Supabase)

#### Tabela: `usuarios`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK, referencia auth.users |
| email | VARCHAR | Email único |
| nome | VARCHAR | Nome completo |
| telefone | VARCHAR | Telefone opcional |
| created_at | TIMESTAMP | Data criação |

#### Tabela: `empresas`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| usuario_id | UUID | FK → usuarios |
| nome | VARCHAR | Nome da empresa |
| tipo_negocio | ENUM | beleza, alimentacao, comercio, servicos, oficina, outro |
| faixa_faturamento | ENUM | ate_5k, 5k_15k, 15k_30k, 30k_mais |
| dor_principal | ENUM | fluxo_caixa, separar_contas, entender_lucro, etc |
| saldo_inicial | DECIMAL | Saldo inicial em R$ |
| prolabore_definido | DECIMAL | Pró-labore mensal |
| created_at | TIMESTAMP | Data criação |

#### Tabela: `lancamentos`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas |
| tipo | ENUM | entrada, saida |
| descricao | VARCHAR | Descrição |
| valor | DECIMAL | Valor em R$ |
| categoria | VARCHAR | Categoria do lançamento |
| data | DATE | Data do lançamento |
| forma_pagamento | ENUM | pix, cartao, dinheiro, boleto, transferencia |
| fornecedor_id | UUID | FK → fornecedores (opcional) |
| produto_id | UUID | FK → produtos (opcional) |
| observacao | TEXT | Observações |
| created_at | TIMESTAMP | Data criação |

#### Tabela: `contas`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas |
| tipo | ENUM | entrada, saida |
| descricao | VARCHAR | Descrição |
| valor | DECIMAL | Valor em R$ |
| data_vencimento | DATE | Data vencimento |
| data_pagamento | DATE | Data pagamento (quando pago) |
| status | ENUM | pendente, pago, atrasado, cancelado |
| recorrente | BOOLEAN | Se é recorrente |
| created_at | TIMESTAMP | Data criação |

#### Tabela: `fornecedores`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas |
| nome | VARCHAR | Nome do fornecedor |
| categoria | VARCHAR | Categoria |
| contato | VARCHAR | Telefone/email |
| created_at | TIMESTAMP | Data criação |

#### Tabela: `produtos`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas |
| nome | VARCHAR | Nome do produto/serviço |
| tipo | ENUM | produto, servico |
| preco | DECIMAL | Preço de venda |
| custo | DECIMAL | Custo (opcional) |
| estoque | INT | Quantidade em estoque |
| created_at | TIMESTAMP | Data criação |

#### Tabela: `report_usage`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas |
| mes_ano | VARCHAR(7) | Formato YYYY-MM |
| relatorios_ia_usados | INT | Máx 2/mês |
| relatorios_pdf_usados | INT | Máx 5/mês |

#### Tabela: `report_shares`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK (usado como link público) |
| empresa_id | UUID | FK → empresas |
| report_data | JSONB | Dados do relatório |
| periodo_inicio | DATE | Início do período |
| periodo_fim | DATE | Fim do período |
| expires_at | TIMESTAMP | Expira em 7 dias |

---

## 4. Funcionalidades

### 4.1 Implementadas

#### Dashboard
- [x] Cards de métricas (Saldo, Entradas, Saídas, Resultado)
- [x] Gráfico de evolução do saldo (7d/30d/1ano)
- [x] Indicador de saúde do caixa (0-100%)
- [x] Gráfico comparativo mensal (últimos 6 meses)
- [x] Gráfico de gastos por categoria (pizza)
- [x] Top 5 produtos mais vendidos
- [x] Insights automáticos baseados nos dados
- [x] Alertas de contas atrasadas

#### Lançamentos
- [x] Criar entradas e saídas
- [x] Categorização automática
- [x] Filtros por período/categoria/fornecedor
- [x] Edição e exclusão
- [x] Listagem paginada

#### Contas a Pagar/Receber
- [x] Cadastro de contas
- [x] Status: pendente/pago/atrasado/cancelado
- [x] Alertas de vencimento
- [x] Marcar como pago
- [x] Recorrência (mensal)

#### Fornecedores
- [x] CRUD completo
- [x] Categorização
- [x] Vinculação com lançamentos

#### Produtos/Serviços
- [x] CRUD completo
- [x] Tipo: produto ou serviço
- [x] Preço e estoque
- [x] Vinculação com lançamentos

#### Pró-labore (Salário)
- [x] Definir valor mensal
- [x] Histórico de retiradas
- [x] Alertas de disponibilidade

#### Importação
- [x] Upload de arquivos Excel (.xlsx)
- [x] Upload de arquivos CSV
- [x] Detecção automática de formato
- [x] Preview antes de importar
- [x] Extração inteligente de valores

#### Relatórios
- [x] Geração de relatório com análise IA
- [x] Limite: 2 relatórios IA/mês
- [x] Compartilhamento via link público
- [x] Expiração em 7 dias
- [x] Visualização de PDF

#### Assistente IA (Chat)
- [x] Chat contextualizado com dados financeiros
- [x] Rate limit: 10 mensagens/minuto
- [x] Respostas curtas e objetivas

#### Autenticação
- [x] Login por email/senha
- [x] Login com Google OAuth
- [x] Middleware de proteção de rotas
- [x] Sessão persistente

#### Onboarding
- [x] 3 perguntas essenciais
- [x] Tipo de negócio
- [x] Faixa de faturamento
- [x] Principal dor/necessidade

#### PWA
- [x] Manifest configurado
- [x] Service Worker básico
- [x] Ícones para instalação
- [x] Botão "Instalar App"

### 4.2 Em Desenvolvimento
- [ ] Lançamento por voz (API implementada, UI pendente)
- [ ] OCR de documentos (API implementada, UI pendente)

### 4.3 Planejadas
- [ ] Web Push Notifications
- [ ] Resumo semanal automático por email
- [ ] Integração com WhatsApp
- [ ] App mobile (React Native)
- [ ] Integração com APIs bancárias
- [ ] Exportação para contador

---

## 5. Análise de Segurança

### 5.1 Vulnerabilidades Críticas

#### CRIT-001: API Key em localStorage
- **Arquivo:** `lib/ai.ts`
- **Severidade:** CRÍTICA
- **Descrição:** Chave da API X.AI armazenada em localStorage, vulnerável a XSS
- **Impacto:** Roubo de credenciais, custos não autorizados
- **Correção:** Armazenar no servidor ou usar proxy para requisições

#### CRIT-002: APIs sem Autenticação
- **Arquivos:**
  - `app/api/importar-planilha/route.ts`
  - `app/api/processar-documento/route.ts`
  - `app/api/voice-process/route.ts`
- **Severidade:** CRÍTICA
- **Descrição:** Endpoints POST não verificam sessão do usuário
- **Impacto:** Upload de arquivos maliciosos, abuso de recursos
- **Correção:** Adicionar verificação de autenticação em todas as APIs

#### CRIT-003: Exceção de Auth no Middleware
- **Arquivo:** `middleware.ts` (linha 78)
- **Severidade:** CRÍTICA
- **Descrição:** `/api/assistente` bypassa autenticação
- **Impacto:** Qualquer pessoa pode consumir tokens da IA
- **Correção:** Remover exceção, implementar auth adequada

#### CRIT-004: Dados Sensíveis para IA Externa
- **Arquivos:** `app/api/assistente/route.ts`, `app/api/relatorio-ia/route.ts`
- **Severidade:** ALTA
- **Descrição:** Dados financeiros completos enviados para X.AI
- **Impacto:** Possível violação de LGPD
- **Correção:** Anonimizar dados antes de enviar, adicionar consentimento

### 5.2 Vulnerabilidades Altas

#### HIGH-001: Rate Limiting em Memória
- **Arquivo:** `lib/rate-limit.ts`
- **Severidade:** ALTA
- **Descrição:** Rate limit usa Map em memória, não funciona com múltiplas instâncias
- **Correção:** Usar Redis ou Supabase para persistir contadores

#### HIGH-002: XSS via dangerouslySetInnerHTML
- **Arquivo:** `components/reports/ReportPDF.tsx`
- **Severidade:** ALTA
- **Descrição:** SVGs renderizados sem sanitização
- **Correção:** Usar biblioteca de sanitização (DOMPurify)

#### HIGH-003: Validação de Input Inadequada
- **Arquivo:** `lib/validations.ts`
- **Severidade:** ALTA
- **Descrição:** Sanitização apenas remove `<>`, regex de email muito fraco
- **Correção:** Usar bibliotecas de validação robustas (zod, yup)

#### HIGH-004: CORS Não Configurado
- **Arquivos:** Todos os endpoints `/api/*`
- **Severidade:** MÉDIA
- **Descrição:** Sem headers CORS explícitos
- **Correção:** Configurar CORS com whitelist de domínios

#### HIGH-005: Sem Proteção CSRF
- **Severidade:** MÉDIA
- **Descrição:** Endpoints POST vulneráveis a CSRF
- **Correção:** Implementar tokens CSRF

### 5.3 Checklist de Segurança para Deploy

- [ ] Remover armazenamento de API key em localStorage
- [ ] Adicionar autenticação em todas as APIs
- [ ] Configurar CORS corretamente
- [ ] Implementar rate limiting persistente (Redis)
- [ ] Adicionar proteção CSRF
- [ ] Sanitizar todos os inputs com biblioteca adequada
- [ ] Configurar headers de segurança (CSP, HSTS, etc.)
- [ ] Habilitar RLS em todas as tabelas Supabase
- [ ] Revisar políticas de RLS existentes
- [ ] Configurar logging seguro (não logar dados sensíveis)
- [ ] Adicionar monitoramento de segurança
- [ ] Realizar teste de penetração antes do lançamento

---

## 6. Análise de Qualidade de Código

### 6.1 Problemas Críticos

#### CODE-001: Memory Leak no useAuth
- **Arquivo:** `lib/hooks/useAuth.ts`
- **Problema:** Função async não awaited, dependências incorretas no useEffect
- **Impacto:** Memory leak, race conditions
- **Correção:** Usar AbortController, corrigir dependências

#### CODE-002: Cache sem Limite
- **Arquivo:** `lib/contexts/DataContext.tsx`
- **Problema:** Cache pode crescer indefinidamente
- **Impacto:** Memory bloat em dispositivos móveis
- **Correção:** Implementar limite de tamanho ou paginação

#### CODE-003: setInterval Global
- **Arquivo:** `lib/rate-limit.ts`
- **Problema:** setInterval no escopo do módulo, executado toda vez que importado
- **Impacto:** Múltiplas instâncias do intervalo
- **Correção:** Usar singleton ou cleanup adequado

### 6.2 Problemas de Performance

#### PERF-001: Cálculos Pesados no Dashboard
- **Arquivo:** `app/dashboard/page.tsx`
- **Problema:** Múltiplos sorts e filters aninhados em cada render
- **Impacto:** Lag perceptível com muitos lançamentos
- **Correção:** Mover cálculos para o servidor ou usar Web Workers

#### PERF-002: N+1 Query Pattern
- **Arquivo:** `app/api/assistente/route.ts`
- **Problema:** Loop que filtra lançamentos para cada fornecedor
- **Impacto:** O(n²) complexity
- **Correção:** Usar agregação SQL ou reestruturar dados

#### PERF-003: SWR sem Otimização
- **Arquivo:** `lib/hooks/useSWRHooks.ts`
- **Problema:** Busca todos os registros, filtra no cliente
- **Impacto:** Transferência de dados desnecessária
- **Correção:** Filtrar no Supabase query

### 6.3 Problemas de Tipagem

#### TYPE-001: Uso Extensivo de `any`
- **Arquivos:** Múltiplos
- **Problema:** 15+ ocorrências de `any` ou `any[]`
- **Impacto:** Perda de type-safety
- **Correção:** Tipar corretamente todos os dados

#### TYPE-002: Assertions Perigosas
- **Arquivos:** `app/api/importar-planilha/route.ts`
- **Problema:** Type assertions sem validação runtime
- **Correção:** Usar type guards ou zod

### 6.4 Checklist de Qualidade para Deploy

- [ ] Corrigir memory leaks no useAuth
- [ ] Adicionar AbortController em requisições async
- [ ] Implementar limite de cache
- [ ] Otimizar cálculos do dashboard
- [ ] Mover filtros para queries Supabase
- [ ] Remover todos os `any` types
- [ ] Adicionar tratamento de erro em todas as APIs
- [ ] Implementar error boundaries no React
- [ ] Adicionar testes unitários (cobertura mínima 60%)
- [ ] Adicionar testes E2E para fluxos críticos
- [ ] Configurar ESLint e TypeScript strict mode

---

## 7. Configurações de Ambiente

### 7.1 Variáveis de Ambiente

```env
# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# X.AI - IA (obrigatório para chat e relatórios)
XAI_API_KEY=xai-...

# App
NEXT_PUBLIC_APP_URL=https://seudominio.com
```

### 7.2 Configuração Supabase

1. Criar projeto em supabase.com
2. Executar migrações SQL
3. Configurar Auth:
   - Habilitar Email/Password
   - Habilitar Google OAuth (opcional)
   - Configurar URL de redirect
4. Configurar RLS em todas as tabelas
5. Criar índices para performance

### 7.3 Configuração Vercel

1. Conectar repositório GitHub
2. Configurar variáveis de ambiente
3. Configurar domínio personalizado
4. Habilitar Analytics (opcional)

---

## 8. Plano de Deploy

### 8.1 Fase 1: Correções Críticas (Prioridade Máxima)

**Tempo estimado: 2-3 dias de desenvolvimento**

1. **Segurança de APIs**
   - Adicionar verificação de sessão em todas as APIs
   - Remover exceção do middleware para `/api/assistente`
   - Implementar rate limiting com Redis/Upstash

2. **Autenticação**
   - Revisar todas as políticas RLS do Supabase
   - Testar isolamento de dados entre empresas

3. **Dados Sensíveis**
   - Remover armazenamento de API key em localStorage
   - Criar proxy server-side para chamadas X.AI

### 8.2 Fase 2: Estabilização (Alta Prioridade)

**Tempo estimado: 3-5 dias de desenvolvimento**

1. **Correções de Código**
   - Corrigir memory leaks identificados
   - Otimizar performance do dashboard
   - Melhorar tratamento de erros

2. **Validações**
   - Implementar validação robusta com zod
   - Sanitizar todos os inputs
   - Adicionar limites de tamanho em uploads

3. **Configurações**
   - Configurar CORS corretamente
   - Adicionar headers de segurança
   - Configurar CSP (Content Security Policy)

### 8.3 Fase 3: Testes e QA (Média Prioridade)

**Tempo estimado: 2-3 dias**

1. **Testes**
   - Testes unitários para funções críticas
   - Testes de integração para APIs
   - Testes E2E para fluxos principais

2. **QA Manual**
   - Testar todos os fluxos de usuário
   - Testar em dispositivos móveis
   - Testar PWA installation

### 8.4 Fase 4: Deploy Produção

**Tempo estimado: 1 dia**

1. **Preparação**
   - Configurar ambiente de produção no Vercel
   - Configurar Supabase de produção (separado de dev)
   - Configurar monitoramento (Sentry, LogRocket)

2. **Deploy**
   - Deploy inicial em ambiente de staging
   - Validação final
   - Deploy em produção
   - Monitoramento pós-deploy

### 8.5 Fase 5: Pós-Deploy

**Contínuo**

1. **Monitoramento**
   - Configurar alertas de erro
   - Monitorar performance
   - Analisar uso de recursos

2. **Iterações**
   - Coletar feedback de usuários
   - Priorizar melhorias
   - Releases incrementais

---

## 9. Métricas de Sucesso

### 9.1 Técnicas
- Uptime: > 99.5%
- Tempo de resposta médio: < 500ms
- Core Web Vitals: todos verdes
- Taxa de erro: < 1%

### 9.2 Produto
- Taxa de conclusão do onboarding: > 80%
- Usuários ativos diários (DAU)
- Lançamentos criados por usuário/mês
- Uso de relatórios IA

### 9.3 Segurança
- Zero vulnerabilidades críticas em produção
- Tempo de resposta a incidentes: < 24h
- Compliance LGPD

---

## 10. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Ataque a APIs desprotegidas | Alta | Crítico | Correção imediata de autenticação |
| Vazamento de dados para X.AI | Média | Alto | Anonimização + consentimento |
| Performance degradada | Média | Médio | Otimizações pré-deploy |
| Custos de IA elevados | Média | Médio | Rate limiting + limites mensais |
| Indisponibilidade Supabase | Baixa | Alto | Plano de contingência |

---

## 11. Custos Estimados (Mensal)

### 11.1 Infraestrutura
| Serviço | Tier | Custo |
|---------|------|-------|
| Vercel | Pro | $20/mês |
| Supabase | Pro | $25/mês |
| Upstash Redis | Free/Pay-as-you-go | $0-10/mês |
| Domínio | - | ~$12/ano |
| **Total Infra** | | **~$50-60/mês** |

### 11.2 APIs Externas
| Serviço | Estimativa | Custo |
|---------|------------|-------|
| X.AI (Grok) | ~10k requests/mês | ~$20-50/mês |
| **Total APIs** | | **~$20-50/mês** |

### 11.3 Custo Total Estimado
**$70-110/mês** para operação básica (até ~1000 usuários ativos)

---

## 12. Conclusão

O projeto Caixa360 possui uma base sólida com funcionalidades bem desenvolvidas para o público-alvo. No entanto, **não está pronto para produção** devido a vulnerabilidades de segurança críticas que precisam ser corrigidas antes do deploy.

### Ações Imediatas Necessárias:
1. Corrigir todas as vulnerabilidades críticas de segurança
2. Implementar rate limiting persistente
3. Revisar e testar políticas de RLS
4. Otimizar performance do dashboard
5. Adicionar testes automatizados

### Estimativa Total para Deploy Seguro:
**8-12 dias de desenvolvimento** seguindo o plano de fases proposto.

---

## Apêndice A: Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Produção local
npm run start

# Lint
npm run lint
```

## Apêndice B: Links Importantes

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [X.AI API Docs](https://docs.x.ai)
- [Next.js Docs](https://nextjs.org/docs)

---

**Documento gerado em:** Janeiro 2025
**Última atualização:** Janeiro 2025
