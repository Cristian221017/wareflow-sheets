-- Remove demo super admin accounts
DELETE FROM auth.users WHERE email IN ('superadmin@sistema.com', 'Crisrd2608@gmail.com');

-- Remove any profiles associated with demo accounts
DELETE FROM public.profiles WHERE email IN ('superadmin@sistema.com', 'Crisrd2608@gmail.com');

-- Remove any user roles for demo accounts
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('superadmin@sistema.com', 'Crisrd2608@gmail.com')
);