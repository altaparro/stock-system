-- ============================================================
-- Migración: facturación electrónica ARCA (ex AFIP)
-- Ejecutar en Supabase > SQL Editor (después de editar_venta.sql)
-- ============================================================

-- 1. Columnas de facturación en el encabezado de la venta
alter table public.ventas
  add column if not exists facturada boolean not null default false,
  add column if not exists cae text,
  add column if not exists cae_fecha_vto date,
  add column if not exists comprobante_tipo int,
  add column if not exists comprobante_punto_venta int,
  add column if not exists comprobante_numero int,
  add column if not exists factura_qr_url text;

create index if not exists ventas_facturada_idx on public.ventas (facturada);

-- 2. Datos de documento del cliente (necesarios para facturar)
alter table public.clientes
  add column if not exists documento_tipo text,
  add column if not exists documento_numero text;