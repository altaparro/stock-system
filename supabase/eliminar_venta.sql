-- ============================================================
-- Migración: eliminar ventas restaurado el stock
-- Ejecutar en Supabase > SQL Editor (después de cliente_venta.sql)
-- ============================================================

-- Restaura el stock de cada producto del detalle y elimina la venta.
-- El encabezado venta_detalle se borra en cascada al eliminar la venta.
create or replace function public.eliminar_venta(
  p_venta_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_total numeric(12,2) := 0;
begin
  -- Verificar que la venta exista
  perform 1 from ventas where id = p_venta_id;
  if not found then
    raise exception 'La venta % no existe', p_venta_id;
  end if;

  -- Restaurar stock por cada línea (producto_id puede ser null si fue borrado)
  for v_row in
    select producto_id, cantidad
    from venta_detalle
    where venta_id = p_venta_id
      and producto_id is not null
  loop
    update productos set stock = stock + v_row.cantidad
    where id = v_row.producto_id;
    v_total := v_total + v_row.cantidad;
  end loop;

  -- Eliminar la venta (venta_detalle se borra en cascada)
  delete from ventas where id = p_venta_id;

  return jsonb_build_object(
    'venta_id', p_venta_id,
    'stock_restaurado', v_total
  );
end;
$$;

grant execute on function public.eliminar_venta(bigint) to anon, authenticated;
