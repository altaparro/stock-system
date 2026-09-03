-- ============================================================
-- Migración: asociar cliente a ventas
-- Ejecutar en Supabase > SQL Editor (después de clientes.sql y mano_obra.sql)
-- ============================================================

-- 1. Agregar cliente_id al encabezado de la venta (opcional, on delete set null)
alter table public.ventas
  add column if not exists cliente_id bigint references public.clientes(id) on delete set null;

create index if not exists ventas_cliente_id_idx on public.ventas (cliente_id);

-- 2. Reemplazar la función para aceptar cliente opcional
create or replace function public.registrar_venta(
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
  v_venta_id bigint;
  v_item jsonb;
  v_pid bigint;
  v_cant int;
  v_stock int;
  v_precio numeric(12,2);
  v_costo numeric(12,2);
  v_total numeric(12,2) := 0;
  v_interes numeric(5,2);
  v_monto_obra numeric(12,2) := coalesce(p_mano_obra_monto, 0);
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    p_items := '[]'::jsonb;
  end if;

  if jsonb_array_length(p_items) = 0 and v_monto_obra <= 0 then
    raise exception 'La venta debe tener al menos un producto o mano de obra';
  end if;

  select coalesce(interes, 0) into v_interes
  from medio_pago where id = p_medio_pago_id;

  if not found then
    raise exception 'Medio de pago inválido';
  end if;

  if p_cliente_id is not null then
    perform 1 from clientes where id = p_cliente_id;
    if not found then
      raise exception 'Cliente inválido';
    end if;
  end if;

  -- Validar stock y calcular el total base
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid := (v_item->>'producto_id')::bigint;
    v_cant := coalesce((v_item->>'cantidad')::int, 0);

    if v_cant <= 0 then
      raise exception 'Cantidad inválida para el producto %', v_pid;
    end if;

    select stock, precio_venta, coalesce(precio_compra, 0)
    into v_stock, v_precio, v_costo
    from productos where id = v_pid;

    if not found then
      raise exception 'El producto % no existe', v_pid;
    end if;

    if v_stock < v_cant then
      raise exception 'Stock insuficiente para el producto %', v_pid;
    end if;

    v_total := v_total + v_precio * v_cant;
  end loop;

  -- Sumar mano de obra al total base
  v_total := v_total + v_monto_obra;

  -- Encabezado de la venta (con interés aplicado)
  insert into ventas (medio_pago_id, total_base, interes_pct, total, mano_obra_descripcion, mano_obra_monto, cliente_id)
  values (p_medio_pago_id, v_total, v_interes, round(v_total * (1 + v_interes / 100.0), 2), p_mano_obra_descripcion, v_monto_obra, p_cliente_id)
  returning id into v_venta_id;

  -- Detalle + descuento de stock
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid := (v_item->>'producto_id')::bigint;
    v_cant := (v_item->>'cantidad')::int;

    insert into venta_detalle (
      venta_id, producto_id, nombre_producto, codigo_producto,
      cantidad, precio_unitario, costo_unitario, subtotal
    )
    select
      v_venta_id, id, nombre, codigo,
      v_cant, precio_venta, coalesce(precio_compra, 0), precio_venta * v_cant
    from productos where id = v_pid;

    update productos set stock = stock - v_cant where id = v_pid;
  end loop;

  return jsonb_build_object(
    'venta_id', v_venta_id,
    'total_base', v_total,
    'interes_pct', v_interes,
    'total', round(v_total * (1 + v_interes / 100.0), 2)
  );
end;
$$;

grant execute on function public.registrar_venta(bigint, jsonb, text, numeric, bigint) to anon, authenticated;
