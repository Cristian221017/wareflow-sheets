-- Adicionar colunas de rastreamento de solicitação e aprovação às NFs
ALTER TABLE notas_fiscais 
ADD COLUMN requested_by uuid REFERENCES auth.users(id),
ADD COLUMN requested_at timestamp with time zone,
ADD COLUMN approved_by uuid REFERENCES auth.users(id),
ADD COLUMN approved_at timestamp with time zone;