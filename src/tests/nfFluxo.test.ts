import { describe, test, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { solicitarNF, confirmarNF, recusarNF } from '@/lib/nfApi';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    rpc: vi.fn()
  }
}));

describe('Fluxo de NFs - Casos de Uso', () => {
  const mockUserId = 'test-user-id';
  const mockNfId = 'test-nf-id';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock do usuário autenticado
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });
  });

  describe('Caso Feliz: ARMAZENADA → SOLICITADA → CONFIRMADA', () => {
    test('deve solicitar NF com sucesso', async () => {
      // Arrange
      (supabase.rpc as any).mockResolvedValue({ error: null });

      // Act
      await solicitarNF(mockNfId);

      // Assert
      expect(supabase.rpc).toHaveBeenCalledWith('nf_solicitar', {
        p_nf_id: mockNfId,
        p_user_id: mockUserId
      });
    });

    test('deve confirmar NF solicitada com sucesso', async () => {
      // Arrange
      (supabase.rpc as any).mockResolvedValue({ error: null });

      // Act  
      await confirmarNF(mockNfId);

      // Assert
      expect(supabase.rpc).toHaveBeenCalledWith('nf_confirmar', {
        p_nf_id: mockNfId,
        p_user_id: mockUserId
      });
    });

    test('deve recusar NF solicitada com sucesso', async () => {
      // Arrange
      (supabase.rpc as any).mockResolvedValue({ error: null });

      // Act
      await recusarNF(mockNfId);

      // Assert
      expect(supabase.rpc).toHaveBeenCalledWith('nf_recusar', {
        p_nf_id: mockNfId,
        p_user_id: mockUserId
      });
    });
  });

  describe('Casos Negativos - Transições Inválidas', () => {
    test('nf_confirmar deve falhar quando status ≠ SOLICITADA', async () => {
      // Arrange - Simular erro da RPC function
      const mockError = {
        message: 'Transição inválida: só é possível CONFIRMAR quando SOLICITADA'
      };
      (supabase.rpc as any).mockResolvedValue({ error: mockError });

      // Act & Assert
      await expect(confirmarNF(mockNfId))
        .rejects
        .toThrow('Erro ao confirmar carregamento: Transição inválida: só é possível CONFIRMAR quando SOLICITADA');
    });

    test('nf_solicitar deve falhar quando status ≠ ARMAZENADA', async () => {
      // Arrange
      const mockError = {
        message: 'Transição inválida: só é possível SOLICITAR quando ARMAZENADA'
      };
      (supabase.rpc as any).mockResolvedValue({ error: mockError });

      // Act & Assert
      await expect(solicitarNF(mockNfId))
        .rejects
        .toThrow('Erro ao solicitar carregamento: Transição inválida: só é possível SOLICITAR quando ARMAZENADA');
    });

    test('nf_recusar deve falhar quando status ≠ SOLICITADA', async () => {
      // Arrange
      const mockError = {
        message: 'Transição inválida: só é possível RECUSAR quando SOLICITADA'
      };
      (supabase.rpc as any).mockResolvedValue({ error: mockError });

      // Act & Assert  
      await expect(recusarNF(mockNfId))
        .rejects
        .toThrow('Erro ao recusar carregamento: Transição inválida: só é possível RECUSAR quando SOLICITADA');
    });
  });

  describe('Autenticação', () => {
    test('deve falhar quando usuário não autenticado', async () => {
      // Arrange
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: new Error('No session')
      });

      // Act & Assert
      await expect(solicitarNF(mockNfId))
        .rejects
        .toThrow('Usuário não autenticado');
    });

    test('deve falhar quando usuário sem ID', async () => {
      // Arrange
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: null } },
        error: null
      });

      // Act & Assert
      await expect(confirmarNF(mockNfId))
        .rejects
        .toThrow('Usuário não autenticado');
    });
  });

  describe('Integração com RPC Functions', () => {
    test('deve usar apenas funções RPC para transições', async () => {
      // Arrange
      (supabase.rpc as any).mockResolvedValue({ error: null });

      // Act - Testar todas as operações
      await solicitarNF(mockNfId);
      await confirmarNF(mockNfId);  
      await recusarNF(mockNfId);

      // Assert - Verificar que apenas RPCs foram chamadas
      expect(supabase.rpc).toHaveBeenCalledTimes(3);
      expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'nf_solicitar', expect.any(Object));
      expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'nf_confirmar', expect.any(Object));
      expect(supabase.rpc).toHaveBeenNthCalledWith(3, 'nf_recusar', expect.any(Object));
    });

    test('deve passar parâmetros corretos para RPCs', async () => {
      // Arrange
      (supabase.rpc as any).mockResolvedValue({ error: null });
      const testNfId = 'specific-nf-id';

      // Act
      await solicitarNF(testNfId);

      // Assert - Verificar estrutura exata dos parâmetros
      expect(supabase.rpc).toHaveBeenCalledWith('nf_solicitar', {
        p_nf_id: testNfId,
        p_user_id: mockUserId
      });
    });
  });
});

// Teste de integração básico (comentado pois precisa de ambiente real)
/*
describe('Teste de Integração Real (E2E)', () => {
  test.skip('deve executar fluxo completo ARMAZENADA → SOLICITADA → CONFIRMADA', async () => {
    // Este teste precisa ser executado com dados reais
    // 1. Criar NF no status ARMAZENADA
    // 2. Solicitar carregamento  
    // 3. Verificar status mudou para SOLICITADA
    // 4. Confirmar carregamento
    // 5. Verificar status mudou para CONFIRMADA
  });
});
*/