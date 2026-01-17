-- Migração: Tabelas para sistema de relatórios avançados
-- Data: 2024-01-17

-- Tabela de controle de uso de relatórios (rate limiting)
CREATE TABLE IF NOT EXISTS report_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  mes_ano VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
  relatorios_ia_usados INT DEFAULT 0, -- Máximo: 2 por mês
  relatorios_pdf_usados INT DEFAULT 0, -- Máximo: 5 por mês
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(empresa_id, mes_ano)
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_report_usage_empresa_mes
ON report_usage(empresa_id, mes_ano);

-- Tabela de relatórios compartilhados
CREATE TABLE IF NOT EXISTS report_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  report_data JSONB NOT NULL, -- Dados completos do relatório
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  inclui_analise_ia BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accessed_count INT DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Índice para busca por ID (links compartilhados)
CREATE INDEX IF NOT EXISTS idx_report_shares_id
ON report_shares(id);

-- Índice para limpeza de expirados
CREATE INDEX IF NOT EXISTS idx_report_shares_expires
ON report_shares(expires_at);

-- RLS (Row Level Security) para report_usage
ALTER TABLE report_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver uso da própria empresa" ON report_usage
  FOR SELECT USING (
    empresa_id IN (
      SELECT id FROM empresas WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir uso da própria empresa" ON report_usage
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT id FROM empresas WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar uso da própria empresa" ON report_usage
  FOR UPDATE USING (
    empresa_id IN (
      SELECT id FROM empresas WHERE usuario_id = auth.uid()
    )
  );

-- RLS para report_shares (público para leitura, restrito para escrita)
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ler relatórios compartilhados (para o link funcionar)
CREATE POLICY "Relatórios compartilhados são públicos" ON report_shares
  FOR SELECT USING (
    expires_at > NOW()
  );

-- Apenas donos podem criar compartilhamentos
CREATE POLICY "Usuários podem compartilhar próprios relatórios" ON report_shares
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT id FROM empresas WHERE usuario_id = auth.uid()
    )
  );

-- Função para limpar relatórios expirados (executar via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_report_shares()
RETURNS void AS $$
BEGIN
  DELETE FROM report_shares WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_report_usage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_report_usage_updated
  BEFORE UPDATE ON report_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_report_usage_timestamp();
