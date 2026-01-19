import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Obtém o usuário autenticado a partir dos cookies da requisição
 * @returns User object ou null se não autenticado
 */
export async function getAuthenticatedUser() {
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

/**
 * Verifica autenticação e retorna erro 401 se não autenticado
 * @returns { user } ou { error: NextResponse }
 */
export async function requireAuth(): Promise<{ user: any; error?: never } | { user?: never; error: NextResponse }> {
  const user = await getAuthenticatedUser()

  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }
  }

  return { user }
}

/**
 * Obtém o ID da empresa do usuário
 * @param supabase - Cliente Supabase
 * @param userId - ID do usuário
 * @returns ID da empresa ou null
 */
export async function getEmpresaByUserId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('empresas')
    .select('id')
    .eq('usuario_id', userId)
    .single()

  return data?.id || null
}

/**
 * Cria um cliente Supabase para uso em API routes
 */
export function createSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient(
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
}
