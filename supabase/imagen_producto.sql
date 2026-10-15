-- ============================================================
-- Migración: columna imagen en productos
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

alter table public.productos
  add column if not exists imagen text;

-- Índice para búsquedas por imagen (opcional, si se filtra por productos con/sin imagen)
create index if not exists productos_imagen_idx on public.productos (imagen);