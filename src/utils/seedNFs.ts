/**
 * Script utilitário para popular dados de exemplo das NFs
 * Execute este script para criar dados de teste rapidamente
 */

import { supabase } from '@/integrations/supabase/client';

export async function seedExampleNFs() {
  console.log('🌱 Iniciando seed de NFs de exemplo...');
  
  try {
    // Limpar NFs de desenvolvimento existentes
    const { error: deleteError } = await supabase
      .from('notas_fiscais')
      .delete()
      .like('numero_nf', 'DEV-%');
    
    if (deleteError) {
      console.warn('Aviso ao limpar dados existentes:', deleteError);
    }

    // Buscar IDs da transportadora e cliente demo
    const { data: transportadora } = await supabase
      .from('transportadoras')
      .select('id')
      .eq('cnpj', '12.345.678/0001-90')
      .single();
      
    const { data: cliente } = await supabase
      .from('clientes')  
      .select('id')
      .eq('cnpj', '98.765.432/0001-10')
      .single();

    if (!transportadora || !cliente) {
      console.error('❌ Transportadora ou cliente demo não encontrado. Execute a migration primeiro.');
      return false;
    }

    // Dados das NFs de exemplo
    const nfsExample = [
      // ARMAZENADAS (4)
      { numero_nf: 'DEV-001', produto: 'Equipamentos Eletrônicos', status: 'ARMAZENADA', quantidade: 50, peso: 250.5 },
      { numero_nf: 'DEV-002', produto: 'Materiais de Construção', status: 'ARMAZENADA', quantidade: 100, peso: 1500.0 },
      { numero_nf: 'DEV-003', produto: 'Produtos Químicos', status: 'ARMAZENADA', quantidade: 25, peso: 500.0 },
      { numero_nf: 'DEV-004', produto: 'Peças Automotivas', status: 'ARMAZENADA', quantidade: 75, peso: 800.0 },
      
      // SOLICITADAS (3)
      { numero_nf: 'DEV-005', produto: 'Componentes Industriais', status: 'SOLICITADA', quantidade: 40, peso: 600.0 },
      { numero_nf: 'DEV-006', produto: 'Equipamentos Médicos', status: 'SOLICITADA', quantidade: 20, peso: 300.0 },
      { numero_nf: 'DEV-007', produto: 'Produtos Farmacêuticos', status: 'SOLICITADA', quantidade: 15, peso: 150.0 },
      
      // CONFIRMADAS (3)
      { numero_nf: 'DEV-008', produto: 'Materiais Têxteis', status: 'CONFIRMADA', quantidade: 200, peso: 400.0 },
      { numero_nf: 'DEV-009', produto: 'Produtos Alimentícios', status: 'CONFIRMADA', quantidade: 300, peso: 900.0 },
      { numero_nf: 'DEV-010', produto: 'Equipamentos de Segurança', status: 'CONFIRMADA', quantidade: 60, peso: 350.0 }
    ];

    // Inserir NFs
    const nfsToInsert = nfsExample.map((nf, index) => ({
      numero_nf: nf.numero_nf,
      numero_pedido: `PED-${String(index + 1).padStart(3, '0')}`,
      ordem_compra: `OC-${String(index + 1).padStart(3, '0')}`,
      cliente_id: cliente.id,
      transportadora_id: transportadora.id,
      fornecedor: `Fornecedor ${String.fromCharCode(65 + index)}`, // Alpha, Beta, Gamma...
      produto: nf.produto,
      quantidade: nf.quantidade,
      peso: nf.peso,
      volume: Math.round(nf.peso / 100 * 10) / 10, // Volume estimado
      localizacao: `${String.fromCharCode(65 + index)}${index + 1}-${String.fromCharCode(66 + index)}${index + 2}-${String.fromCharCode(67 + index)}${index + 3}`,
      data_recebimento: new Date(2024, 0, 15 + index).toISOString().split('T')[0],
      status: nf.status,
      cnpj_fornecedor: `${String(11 + index).padStart(2, '0')}.${String(222 + index * 111).padStart(3, '0')}.${String(333 + index * 111).padStart(3, '0')}/0001-${String(44 + index * 11).padStart(2, '0')}`
    }));

    const { data, error } = await supabase
      .from('notas_fiscais')
      .insert(nfsToInsert)
      .select();

    if (error) {
      console.error('❌ Erro ao inserir NFs:', error);
      return false;
    }

    console.log(`✅ Seed concluído! ${data?.length || 0} NFs criadas:`);
    
    // Relatório por status
    const statusCount = nfsExample.reduce((acc, nf) => {
      acc[nf.status] = (acc[nf.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   📊 ${status}: ${count} NFs`);
    });
    
    console.log('\n🎯 Acesse /debug/fluxo-nfs para testar a interface!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro durante seed:', error);
    return false;
  }
}

// Executar seed se chamado diretamente
if (typeof window !== 'undefined' && window.location.pathname.includes('debug')) {
  // Disponível globalmente para debug
  (window as any).seedExampleNFs = seedExampleNFs;
}