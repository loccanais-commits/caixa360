'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export function useAuth(requireAuth = true) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        
        // Verificar se tem empresa (completou onboarding)
        if (requireAuth) {
          const { data: empresa } = await supabase
            .from('empresas')
            .select('id')
            .eq('usuario_id', session.user.id)
            .single();
          
          if (!empresa && window.location.pathname !== '/onboarding') {
            router.push('/onboarding');
            return;
          }
        }
      } else if (requireAuth) {
        router.push('/');
        return;
      }
      
      setLoading(false);
    };

    checkAuth();

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/');
        } else if (session?.user) {
          setUser(session.user);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase, requireAuth]);

  return { user, loading };
}
