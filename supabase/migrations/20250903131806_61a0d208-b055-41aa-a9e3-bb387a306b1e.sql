-- Adicionar novos status ao enum separacao_status
ALTER TYPE separacao_status ADD VALUE IF NOT EXISTS 'em_viagem';
ALTER TYPE separacao_status ADD VALUE IF NOT EXISTS 'entregue';