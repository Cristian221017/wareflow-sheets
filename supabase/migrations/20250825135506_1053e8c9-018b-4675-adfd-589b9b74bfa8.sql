-- Remove demo super admin accounts from auth.users
DELETE FROM auth.users WHERE email IN ('superadmin@sistema.com', 'Crisrd2608@gmail.com');

-- Remove any profiles associated with demo accounts
DELETE FROM public.profiles WHERE email IN ('superadmin@sistema.com', 'Crisrd2608@gmail.com');