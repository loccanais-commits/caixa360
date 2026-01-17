import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

// Limites mensais
const LIMITS = {
  MAX_IA_REPORTS: 2,
  MAX_PDF_REPORTS: 5,
};

export interface ReportUsage {
  relatorios_ia_usados: number;
  relatorios_pdf_usados: number;
  limite_ia: number;
  limite_pdf: number;
  pode_gerar_ia: boolean;
  pode_gerar_pdf: boolean;
}

// GET - Verificar uso atual
export async function GET(request: NextRequest) {
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
      .select('id')
      .eq('usuario_id', user.id)
      .single();

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // Mês atual
    const mesAno = format(new Date(), 'yyyy-MM');

    // Buscar ou criar registro de uso
    let { data: usage } = await supabase
      .from('report_usage')
      .select('*')
      .eq('empresa_id', empresa.id)
      .eq('mes_ano', mesAno)
      .single();

    // Se não existe, criar
    if (!usage) {
      const { data: newUsage, error } = await supabase
        .from('report_usage')
        .insert({
          empresa_id: empresa.id,
          mes_ano: mesAno,
          relatorios_ia_usados: 0,
          relatorios_pdf_usados: 0,
        })
        .select()
        .single();

      if (error) {
        // Pode ser race condition, tentar buscar novamente
        const { data: existingUsage } = await supabase
          .from('report_usage')
          .select('*')
          .eq('empresa_id', empresa.id)
          .eq('mes_ano', mesAno)
          .single();

        usage = existingUsage || { relatorios_ia_usados: 0, relatorios_pdf_usados: 0 };
      } else {
        usage = newUsage;
      }
    }

    const response: ReportUsage = {
      relatorios_ia_usados: usage?.relatorios_ia_usados || 0,
      relatorios_pdf_usados: usage?.relatorios_pdf_usados || 0,
      limite_ia: LIMITS.MAX_IA_REPORTS,
      limite_pdf: LIMITS.MAX_PDF_REPORTS,
      pode_gerar_ia: (usage?.relatorios_ia_usados || 0) < LIMITS.MAX_IA_REPORTS,
      pode_gerar_pdf: (usage?.relatorios_pdf_usados || 0) < LIMITS.MAX_PDF_REPORTS,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erro ao verificar uso:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Incrementar uso
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { tipo } = await request.json(); // 'ia' ou 'pdf'

    if (!['ia', 'pdf'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar empresa
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id')
      .eq('usuario_id', user.id)
      .single();

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const mesAno = format(new Date(), 'yyyy-MM');

    // Buscar uso atual
    let { data: usage } = await supabase
      .from('report_usage')
      .select('*')
      .eq('empresa_id', empresa.id)
      .eq('mes_ano', mesAno)
      .single();

    // Verificar limites
    if (tipo === 'ia') {
      if ((usage?.relatorios_ia_usados || 0) >= LIMITS.MAX_IA_REPORTS) {
        return NextResponse.json({
          error: 'Limite de relatórios com IA atingido',
          message: `Você já usou ${LIMITS.MAX_IA_REPORTS} relatórios com IA este mês.`,
        }, { status: 429 });
      }
    } else {
      if ((usage?.relatorios_pdf_usados || 0) >= LIMITS.MAX_PDF_REPORTS) {
        return NextResponse.json({
          error: 'Limite de PDFs atingido',
          message: `Você já exportou ${LIMITS.MAX_PDF_REPORTS} PDFs este mês.`,
        }, { status: 429 });
      }
    }

    // Incrementar
    const campo = tipo === 'ia' ? 'relatorios_ia_usados' : 'relatorios_pdf_usados';

    if (usage) {
      // Atualizar existente
      await supabase
        .from('report_usage')
        .update({
          [campo]: (usage[campo] || 0) + 1,
        })
        .eq('id', usage.id);
    } else {
      // Criar novo
      await supabase
        .from('report_usage')
        .insert({
          empresa_id: empresa.id,
          mes_ano: mesAno,
          relatorios_ia_usados: tipo === 'ia' ? 1 : 0,
          relatorios_pdf_usados: tipo === 'pdf' ? 1 : 0,
        });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao incrementar uso:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
