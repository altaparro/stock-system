-- ============================================================
-- Crear usuario de acceso al sistema (Supabase Auth)
-- Ejecutar en Supabase > SQL Editor
--
-- Email:     lexusaudiolp@gmail.com
-- Contraseña: tripero10
-- ============================================================

-- 1. Habilitar pgcrypto (para encriptar la contraseña en bcrypt)
create extension if not exists pgcrypto;

-- 2. Crear el usuario en auth.users con la contraseña hasheada (bcrypt)
--    El id es estable para poder re-ejecutar el script sin duplicar.
--    La contraseña queda guardada de forma segura (hasheada).
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  is_sso_user
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'lexusaudiolp@gmail.com',
  crypt('tripero10', gen_salt('bf')),
  now(),
  now(),
  '',
  '',
  '',
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  false
)
on conflict (id) do nothing;

-- 3. Registrar la identidad (necesaria para que Supabase reconozca el login por email)
insert into auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'lexusaudiolp@gmail.com',
  'email',
  jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'lexusaudiolp@gmail.com'),
  now(),
  now(),
  now()
)
on conflict (provider_id, provider) do nothing;

-- Verificación: el usuario debe aparecer en la lista
select id, email, email_confirmed_at
from auth.users
where email = 'lexusaudiolp@gmail.com';
