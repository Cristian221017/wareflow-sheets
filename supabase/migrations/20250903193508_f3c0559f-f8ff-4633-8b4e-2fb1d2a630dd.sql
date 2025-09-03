-- Criar função para calcular métricas de SLA e performance
CREATE OR REPLACE FUNCTION public.get_dashboard_sla_metrics()
RETURNS TABLE(
  user_type text,
  transportadora_id uuid,
  cliente_id uuid,
  tempo_medio_entrega_horas numeric,
  sla_cumprimento_percent numeric,
  entregas_no_prazo bigint,
  entregas_atrasadas bigint,
  mercadorias_em_atraso bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_transportadora_id uuid;
  v_cliente_id uuid;
  v_user_type text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Determinar se é transportadora ou cliente
  SELECT ut.transportadora_id, ut.role 
  INTO v_transportadora_id, v_user_type
  FROM user_transportadoras ut
  WHERE ut.user_id = v_user_id AND ut.is_active = true
  LIMIT 1;
  
  IF v_transportadora_id IS NOT NULL THEN
    v_user_type := 'transportadora';
  ELSE
    -- É cliente
    SELECT c.id, c.transportadora_id 
    INTO v_cliente_id, v_transportadora_id
    FROM clientes c
    JOIN profiles p ON p.email = c.email
    WHERE p.user_id = v_user_id AND c.status = 'ativo'
    LIMIT 1;
    
    IF v_cliente_id IS NULL THEN
      RAISE EXCEPTION 'Cliente não encontrado para este usuário';
    END IF;
    
    v_user_type := 'cliente';
  END IF;
  
  RETURN QUERY
  WITH entrega_stats AS (
    SELECT 
      -- Tempo médio de entrega em horas (da data_embarque até data_entrega)
      COALESCE(AVG(
        CASE 
          WHEN nf.data_entrega IS NOT NULL AND nf.data_embarque IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (nf.data_entrega - nf.data_embarque)) / 3600 
        END
      ), 0) as tempo_medio_horas,
      
      -- Entregas no prazo (considerando 7 dias como SLA padrão)
      COUNT(
        CASE 
          WHEN nf.data_entrega IS NOT NULL AND nf.data_embarque IS NOT NULL
               AND nf.data_entrega <= nf.data_embarque + INTERVAL '7 days'
          THEN 1 
        END
      ) as entregas_no_prazo,
      
      -- Entregas atrasadas
      COUNT(
        CASE 
          WHEN nf.data_entrega IS NOT NULL AND nf.data_embarque IS NOT NULL
               AND nf.data_entrega > nf.data_embarque + INTERVAL '7 days'
          THEN 1 
        END
      ) as entregas_atrasadas,
      
      -- Mercadorias em atraso (em viagem há mais de 7 dias)
      COUNT(
        CASE 
          WHEN nf.status_separacao = 'em_viagem' 
               AND nf.data_embarque IS NOT NULL
               AND nf.data_embarque < CURRENT_TIMESTAMP - INTERVAL '7 days'
          THEN 1 
        END
      ) as mercadorias_em_atraso
    FROM notas_fiscais nf
    WHERE 
      (v_user_type = 'transportadora' AND nf.transportadora_id = v_transportadora_id) OR
      (v_user_type = 'cliente' AND nf.cliente_id = v_cliente_id)
    AND nf.created_at >= CURRENT_DATE - INTERVAL '30 days' -- Últimos 30 dias
  )
  SELECT 
    v_user_type,
    v_transportadora_id,
    v_cliente_id,
    ROUND(es.tempo_medio_horas, 1) as tempo_medio_entrega_horas,
    CASE 
      WHEN (es.entregas_no_prazo + es.entregas_atrasadas) > 0 
      THEN ROUND((es.entregas_no_prazo::numeric / (es.entregas_no_prazo + es.entregas_atrasadas)) * 100, 1)
      ELSE 0 
    END as sla_cumprimento_percent,
    es.entregas_no_prazo,
    es.entregas_atrasadas,
    es.mercadorias_em_atraso
  FROM entrega_stats es;
END;
$function$;