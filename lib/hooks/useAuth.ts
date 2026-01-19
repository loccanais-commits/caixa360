'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export function useAuth(requireAuth = true) {
  const router = useRouter();

  // Memoizar cliente Supabase para evitar recriação a cada render
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Memoizar função de redirecionamento
  const handleRedirect = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  useEffect(() => {
    // Flag para evitar updates após unmount
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);

          // Verificar se tem empresa (completou onboarding)
          if (requireAuth) {
            const { data: empresa } = await supabase
              .from('empresas')
              .select('id')
              .eq('usuario_id', session.user.id)
              .single();

            if (!isMounted) return;

            if (!empresa && typeof window !== 'undefined' && window.location.pathname !== '/onboarding') {
              handleRedirect('/onboarding');
              return;
            }
          }
        } else if (requireAuth) {
          handleRedirect('/');
          return;
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          handleRedirect('/');
        } else if (session?.user) {
          setUser(session.user);
        }
      }
    );

    // Cleanup function
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, requireAuth, handleRedirect]);

  return { user, loading };
}
