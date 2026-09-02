-- ============================================================
-- Migración: tabla proveedores
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- 1. Tabla de proveedores
create table if not exists public.proveedores (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  telefono text,
  email text,
  direccion text,
  notas text,
  created_at timestamptz not null default now()
);

-- 2. RLS: mismas políticas que el resto de las tablas públicas
alter table public.proveedores enable row level security;

drop policy if exists "proveedores_select" on public.proveedores;
create policy "proveedores_select"
  on public.proveedores for select
  using (true);

drop policy if exists "proveedores_insert" on public.proveedores;
create policy "proveedores_insert"
  on public.proveedores for insert
  with check (true);

drop policy if exists "proveedores_update" on public.proveedores;
create policy "proveedores_update"
  on public.proveedores for update
  using (true)
  with check (true);

drop policy if exists "proveedores_delete" on public.proveedores;
create policy "proveedores_delete"
  on public.proveedores for delete
  using (true);
