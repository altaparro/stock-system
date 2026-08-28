-- ============================================================
-- LIMPIEZA DE DATOS
-- Ejecutar en Supabase > SQL Editor
-- Elimina: presupuestos, ventas (y detalle), productos y tipos.
-- Conserva: usuario (auth) y medios de pago.
-- ============================================================

-- 1. Presupuestos
truncate table public.presupuestos restart identity cascade;

-- 2. Ventas y detalle (cascade borra el detalle por FK)
truncate table public.ventas restart identity cascade;

-- 3. Productos (y reinicia el contador de id)
truncate table public.productos restart identity cascade;

-- 4. Tipos de producto (los productos ya quedaron vacíos por el truncate de arriba)
truncate table public.tipo_producto restart identity cascade;
