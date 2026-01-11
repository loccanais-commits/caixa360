'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Card } from '@/components/ui';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const supabase = createClient();

  // Verificar se já está logado
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: empresa } = await supabase
          .from('empresas')
          .select('id')
          .eq('usuario_id', session.user.id)
          .single();
        
        if (empresa) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      } else {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router, supabase]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (isLogin) {
      // Login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        window.location.href = '/dashboard';
      }
    } else {
      // Cadastro
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: nome,
          },
        },
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Criar perfil do usuário
        await supabase.from('usuarios').insert({
          id: data.user.id,
          email: email,
          nome: nome,
        });
        
        setMessage('Cadastro realizado! Verifique seu email para confirmar.');
      }
    }

    setLoading(false);
  };

  // Enquanto verifica autenticação, mostra loading
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="Caixa360" className="w-16 h-16 mx-auto mb-4 rounded-2xl animate-pulse" />
          <p className="text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Caixa360" className="w-20 h-20 mx-auto mb-4 rounded-2xl" />
          <h1 className="text-3xl font-bold gradient-text">Caixa360</h1>
          <p className="text-neutral-500 mt-2">
            Fluxo de caixa inteligente para seu negócio
          </p>
        </div>

        <Card className="shadow-xl">
          {/* Tabs */}
          <div className="flex mb-6 bg-neutral-100 rounded-xl p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                isLogin 
                  ? 'bg-white text-neutral-900 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                !isLogin 
                  ? 'bg-white text-neutral-900 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              Criar conta
            </button>
          </div>

          {/* Erro/Mensagem */}
          {error && (
            <div className="mb-4 p-3 bg-saida-light text-saida-dark text-sm rounded-xl">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-entrada-light text-entrada-dark text-sm rounded-xl">
              {message}
            </div>
          )}

          {/* Google Login */}
          <Button
            variant="outline"
            className="w-full mb-4"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar com Google
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-neutral-500">ou</span>
            </div>
          </div>

          {/* Form Email */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <Input
                label="Seu nome"
                placeholder="Como podemos te chamar?"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            )}
            
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isLogin ? (
                'Entrar'
              ) : (
                'Criar minha conta'
              )}
            </Button>
          </form>

          {isLogin && (
            <p className="text-center text-sm text-neutral-500 mt-4">
              <button className="text-primary-600 hover:text-primary-700">
                Esqueci minha senha
              </button>
            </p>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-neutral-400 mt-8">
          Ao criar uma conta, você concorda com nossos{' '}
          <a href="#" className="text-primary-600 hover:underline">Termos de Uso</a>
          {' '}e{' '}
          <a href="#" className="text-primary-600 hover:underline">Política de Privacidade</a>
        </p>
      </div>
    </div>
  );
}
