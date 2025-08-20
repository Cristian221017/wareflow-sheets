import { supabase } from '@/integrations/supabase/client';

/**
 * Reseta senhas dos clientes via admin
 */
export const resetClientPasswords = async () => {
  try {
    // Lista de clientes e suas novas senhas
    const clientCredentials = [
      { email: 'Comercial@rodoveigatransportes.com.br', password: 'cliente123' },
      { email: 'contato@premiumcorp.com', password: 'cliente123' }
    ];

    console.log('Iniciando reset de senhas...');

    for (const client of clientCredentials) {
      try {
        // Tentar fazer login para verificar se funciona
        const { data, error } = await supabase.auth.signInWithPassword({
          email: client.email,
          password: client.password
        });

        if (error) {
          console.log(`❌ Login falhou para ${client.email}:`, error.message);
          
          // Se falhou, enviar email de reset
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            client.email,
            {
              redirectTo: `${window.location.origin}/cliente`
            }
          );

          if (resetError) {
            console.error(`❌ Erro ao enviar reset para ${client.email}:`, resetError);
          } else {
            console.log(`✅ Email de reset enviado para ${client.email}`);
          }
        } else {
          console.log(`✅ Login funcionando para ${client.email}`);
          // Fazer logout para não interferir
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.error(`❌ Erro ao processar ${client.email}:`, error);
      }
    }

    console.log('Processo de verificação/reset concluído!');
  } catch (error) {
    console.error('Erro geral:', error);
  }
};