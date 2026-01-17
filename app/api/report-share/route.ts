import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// POST - Criar link compartilhável
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar empresa
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, nome')
      .eq('usuario_id', user.id)
      .single();

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const { reportData, periodoInicio, periodoFim, incluiAnaliseIA } = await request.json();

    if (!reportData || !periodoInicio || !periodoFim) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Criar registro de compartilhamento
    const { data: share, error } = await supabase
      .from('report_shares')
      .insert({
        empresa_id: empresa.id,
        report_data: {
          ...reportData,
          empresaNome: empresa.nome,
        },
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        inclui_analise_ia: incluiAnaliseIA || false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao criar compartilhamento:', error);
      return NextResponse.json({ error: 'Erro ao criar link' }, { status: 500 });
    }

    // Gerar URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://caixa360.com.br';
    const shareUrl = `${baseUrl}/relatorio/share/${share.id}`;

    return NextResponse.json({
      success: true,
      shareId: share.id,
      shareUrl,
      expiresIn: '7 dias',
    });

  } catch (error) {
    console.error('Erro ao compartilhar relatório:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// GET - Buscar relatório compartilhado (público)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('id');

    if (!shareId) {
      return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Buscar relatório (RLS permite leitura pública de não-expirados)
    const { data: share, error } = await supabase
      .from('report_shares')
      .select('*')
      .eq('id', shareId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !share) {
      return NextResponse.json({
        error: 'Relatório não encontrado ou expirado'
      }, { status: 404 });
    }

    // Incrementar contador de acessos
    await supabase
      .from('report_shares')
      .update({
        accessed_count: (share.accessed_count || 0) + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', shareId);

    return NextResponse.json({
      success: true,
      report: share.report_data,
      periodoInicio: share.periodo_inicio,
      periodoFim: share.periodo_fim,
      incluiAnaliseIA: share.inclui_analise_ia,
      createdAt: share.created_at,
      expiresAt: share.expires_at,
    });

  } catch (error) {
    console.error('Erro ao buscar relatório:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
