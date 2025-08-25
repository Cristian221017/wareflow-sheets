import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { supabase } from '@/integrations/supabase/client'

// Função para criar super admin disponível globalmente
const createSuperAdmin = async () => {
  try {
    console.log('🔄 Criando usuário super admin...');
    
    const { data, error } = await supabase.auth.signUp({
      email: 'Crisrd2608@gmail.com',
      password: 'Crisrd2608',
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name: 'Super Administrador'
        }
      }
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        console.log('✅ Usuário já existe. Tentando fazer login...');
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: 'Crisrd2608@gmail.com',
          password: 'Crisrd2608'
        });
        
        if (loginError) {
          console.error('❌ Erro ao fazer login:', loginError);
          return { success: false, error: loginError.message };
        } else {
          console.log('✅ Login realizado com sucesso!');
          return { success: true, message: 'Login realizado com sucesso!' };
        }
      } else {
        console.error('❌ Erro ao criar usuário:', error);
        return { success: false, error: error.message };
      }
    }

    console.log('✅ Super admin criado com sucesso!', data);
    return { success: true, message: 'Super admin criado com sucesso!' };
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    return { success: false, error: 'Erro inesperado' };
  }
};

// Disponibilizar globalmente
(window as any).createSuperAdmin = createSuperAdmin;

// Criar instância do Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
