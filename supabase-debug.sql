-- =====================================================
-- SCRIPT DE LIMPEZA (Execute se tiver problemas de loop)
-- =====================================================

-- Ver todos os usuários e suas empresas
SELECT 
  u.id as usuario_id,
  u.email,
  u.nome,
  e.id as empresa_id,
  e.nome as empresa_nome
FROM usuarios u
LEFT JOIN empresas e ON e.usuario_id = u.id;

-- Se precisar limpar uma empresa duplicada, rode:
-- DELETE FROM empresas WHERE id = 'UUID_DA_EMPRESA_DUPLICADA';

-- Se precisar limpar configurações órfãs:
-- DELETE FROM configuracoes WHERE empresa_id NOT IN (SELECT id FROM empresas);

-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Se RLS não estiver habilitado em alguma tabela, execute:
-- ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE retiradas_prolabore ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
