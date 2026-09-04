import { supabase } from '../../lib/supabase'

export const prerender = false

export async function GET() {
  const { data, error } = await supabase
    .from('ventas')
    .select(
      '*, medio:medio_pago(nombre), cliente:clientes(nombre), detalle:venta_detalle(id, nombre_producto, codigo_producto, cantidad, precio_unitario, costo_unitario, subtotal)'
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify(data), { status: 200 })
}

export async function POST({ request }) {
  let body

  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Cuerpo de la petición inválido o vacío' }),
      { status: 400 }
    )
  }

  const medioPagoId = Number(body?.medio_pago_id)
  const items = Array.isArray(body?.items) ? body.items : []
  const manoObraDesc = body?.mano_obra_descripcion || null
  const manoObraMonto = Number(body?.mano_obra_monto) || 0
  const clienteId = body?.cliente_id ? Number(body.cliente_id) : null

  const itemsValidos = items.every(
    (i) =>
      Number.isInteger(Number(i.producto_id)) &&
      Number.isInteger(Number(i.cantidad)) &&
      Number(i.cantidad) > 0
  )

  if (
    !Number.isInteger(medioPagoId) ||
    (!itemsValidos && manoObraMonto <= 0)
  ) {
    return new Response(
      JSON.stringify({ error: 'Datos de la venta incompletos o inválidos' }),
      { status: 400 }
    )
  }

  const itemsNorm = items.map((i) => ({
    producto_id: Number(i.producto_id),
    cantidad: Number(i.cantidad)
  }))

  if (body?.editar) {
    // Edición: editar_venta restaura el stock original, elimina la venta vieja
    // y crea la nueva (revalidando stock) de forma atómica. Si falla por stock
    // insuficiente, la venta original queda intacta.
    const ventaId = Number(body.venta_id)
    if (!Number.isInteger(ventaId)) {
      return new Response(JSON.stringify({ error: 'ID de venta inválido' }), {
        status: 400
      })
    }

    const { data: editada, error: errEditar } = await supabase.rpc('editar_venta', {
      p_venta_id: ventaId,
      p_medio_pago_id: medioPagoId,
      p_items: itemsNorm,
      p_mano_obra_descripcion: manoObraDesc,
      p_mano_obra_monto: manoObraMonto,
      p_cliente_id: clienteId
    })

    if (errEditar) {
      return new Response(JSON.stringify({ error: errEditar.message }), { status: 400 })
    }

    return new Response(JSON.stringify(editada), { status: 200 })
  }

  const { data, error } = await supabase.rpc('registrar_venta', {
    p_medio_pago_id: medioPagoId,
    p_items: itemsNorm,
    p_mano_obra_descripcion: manoObraDesc,
    p_mano_obra_monto: manoObraMonto,
    p_cliente_id: clienteId
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }

  return new Response(JSON.stringify(data), { status: 201 })
}

export async function DELETE({ request }) {
  const url = new URL(request.url)
  const id = Number(url.searchParams.get('id'))

  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'ID de venta inválido' }), {
      status: 400
    })
  }

  // Restaura el stock del detalle y elimina la venta de forma atómica
  const { data, error } = await supabase.rpc('eliminar_venta', { p_venta_id: id })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
