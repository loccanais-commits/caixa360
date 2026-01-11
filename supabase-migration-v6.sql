-- =====================================================
-- CAIXA360 v6 - MIGRAÇÃO DE BANCO DE DADOS
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- =====================================================
-- 1. CATEGORIAS PERSONALIZADAS
-- =====================================================
CREATE TABLE IF NOT EXISTS categorias_personalizadas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  icone TEXT DEFAULT '📌',
  cor TEXT DEFAULT '#6b7280',
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categorias_empresa ON categorias_personalizadas(empresa_id);

-- RLS para categorias personalizadas
ALTER TABLE categorias_personalizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver categorias de suas empresas"
  ON categorias_personalizadas FOR SELECT
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem criar categorias em suas empresas"
  ON categorias_personalizadas FOR INSERT
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem atualizar categorias de suas empresas"
  ON categorias_personalizadas FOR UPDATE
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem deletar categorias de suas empresas"
  ON categorias_personalizadas FOR DELETE
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

-- =====================================================
-- 2. MULTI-MOEDAS
-- =====================================================

-- Adicionar coluna de moeda na empresa (moeda padrão)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS moeda_padrao TEXT DEFAULT 'BRL';

-- Adicionar coluna de moeda nos lançamentos
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'BRL';
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS taxa_cambio DECIMAL(12, 6) DEFAULT 1;
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS valor_convertido DECIMAL(12, 2);

-- Adicionar coluna de moeda nas contas
ALTER TABLE contas ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'BRL';
ALTER TABLE contas ADD COLUMN IF NOT EXISTS taxa_cambio DECIMAL(12, 6) DEFAULT 1;
ALTER TABLE contas ADD COLUMN IF NOT EXISTS valor_convertido DECIMAL(12, 2);

-- =====================================================
-- 3. NOTIFICAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('conta_vencer', 'conta_atrasada', 'meta_atingida', 'alerta_gasto', 'lembrete')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  conta_id UUID REFERENCES contas(id) ON DELETE CASCADE,
  lida BOOLEAN DEFAULT FALSE,
  data_referencia DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_empresa ON notificacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);

-- RLS para notificações
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver notificações de suas empresas"
  ON notificacoes FOR SELECT
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem criar notificações em suas empresas"
  ON notificacoes FOR INSERT
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem atualizar notificações de suas empresas"
  ON notificacoes FOR UPDATE
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem deletar notificações de suas empresas"
  ON notificacoes FOR DELETE
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

-- =====================================================
-- 4. FUNÇÃO PARA CRIAR NOTIFICAÇÕES DE CONTAS
-- =====================================================
CREATE OR REPLACE FUNCTION criar_notificacoes_contas()
RETURNS void AS $$
DECLARE
  config RECORD;
  conta RECORD;
BEGIN
  -- Para cada empresa com configurações
  FOR config IN 
    SELECT c.*, e.id as empresa_id 
    FROM configuracoes c 
    JOIN empresas e ON e.id = c.empresa_id
  LOOP
    -- Buscar contas que vencem nos próximos X dias
    FOR conta IN 
      SELECT * FROM contas 
      WHERE empresa_id = config.empresa_id 
      AND status = 'pendente'
      AND data_vencimento = CURRENT_DATE + config.alerta_dias_antes
    LOOP
      -- Criar notificação se não existir
      INSERT INTO notificacoes (empresa_id, tipo, titulo, mensagem, conta_id, data_referencia)
      SELECT 
        conta.empresa_id,
        'conta_vencer',
        'Conta a vencer em ' || config.alerta_dias_antes || ' dias',
        conta.descricao || ' - R$ ' || conta.valor::TEXT,
        conta.id,
        conta.data_vencimento
      WHERE NOT EXISTS (
        SELECT 1 FROM notificacoes 
        WHERE conta_id = conta.id 
        AND tipo = 'conta_vencer'
        AND data_referencia = conta.data_vencimento
      );
    END LOOP;

    -- Buscar contas que vencem HOJE
    FOR conta IN 
      SELECT * FROM contas 
      WHERE empresa_id = config.empresa_id 
      AND status = 'pendente'
      AND data_vencimento = CURRENT_DATE
    LOOP
      INSERT INTO notificacoes (empresa_id, tipo, titulo, mensagem, conta_id, data_referencia)
      SELECT 
        conta.empresa_id,
        'conta_vencer',
        '⚠️ Conta vence HOJE!',
        conta.descricao || ' - R$ ' || conta.valor::TEXT,
        conta.id,
        conta.data_vencimento
      WHERE NOT EXISTS (
        SELECT 1 FROM notificacoes 
        WHERE conta_id = conta.id 
        AND tipo = 'conta_vencer'
        AND data_referencia = conta.data_vencimento
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. DOCUMENTOS NO ASSISTENTE
-- =====================================================
CREATE TABLE IF NOT EXISTS documentos_assistente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL, -- pdf, image, excel, etc
  conteudo_extraido TEXT, -- texto extraído via OCR ou parsing
  url_arquivo TEXT,
  tamanho_bytes INTEGER,
  processado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentos_empresa ON documentos_assistente(empresa_id);

-- RLS para documentos
ALTER TABLE documentos_assistente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver documentos de suas empresas"
  ON documentos_assistente FOR SELECT
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem criar documentos em suas empresas"
  ON documentos_assistente FOR INSERT
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem deletar documentos de suas empresas"
  ON documentos_assistente FOR DELETE
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE categorias_personalizadas IS 'Categorias personalizadas criadas pelo usuário';
COMMENT ON TABLE notificacoes IS 'Notificações e alertas do sistema';
COMMENT ON TABLE documentos_assistente IS 'Documentos enviados para análise pelo assistente';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
