import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Caixa360 - Fluxo de Caixa Inteligente',
  description: 'Organize o caixa do seu negócio em 10 minutos por dia com IA',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
