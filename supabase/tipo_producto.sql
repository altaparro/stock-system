-- ============================================================
-- Migración: tabla tipo_producto + FK en productos
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- 1. Tabla de tipos de producto
create table if not exists public.tipo_producto (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  created_at timestamptz not null default now()
);

-- 2. Nueva columna FK en productos
alter table public.productos
  add column if not exists tipo_producto_id bigint references public.tipo_producto(id) on delete set null;

-- 3. Índice para búsquedas por tipo
create index if not exists productos_tipo_producto_id_idx on public.productos (tipo_producto_id);

-- 4. Tipos iniciales (editá o borrá los que no apliquen)
insert into public.tipo_producto (nombre) values
  ('Bebida'),
  ('Almacén'),
  ('Limpieza'),
  ('Perfumería'),
  ('Lácteos')
on conflict (nombre) do nothing;

-- 5. RLS: mismas políticas que el resto de las tablas públicas
alter table public.tipo_producto enable row level security;

drop policy if exists "tipo_producto_select" on public.tipo_producto;
create policy "tipo_producto_select"
  on public.tipo_producto for select
  using (true);

drop policy if exists "tipo_producto_insert" on public.tipo_producto;
create policy "tipo_producto_insert"
  on public.tipo_producto for insert
  with check (true);

drop policy if exists "tipo_producto_update" on public.tipo_producto;
create policy "tipo_producto_update"
  on public.tipo_producto for update
  using (true)
  with check (true);

drop policy if exists "tipo_producto_delete" on public.tipo_producto;
create policy "tipo_producto_delete"
  on public.tipo_producto for delete
  using (true);
