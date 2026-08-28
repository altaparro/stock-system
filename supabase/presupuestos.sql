-- ============================================================
-- Migración: tabla presupuestos
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- 1. Secuencia para numerar presupuestos automáticamente
create sequence if not exists public.presupuestos_numero_seq;

-- 2. Tabla de presupuestos
create table if not exists public.presupuestos (
  id bigint generated always as identity primary key,
  numero bigint not null default nextval('public.presupuestos_numero_seq') unique,
  fecha timestamptz not null default now(),
  cliente text not null default '',
  cliente_dni text,
  telefono text,
  vehiculo text not null default '',
  patente text,
  manobra_obra numeric(12,2) not null default 0,
  items jsonb not null default '[]',
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  estado text not null default 'presupuesto',
  created_at timestamptz not null default now()
);

create index if not exists presupuestos_fecha_idx on public.presupuestos (fecha desc);

-- 3. RLS
alter table public.presupuestos enable row level security;

drop policy if exists "presupuestos_select" on public.presupuestos;
create policy "presupuestos_select"
  on public.presupuestos for select
  using (true);

drop policy if exists "presupuestos_insert" on public.presupuestos;
create policy "presupuestos_insert"
  on public.presupuestos for insert
  with check (true);

drop policy if exists "presupuestos_update" on public.presupuestos;
create policy "presupuestos_update"
  on public.presupuestos for update
  using (true)
  with check (true);

drop policy if exists "presupuestos_delete" on public.presupuestos;
create policy "presupuestos_delete"
  on public.presupuestos for delete
  using (true);
