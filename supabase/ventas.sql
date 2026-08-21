-- ============================================================
-- Migración: precios de compra, medios de pago y ventas
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- 1. Precio de compra en productos
alter table public.productos
  add column if not exists precio_compra numeric(12,2) not null default 0;

-- 2. Medios de pago
create table if not exists public.medio_pago (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  interes numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);

insert into public.medio_pago (nombre, interes) values
  ('Efectivo', 0),
  ('Transferencia', 0),
  ('Débito', 0),
  ('Crédito 1 cuota', 5),
  ('Crédito 3 cuotas', 12),
  ('Crédito 6 cuotas', 22)
on conflict (nombre) do nothing;

-- 3. Ventas (encabezado)
create table if not exists public.ventas (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  medio_pago_id bigint references public.medio_pago(id),
  total_base numeric(12,2) not null default 0,
  interes_pct numeric(5,2) not null default 0,
  total numeric(12,2) not null default 0
);

-- 4. Detalle de venta (ítems)
create table if not exists public.venta_detalle (
  id bigint generated always as identity primary key,
  venta_id bigint not null references public.ventas(id) on delete cascade,
  producto_id bigint references public.productos(id) on delete set null,
  nombre_producto text not null,
  codigo_producto text,
  cantidad int not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null,
  costo_unitario numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null
);

create index if not exists ventas_created_at_idx on public.ventas (created_at desc);
create index if not exists venta_detalle_venta_id_idx on public.venta_detalle (venta_id);

-- 5. RLS
alter table public.medio_pago enable row level security;
alter table public.ventas enable row level security;
alter table public.venta_detalle enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['medio_pago', 'ventas', 'venta_detalle'] loop
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

-- 6. Función transaccional: valida stock, registra la venta,
--    guarda el detalle y descuenta stock de forma atómica
create or replace function public.registrar_venta(p_medio_pago_id bigint, p_items jsonb)
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
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe tener al menos un producto';
  end if;

  select coalesce(interes, 0) into v_interes
  from medio_pago where id = p_medio_pago_id;

  if not found then
    raise exception 'Medio de pago inválido';
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

  -- Encabezado de la venta (con interés aplicado)
  insert into ventas (medio_pago_id, total_base, interes_pct, total)
  values (p_medio_pago_id, v_total, v_interes, round(v_total * (1 + v_interes / 100.0), 2))
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

grant execute on function public.registrar_venta(bigint, jsonb) to anon, authenticated;
