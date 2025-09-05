import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { count = 1000, transportadora_id, cliente_id } = await req.json()

    // Get transportadora and cliente if not provided
    let targetTransportadora = transportadora_id
    let targetCliente = cliente_id

    if (!targetTransportadora) {
      const { data: transportadoras } = await supabaseClient
        .from('transportadoras')
        .select('id')
        .eq('status', 'ativo')
        .limit(1)

      if (!transportadoras || transportadoras.length === 0) {
        throw new Error('No transportadora found')
      }
      targetTransportadora = transportadoras[0].id
    }

    if (!targetCliente) {
      const { data: clientes } = await supabaseClient
        .from('clientes')
        .select('id')
        .eq('transportadora_id', targetTransportadora)
        .eq('status', 'ativo')
        .limit(1)

      if (!clientes || clientes.length === 0) {
        throw new Error('No cliente found for transportadora')
      }
      targetCliente = clientes[0].id
    }

    // Generate test data
    const batchSize = 100
    const batches = Math.ceil(count / batchSize)
    let totalInserted = 0

    const fornecedores = [
      'Fornecedor ABC Ltda', 'Distribuidora XYZ', 'Industria Nacional SA',
      'Comercial Brasil', 'Logistica Premium', 'Atacado Central'
    ]

    const produtos = [
      'Eletrônicos diversos', 'Roupas e calçados', 'Alimentos não perecíveis',
      'Material de construção', 'Autopeças', 'Produtos químicos',
      'Móveis e decoração', 'Medicamentos', 'Equipamentos industriais'
    ]

    const statuses = ['ARMAZENADA', 'SOLICITADA', 'CONFIRMADA']
    const separacaoStatusInicial = ['pendente', 'em_separacao', 'separacao_concluida', 'separacao_com_pendencia']
    const separacaoStatusCompleto = ['pendente', 'em_separacao', 'separacao_concluida', 'separacao_com_pendencia', 'em_viagem', 'entregue']

    for (let batch = 0; batch < batches; batch++) {
      const currentBatchSize = Math.min(batchSize, count - totalInserted)
      const nfsToInsert = []

      for (let i = 0; i < currentBatchSize; i++) {
        const nfNumber = `NF${String(Date.now() + totalInserted + i).slice(-8)}`
        const pedidoNumber = `PED${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`
        
        // Random dates within last 6 months
        const baseDate = new Date()
        baseDate.setMonth(baseDate.getMonth() - Math.floor(Math.random() * 6))
        
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
        
        // Status de separação baseado no status da NF e regras de negócio
        let randomSeparacao
        if (randomStatus === 'SOLICITADA') {
          // Solicitações pendentes: apenas separação concluída
          randomSeparacao = 'separacao_concluida'
        } else if (randomStatus === 'CONFIRMADA') {
          // Solicitações confirmadas: separação concluída, em viagem ou entregue
          const statusConfirmadas = ['separacao_concluida', 'em_viagem', 'entregue']
          randomSeparacao = statusConfirmadas[Math.floor(Math.random() * statusConfirmadas.length)]
        } else {
          // NFs armazenadas podem ter status iniciais
          randomSeparacao = separacaoStatusInicial[Math.floor(Math.random() * separacaoStatusInicial.length)]
        }
        
        nfsToInsert.push({
          numero_nf: nfNumber,
          numero_pedido: pedidoNumber,
          ordem_compra: `OC${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
          data_recebimento: baseDate.toISOString().split('T')[0],
          fornecedor: fornecedores[Math.floor(Math.random() * fornecedores.length)],
          cnpj_fornecedor: generateRandomCNPJ(),
          cliente_id: targetCliente,
          transportadora_id: targetTransportadora,
          produto: produtos[Math.floor(Math.random() * produtos.length)],
          quantidade: Math.floor(Math.random() * 1000) + 1,
          peso: parseFloat((Math.random() * 5000 + 1).toFixed(2)),
          volume: parseFloat((Math.random() * 100 + 0.1).toFixed(2)),
          localizacao: `EST${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
          status: randomStatus,
          status_separacao: randomSeparacao
        })
      }

      const { error } = await supabaseClient
        .from('notas_fiscais')
        .insert(nfsToInsert)

      if (error) {
        throw error
      }

      totalInserted += currentBatchSize
      console.log(`Inserted batch ${batch + 1}/${batches} - Total: ${totalInserted}`)
    }

    // Generate financial documents with variety
    const documentCount = Math.floor(count / 5) // 20% of NFs get financial docs
    const financialDocs = []

    const statusOptions = ['Em aberto', 'Pago', 'Vencido', 'Em análise', 'Cancelado']
    const observacoes = [
      'Transporte de carga geral',
      'Frete para entrega expressa',
      'Serviço de logística integrada',
      'Taxa de armazenagem inclusa',
      'Transporte de cargas especiais',
      'Frete com seguro total',
      'Entrega programada'
    ]

    for (let i = 0; i < documentCount; i++) {
      const cteNumber = `CTE${String(Date.now() + i).slice(-8)}`
      
      // Criar datas variadas: algumas vencidas, algumas futuras, algumas atuais
      const dueDate = new Date()
      const randomDays = Math.floor(Math.random() * 180) - 90 // -90 a +90 dias
      dueDate.setDate(dueDate.getDate() + randomDays)
      
      // Determinar status baseado na data de vencimento
      let docStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)]
      let paymentDate = null
      let paidValue = null
      
      // Se a data de vencimento já passou e não está pago, marcar como vencido
      if (dueDate < new Date() && docStatus === 'Em aberto') {
        docStatus = Math.random() > 0.5 ? 'Vencido' : 'Em aberto'
      }
      
      // Se está pago, gerar data de pagamento e valor pago
      if (docStatus === 'Pago') {
        const payDate = new Date(dueDate)
        payDate.setDate(payDate.getDate() - Math.floor(Math.random() * 30)) // Pago até 30 dias antes do vencimento
        paymentDate = payDate.toISOString().split('T')[0]
        
        const originalValue = parseFloat((Math.random() * 15000 + 500).toFixed(2))
        paidValue = Math.random() > 0.9 ? 
          parseFloat((originalValue * 0.95).toFixed(2)) : // 10% de chance de desconto
          originalValue
      }
      
      const docValue = paidValue || parseFloat((Math.random() * 15000 + 500).toFixed(2))
      
      financialDocs.push({
        transportadora_id: targetTransportadora,
        cliente_id: targetCliente,
        numero_cte: cteNumber,
        data_vencimento: dueDate.toISOString().split('T')[0],
        valor: docValue,
        status: docStatus,
        data_pagamento: paymentDate,
        valor_pago: paidValue,
        observacoes: `${observacoes[Math.floor(Math.random() * observacoes.length)]} - Teste ${i + 1}`
      })
    }

    if (financialDocs.length > 0) {
      const { error: finError } = await supabaseClient
        .from('documentos_financeiros')
        .insert(financialDocs)

      if (finError) {
        console.error('Error inserting financial docs:', finError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully generated ${totalInserted} NFs and ${financialDocs.length} financial documents`,
        data: {
          nfs_created: totalInserted,
          financial_docs_created: financialDocs.length,
          transportadora_id: targetTransportadora,
          cliente_id: targetCliente
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function generateRandomCNPJ(): string {
  const digits = []
  for (let i = 0; i < 12; i++) {
    digits.push(Math.floor(Math.random() * 10))
  }
  
  // Calculate check digits (simplified)
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const sum1 = digits.reduce((sum, digit, i) => sum + digit * weights1[i], 0)
  const check1 = sum1 % 11 < 2 ? 0 : 11 - (sum1 % 11)
  
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const sum2 = [...digits, check1].reduce((sum, digit, i) => sum + digit * weights2[i], 0)
  const check2 = sum2 % 11 < 2 ? 0 : 11 - (sum2 % 11)
  
  const fullCNPJ = [...digits, check1, check2]
  return fullCNPJ.join('').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}