-- ============================================================
-- Migración: FK proveedor en productos
-- Ejecutar DESPUÉS de proveedores.sql
-- ============================================================

-- 1. Nueva columna FK en productos
alter table public.productos
  add column if not exists proveedor_id bigint references public.proveedores(id) on delete set null;

-- 2. Índice para búsquedas por proveedor
create index if not exists productos_proveedor_id_idx on public.productos (proveedor_id);
