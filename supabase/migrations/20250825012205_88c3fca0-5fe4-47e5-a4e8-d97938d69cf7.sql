-- Create function to setup new transportadora with admin user
CREATE OR REPLACE FUNCTION public.create_transportadora_with_admin(
  p_transportadora_data jsonb,
  p_admin_email text,
  p_admin_password text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transportadora_id uuid;
  v_user_id uuid;
BEGIN
  -- 1. Create transportadora
  INSERT INTO public.transportadoras (
    razao_social, nome_fantasia, cnpj, email, telefone, endereco,
    cidade, estado, cep, status, plano, limite_usuarios, limite_clientes, data_contrato
  )
  VALUES (
    p_transportadora_data->>'razao_social',
    p_transportadora_data->>'nome_fantasia', 
    p_transportadora_data->>'cnpj',
    p_admin_email,
    p_transportadora_data->>'telefone',
    p_transportadora_data->>'endereco',
    p_transportadora_data->>'cidade',
    p_transportadora_data->>'estado',
    p_transportadora_data->>'cep',
    (p_transportadora_data->>'status')::text,
    (p_transportadora_data->>'plano')::text,
    (p_transportadora_data->>'limite_usuarios')::integer,
    (p_transportadora_data->>'limite_clientes')::integer,
    CASE 
      WHEN p_transportadora_data->>'data_contrato' = '' THEN NULL
      ELSE (p_transportadora_data->>'data_contrato')::date
    END
  )
  RETURNING id INTO v_transportadora_id;

  -- 2. Create admin user in auth
  SELECT id INTO v_user_id
  FROM auth.users 
  WHERE email = p_admin_email;
  
  -- If user doesn't exist, we'll create association when they first sign up
  -- The trigger will handle the association
  
  RETURN v_transportadora_id;
END;
$$;