-- ============================================================
-- Migración: columna marca en productos
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

alter table public.productos
  add column if not exists marca text;

-- Índice para agrupar/filtrar por marca
create index if not exists productos_marca_idx on public.productos (marca);
