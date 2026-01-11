'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Autenticando...');

  useEffect(() => {
    const supabase = createClient();
    
    const handleCallback = async () => {
      try {
        // Processar hash da URL (para OAuth)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        
        if (accessToken) {
          // Se tem token no hash, definir sessão
          const refreshToken = hashParams.get('refresh_token') || '';
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }

        // Aguardar um pouco para a sessão ser processada
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erro ao obter sessão:', sessionError);
          setStatus('Erro na autenticação...');
          setTimeout(() => router.push('/'), 2000);
          return;
        }

        if (!session?.user) {
          setStatus('Sessão não encontrada...');
          setTimeout(() => router.push('/'), 1500);
          return;
        }

        setStatus('Verificando perfil...');

        // Verificar se usuário já existe na tabela usuarios
        const { data: existingUser, error: userError } = await supabase
          .from('usuarios')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Erro ao verificar usuário:', userError);
        }

        if (!existingUser) {
          // Criar perfil do usuário
          const { error: insertError } = await supabase.from('usuarios').insert({
            id: session.user.id,
            email: session.user.email,
            nome: session.user.user_metadata?.full_name || 
                  session.user.user_metadata?.name || 
                  session.user.email?.split('@')[0] || 
                  'Usuário',
          });
          
          if (insertError) {
            console.error('Erro ao criar usuário:', insertError);
          }
        }

        setStatus('Verificando empresa...');

        // Verificar se tem empresa cadastrada
        const { data: empresa, error: empresaError } = await supabase
          .from('empresas')
          .select('id')
          .eq('usuario_id', session.user.id)
          .maybeSingle();

        if (empresaError && empresaError.code !== 'PGRST116') {
          console.error('Erro ao verificar empresa:', empresaError);
        }

        if (!empresa) {
          setStatus('Redirecionando para cadastro...');
          router.push('/onboarding');
        } else {
          setStatus('Redirecionando para dashboard...');
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Erro no callback:', error);
        setStatus('Erro inesperado...');
        setTimeout(() => router.push('/'), 2000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
      <div className="text-center">
        <img src="/logo.png" alt="Caixa360" className="w-16 h-16 mx-auto mb-4 rounded-2xl animate-pulse" />
        <p className="text-neutral-600">{status}</p>
      </div>
    </div>
  );
}
