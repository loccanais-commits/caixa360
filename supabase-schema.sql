-- =====================================================
-- CAIXA360 - Script de criação do banco de dados
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: usuarios (perfil do usuário)
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: empresas
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  tipo_negocio TEXT NOT NULL CHECK (tipo_negocio IN ('beleza', 'alimentacao', 'comercio', 'servicos', 'oficina', 'outro')),
  faixa_faturamento TEXT NOT NULL CHECK (faixa_faturamento IN ('ate5k', '5a10k', '10a20k', 'acima20k', 'naosei')),
  dor_principal TEXT NOT NULL CHECK (dor_principal IN ('nao_sobra', 'mistura_dinheiro', 'esquece_contas', 'nao_sabe_lucro', 'comecando')),
  saldo_inicial DECIMAL(12, 2) DEFAULT 0,
  prolabore_definido DECIMAL(12, 2) DEFAULT 0,
  data_inicio DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: fornecedores
-- =====================================================
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT,
  contato TEXT,
  telefone TEXT,
  email TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: lancamentos
-- =====================================================
CREATE TABLE IF NOT EXISTS lancamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao TEXT NOT NULL,
  valor DECIMAL(12, 2) NOT NULL,
  categoria TEXT NOT NULL,
  data DATE NOT NULL,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: contas (a pagar/receber)
-- =====================================================
CREATE TABLE IF NOT EXISTS contas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao TEXT NOT NULL,
  valor DECIMAL(12, 2) NOT NULL,
  categoria TEXT NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  recorrente BOOLEAN DEFAULT FALSE,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: retiradas_prolabore
-- =====================================================
CREATE TABLE IF NOT EXISTS retiradas_prolabore (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  valor DECIMAL(12, 2) NOT NULL,
  data DATE NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: configuracoes
-- =====================================================
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID UNIQUE NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  xai_api_key TEXT,
  alerta_dias_antes INTEGER DEFAULT 3,
  notificacoes_push BOOLEAN DEFAULT TRUE,
  dia_resumo_semanal INTEGER DEFAULT 1, -- 0=domingo, 1=segunda, 6=sábado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa ON lancamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos(data);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON lancamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_contas_empresa ON contas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_vencimento ON contas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_status ON contas(status);
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa ON fornecedores(empresa_id);

-- =====================================================
-- FUNÇÃO: Atualizar updated_at automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_empresas_updated_at ON empresas;
CREATE TRIGGER update_empresas_updated_at
    BEFORE UPDATE ON empresas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracoes_updated_at ON configuracoes;
CREATE TRIGGER update_configuracoes_updated_at
    BEFORE UPDATE ON configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNÇÃO: Atualizar status de contas atrasadas
-- =====================================================
CREATE OR REPLACE FUNCTION atualizar_contas_atrasadas()
RETURNS void AS $$
BEGIN
    UPDATE contas 
    SET status = 'atrasado'
    WHERE status = 'pendente' 
    AND data_vencimento < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE retiradas_prolabore ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Políticas para USUARIOS
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON usuarios FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem criar seu perfil"
  ON usuarios FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu perfil"
  ON usuarios FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para EMPRESAS
CREATE POLICY "Usuários podem ver suas empresas"
  ON empresas FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem criar empresas"
  ON empresas FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas empresas"
  ON empresas FOR UPDATE
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem deletar suas empresas"
  ON empresas FOR DELETE
  USING (usuario_id = auth.uid());

-- Políticas para LANCAMENTOS
CREATE POLICY "Usuários podem ver lançamentos de suas empresas"
  ON lancamentos FOR SELECT
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem criar lançamentos em suas empresas"
  ON lancamentos FOR INSERT
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem atualizar lançamentos de suas empresas"
  ON lancamentos FOR UPDATE
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem deletar lançamentos de suas empresas"
  ON lancamentos FOR DELETE
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

-- Políticas para CONTAS
CREATE POLICY "Usuários podem ver contas de suas empresas"
  ON contas FOR SELECT
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem criar contas em suas empresas"
  ON contas FOR INSERT
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem atualizar contas de suas empresas"
  ON contas FOR UPDATE
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem deletar contas de suas empresas"
  ON contas FOR DELETE
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

-- Políticas para FORNECEDORES
CREATE POLICY "Usuários podem ver fornecedores de suas empresas"
  ON fornecedores FOR SELECT
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem criar fornecedores em suas empresas"
  ON fornecedores FOR INSERT
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem atualizar fornecedores de suas empresas"
  ON fornecedores FOR UPDATE
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem deletar fornecedores de suas empresas"
  ON fornecedores FOR DELETE
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

-- Políticas para RETIRADAS_PROLABORE
CREATE POLICY "Usuários podem ver retiradas de suas empresas"
  ON retiradas_prolabore FOR SELECT
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem criar retiradas em suas empresas"
  ON retiradas_prolabore FOR INSERT
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem atualizar retiradas de suas empresas"
  ON retiradas_prolabore FOR UPDATE
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem deletar retiradas de suas empresas"
  ON retiradas_prolabore FOR DELETE
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

-- Políticas para CONFIGURACOES
CREATE POLICY "Usuários podem ver configurações de suas empresas"
  ON configuracoes FOR SELECT
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem criar configurações em suas empresas"
  ON configuracoes FOR INSERT
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

CREATE POLICY "Usuários podem atualizar configurações de suas empresas"
  ON configuracoes FOR UPDATE
  USING (empresa_id IN (SELECT id FROM empresas WHERE usuario_id = auth.uid()));

-- =====================================================
-- COMENTÁRIOS NAS TABELAS
-- =====================================================
COMMENT ON TABLE usuarios IS 'Perfis de usuários do sistema';
COMMENT ON TABLE empresas IS 'Empresas/negócios cadastrados';
COMMENT ON TABLE lancamentos IS 'Lançamentos de entradas e saídas';
COMMENT ON TABLE contas IS 'Contas a pagar e a receber';
COMMENT ON TABLE fornecedores IS 'Cadastro de fornecedores';
COMMENT ON TABLE retiradas_prolabore IS 'Histórico de retiradas de pró-labore';
COMMENT ON TABLE configuracoes IS 'Configurações por empresa';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
