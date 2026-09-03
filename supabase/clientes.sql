-- ============================================================
-- Migración: Clientes y sus autos
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- 1. Tabla de clientes
create table if not exists public.clientes (
  id bigint generated always as identity primary key,
  nombre text not null,
  telefono text,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists clientes_nombre_idx on public.clientes (nombre);

-- 2. Tabla de autos (1 cliente -> N autos)
create table if not exists public.autos (
  id bigint generated always as identity primary key,
  cliente_id bigint not null references public.clientes(id) on delete cascade,
  patente text not null,
  marca text,
  modelo text,
  anio text,
  color text,
  created_at timestamptz not null default now()
);

create index if not exists autos_cliente_id_idx on public.autos (cliente_id);

-- 3. RLS
alter table public.clientes enable row level security;
alter table public.autos enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['clientes', 'autos'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select using (true)', t || '_select', t);

    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('create policy %I on public.%I for insert with check (true)', t || '_insert', t);

    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update using (true) with check (true)', t || '_update', t);

    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for delete using (true)', t || '_delete', t);
  end loop;
end $$;
