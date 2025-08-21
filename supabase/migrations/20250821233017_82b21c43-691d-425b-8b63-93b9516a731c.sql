-- Limpar completamente enum e RPC functions relacionadas ao fluxo de NFs
-- que podem ter sobrevivido das implementações anteriores

-- Verificar se existem funções RPC relacionadas ao fluxo e removê-las
DROP FUNCTION IF EXISTS public.nf_solicitar(text);
DROP FUNCTION IF EXISTS public.nf_confirmar(text, text);  
DROP FUNCTION IF EXISTS public.nf_recusar(text, text);

-- Verificar se existe enum nf_status e removê-lo
DROP TYPE IF EXISTS public.nf_status;

-- Comentário: Limpeza final de qualquer vestígio de enum ou funções RPC 
-- relacionadas ao fluxo de NFs que foi completamente removido.