-- ============================================================
-- Migración: configuración general + sincronización de catálogo
-- WhatsApp Business (Meta Commerce)
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- 1. Tabla de configuración general (clave-valor)
create table if not exists public.settings (
  clave text primary key,
  valor text
);

alter table public.settings enable row level security;

drop policy if exists "settings_select" on public.settings;
create policy "settings_select"
  on public.settings for select
  using (true);

drop policy if exists "settings_insert" on public.settings;
create policy "settings_insert"
  on public.settings for insert
  with check (true);

drop policy if exists "settings_update" on public.settings;
create policy "settings_update"
  on public.settings for update
  using (true)
  with check (true);

drop policy if exists "settings_delete" on public.settings;
create policy "settings_delete"
  on public.settings for delete
  using (true);

-- 2. Cola de sincronización con el catálogo de Meta
create table if not exists public.sync_cola (
  id bigint generated always as identity primary key,
  producto_id bigint not null,
  accion text not null check (accion in ('CREATE','UPDATE','DELETE')),
  estado text not null default 'pendiente' check (estado in ('pendiente','listo','error')),
  intentos integer not null default 0,
  ultimo_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sync_cola_estado_idx on public.sync_cola (estado);

alter table public.sync_cola enable row level security;

drop policy if exists "sync_cola_select" on public.sync_cola;
create policy "sync_cola_select"
  on public.sync_cola for select
  using (true);

drop policy if exists "sync_cola_insert" on public.sync_cola;
create policy "sync_cola_insert"
  on public.sync_cola for insert
  with check (true);

drop policy if exists "sync_cola_update" on public.sync_cola;
create policy "sync_cola_update"
  on public.sync_cola for update
  using (true)
  with check (true);

drop policy if exists "sync_cola_delete" on public.sync_cola;
create policy "sync_cola_delete"
  on public.sync_cola for delete
  using (true);

-- 3. Flag de sincronización en productos (1 = presente en el catálogo de Meta)
alter table public.productos
  add column if not exists wa_sincronizado integer not null default 0;

-- 4. Semilla: nombre del negocio (se usa como marca de los productos del catálogo)
insert into public.settings (clave, valor)
values ('nombre_negocio', 'Lexus autoradio')
on conflict (clave) do nothing;

insert into public.settings (clave, valor)
values ('wa_sync_auto', '0')
on conflict (clave) do nothing;
