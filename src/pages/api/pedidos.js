import { supabase } from '../../lib/supabase'

export const prerender = false

export async function GET() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, detalle:pedido_detalle(*), cliente:clientes(id, nombre, telefono)')
    .order('created_at', { ascending: false })

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

  const id = Number(body?.id)
  const accion = String(body?.accion || '')

  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'ID de pedido inválido' }), { status: 400 })
  }

  if (accion === 'confirmar') {
    const medioPagoId = Number(body?.medio_pago_id)

    if (!Number.isInteger(medioPagoId)) {
      return new Response(JSON.stringify({ error: 'Seleccioná un medio de pago' }), {
        status: 400
      })
    }

    // confirmar_pedido valida que esté pendiente, llama a registrar_venta
    // (descuenta stock y crea la venta) y recién ahí marca el estado.
    const { data, error } = await supabase.rpc('confirmar_pedido', {
      p_pedido_id: id,
      p_medio_pago_id: medioPagoId
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    }

    return new Response(JSON.stringify(data), { status: 200 })
  }

  if (accion === 'entregado' || accion === 'cancelado') {
    // Estado de origen según la transición permitida
    const estadosOrigen = accion === 'entregado' ? ['confirmado'] : ['pendiente', 'confirmado']

    const { data: pedido, error: errLeer } = await supabase
      .from('pedidos')
      .select('id, estado, venta_id')
      .eq('id', id)
      .maybeSingle()

    if (errLeer) {
      return new Response(JSON.stringify({ error: errLeer.message }), { status: 500 })
    }

    if (!pedido) {
      return new Response(JSON.stringify({ error: 'El pedido no existe' }), { status: 404 })
    }

    if (!estadosOrigen.includes(pedido.estado)) {
      return new Response(
        JSON.stringify({ error: `No se puede pasar de "${pedido.estado}" a "${accion}"` }),
        { status: 400 }
      )
    }

    // Cancelar un pedido ya confirmado anula la venta y restaura el stock
    if (accion === 'cancelado' && pedido.venta_id) {
      const { error: errVenta } = await supabase.rpc('eliminar_venta', {
        p_venta_id: pedido.venta_id
      })

      if (errVenta) {
        return new Response(JSON.stringify({ error: errVenta.message }), { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('pedidos')
      .update({
        estado: accion,
        venta_id: accion === 'cancelado' ? null : pedido.venta_id
      })
      .eq('id', id)
      .eq('estado', pedido.estado)
      .select()
      .maybeSingle()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify(data), { status: 200 })
  }

  return new Response(JSON.stringify({ error: 'Acción no válida' }), { status: 400 })
}

export async function DELETE({ request }) {
  const url = new URL(request.url)
  const id = Number(url.searchParams.get('id'))

  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'ID de pedido inválido' }), { status: 400 })
  }

  const { data: pedido, error: errLeer } = await supabase
    .from('pedidos')
    .select('id, estado')
    .eq('id', id)
    .maybeSingle()

  if (errLeer) {
    return new Response(JSON.stringify({ error: errLeer.message }), { status: 500 })
  }

  if (!pedido) {
    return new Response(JSON.stringify({ error: 'El pedido no existe' }), { status: 404 })
  }

  // Si tiene venta asociada hay que cancelarlo antes (para reversar la venta)
  if (pedido.estado === 'confirmado' || pedido.estado === 'entregado') {
    return new Response(
      JSON.stringify({ error: 'Cancelá el pedido antes de eliminarlo' }),
      { status: 409 }
    )
  }

  const { error } = await supabase.from('pedidos').delete().eq('id', id)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
}
