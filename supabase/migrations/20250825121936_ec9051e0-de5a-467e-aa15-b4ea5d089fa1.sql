-- Resolver problemas de segurança detectados pelo linter

-- Habilitar proteção contra senhas vazadas
UPDATE auth.config SET leaked_password_protection = true;

-- Ajustar configurações de segurança para OTP
UPDATE auth.config SET 
  sms_otp_exp = 600,  -- 10 minutos (padrão recomendado)
  email_otp_exp = 3600; -- 1 hora (padrão recomendado)