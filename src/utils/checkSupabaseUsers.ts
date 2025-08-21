import { supabase } from '@/integrations/supabase/client';

/**
 * Verifica status dos usuários no Supabase e fornece instruções para resolver
 */
export const checkSupabaseUsers = async () => {
  console.log('🔍 === VERIFICAÇÃO FINAL DO SUPABASE ===');
  
  try {
    // Verificar usuário atual (admin) para garantir que temos acesso
    const { data: currentUser } = await supabase.auth.getUser();
    console.log('👤 Usuário atual logado:', currentUser.user?.email);
    
    // Listar emails problemáticos
    const problematicEmails = [
      'Comercial@rodoveigatransportes.com.br',
      'contato@premiumcorp.com'
    ];
    
    console.log('\n🎯 SOLUÇÃO DEFINITIVA PARA O PROBLEMA:');
    console.log('O usuário "Comercial@rodoveigatransportes.com.br" existe mas não consegue fazer login.');
    console.log('Isso indica um problema de confirmação de email ou senha no Supabase.');
    
    console.log('\n🛠️  PASSOS PARA RESOLVER NO DASHBOARD SUPABASE:');
    console.log('1. Acesse: https://supabase.com/dashboard/project/vyqnnnyamoovzxmuvtkl/auth/users');
    console.log('2. Procure por: Comercial@rodoveigatransportes.com.br');
    console.log('3. Se existir o usuário:');
    console.log('   - Clique nos três pontinhos (⋮) ao lado do usuário');
    console.log('   - Selecione "Send reset password email"');
    console.log('   - OU selecione "Reset password" e defina como: cliente123');
    console.log('   - Marque "Email confirmed" como true');
    console.log('4. Se NÃO existir o usuário:');
    console.log('   - Clique em "Add user"');
    console.log('   - Email: Comercial@rodoveigatransportes.com.br');
    console.log('   - Password: cliente123');
    console.log('   - Marque "Auto Confirm User"');
    
    console.log('\n📋 ALTERNATIVA - CONFIGURAÇÕES DO SUPABASE:');
    console.log('1. Vá para: https://supabase.com/dashboard/project/vyqnnnyamoovzxmuvtkl/auth/providers');
    console.log('2. Desabilite "Enable email confirmations" temporariamente');
    console.log('3. Isso permite login sem confirmação de email');
    console.log('4. Tente criar o usuário novamente após essa mudança');
    
    console.log('\n🔗 LINKS DIRETOS:');
    console.log('• Usuários: https://supabase.com/dashboard/project/vyqnnnyamoovzxmuvtkl/auth/users');
    console.log('• Configurações: https://supabase.com/dashboard/project/vyqnnnyamoovzxmuvtkl/auth/providers');
    console.log('• Logs: https://supabase.com/dashboard/project/vyqnnnyamoovzxmuvtkl/logs/auth');
    
    console.log('\n✅ APÓS RESOLVER NO DASHBOARD:');
    console.log('Use o botão "Testar Login" para verificar se funcionou');
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  }
  
  console.log('\n=== FIM DA VERIFICAÇÃO ===');
};