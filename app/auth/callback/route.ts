import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createServerSupabaseClient()
    
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (user && !error) {
      // Verificar se usuário já existe na tabela usuarios
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingUser) {
        // Criar perfil do usuário
        await supabase.from('usuarios').insert({
          id: user.id,
          email: user.email,
          nome: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
        })
      }

      // Verificar se tem empresa cadastrada
      const { data: empresa } = await supabase
        .from('empresas')
        .select('id')
        .eq('usuario_id', user.id)
        .single()

      if (!empresa) {
        // Redirecionar para onboarding
        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
      }

      // Redirecionar para dashboard
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
    }
  }

  // Em caso de erro, voltar para login
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
