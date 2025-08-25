import { supabase } from '@/integrations/supabase/client';

/**
 * Cria o usuário super admin padrão
 */
export const createSuperAdmin = async () => {
  const adminEmail = 'Crisrd2608@gmail.com';
  const adminPassword = 'Crisrd2608';
  
  try {
    console.log('🔧 === CRIANDO USUÁRIO SUPER ADMIN ===');
    console.log(`📧 Email: ${adminEmail}`);
    
    // Primeiro, tentar fazer logout se houver usuário logado
    await supabase.auth.signOut();
    
    // Tentar fazer login primeiro para ver se já existe
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });

    if (loginData.user && !loginError) {
      console.log('✅ Super admin já existe e pode fazer login');
      
      // Verificar se tem o papel correto
      const { data: userTransportadora } = await supabase
        .from('user_transportadoras')
        .select('role')
        .eq('user_id', loginData.user.id)
        .single();
        
      if (userTransportadora?.role === 'super_admin') {
        console.log('✅ Super admin já tem o papel correto');
        await supabase.auth.signOut();
        return { success: true, message: 'Super admin já existe e está configurado corretamente' };
      } else {
        console.log('⚠️ Super admin existe mas precisa ajustar papel');
        await supabase.auth.signOut();
      }
    }

    // Se chegou aqui, precisa criar ou ajustar o usuário
    console.log('📝 Criando novo usuário super admin...');
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          name: 'Super Admin'
        },
        emailRedirectTo: `${window.location.origin}/super-admin`
      }
    });

    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        console.log('ℹ️ Usuário já existe, tentando reset de senha...');
        
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(adminEmail, {
          redirectTo: `${window.location.origin}/reset-password`
        });
        
        if (resetError) {
          console.error('❌ Erro ao enviar reset:', resetError);
          return { success: false, error: resetError.message };
        }
        
        return { 
          success: true, 
          message: 'Usuário já existe. Email de reset enviado. Use a nova senha e depois configure o papel de super_admin.' 
        };
      } else {
        console.error('❌ Erro ao criar usuário:', signUpError);
        return { success: false, error: signUpError.message };
      }
    }

    if (signUpData.user) {
      console.log('✅ Usuário super admin criado com sucesso!');
      
      // O trigger deve ter criado o perfil e associação automaticamente
      // Mas vamos garantir que tem o papel de super_admin
      console.log('🔧 Verificando papel de super admin...');
      
      // Aguardar um pouco para o trigger processar  
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verificar se foi criada a associação correta
      const { data: userTransportadora, error: checkError } = await supabase
        .from('user_transportadoras')
        .select('role, transportadora_id')
        .eq('user_id', signUpData.user.id);
        
      if (checkError) {
        console.warn('⚠️ Erro ao verificar papel:', checkError);
      } else if (userTransportadora && userTransportadora.length > 0) {
        console.log('✅ Associação criada:', userTransportadora[0]);
      } else {
        console.log('⚠️ Nenhuma associação encontrada, criando manualmente...');
        
        // Buscar primeira transportadora
        const { data: transportadora } = await supabase
          .from('transportadoras')
          .select('id')
          .limit(1)
          .single();
          
        if (transportadora) {
          const { error: insertError } = await supabase
            .from('user_transportadoras')
            .insert([{
              user_id: signUpData.user.id,
              transportadora_id: transportadora.id,
              role: 'super_admin',
              is_active: true
            }]);
            
          if (insertError) {
            console.error('❌ Erro ao criar associação:', insertError);
          } else {
            console.log('✅ Associação de super admin criada manualmente');
          }
        }
      }
      
      await supabase.auth.signOut();
      return { 
        success: true, 
        message: 'Super admin criado com sucesso! Pode fazer login com as credenciais fornecidas.' 
      };
    }

    return { success: false, error: 'Falha ao criar usuário' };

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return { success: false, error: error.message };
  }
};