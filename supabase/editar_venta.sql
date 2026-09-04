-- ============================================================
-- Migración: editar ventas restaurando stock y recreando la venta
-- Ejecutar en Supabase > SQL Editor (después de eliminar_venta.sql)
-- ============================================================

-- Edita una venta de forma atómica:
-- 1. Restaura el stock del detalle original y elimina la venta
-- 2. Crea la nueva venta con registrar_venta (revalida stock)
-- Si no hay stock suficiente para la nueva venta, toda la operación
-- se revierte y la venta original queda intacta.
create or replace function public.editar_venta(
  p_venta_id bigint,
  p_medio_pago_id bigint,
  p_items jsonb,
  p_mano_obra_descripcion text default null,
  p_mano_obra_monto numeric(12,2) default 0,
  p_cliente_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_nueva jsonb;
begin
  -- Verificar que la venta exista
  perform 1 from ventas where id = p_venta_id;
  if not found then
    raise exception 'La venta % no existe', p_venta_id;
  end if;

  -- 1. Restaurar stock del detalle original
  for v_row in
    select producto_id, cantidad
    from venta_detalle
    where venta_id = p_venta_id
      and producto_id is not null
  loop
    update productos set stock = stock + v_row.cantidad
    where id = v_row.producto_id;
  end loop;

  -- Eliminar la venta original (venta_detalle se borra en cascada)
  delete from ventas where id = p_venta_id;

  -- 2. Crear la nueva venta (revalida stock; si falla, se revierte todo)
  select public.registrar_venta(
    p_medio_pago_id,
    p_items,
    p_mano_obra_descripcion,
    p_mano_obra_monto,
    p_cliente_id
  ) into v_nueva;

  return jsonb_build_object(
    'venta_id', (v_nueva->>'venta_id')::bigint,
    'total_base', (v_nueva->>'total_base')::numeric,
    'interes_pct', (v_nueva->>'interes_pct')::numeric,
    'total', (v_nueva->>'total')::numeric
  );
end;
$$;

grant execute on function public.editar_venta(bigint, bigint, jsonb, text, numeric, bigint) to anon, authenticated;