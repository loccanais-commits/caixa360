import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Rotas públicas - não precisa de autenticação
  const publicRoutes = ['/', '/auth/callback']
  
  if (publicRoutes.includes(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  // A verificação de autenticação será feita no client-side pelos componentes
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
