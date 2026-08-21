import { supabase } from '../../lib/supabase'

export const prerender = false

export async function GET() {
  const { data, error } = await supabase
    .from('ventas')
    .select(
      '*, medio:medio_pago(nombre), detalle:venta_detalle(id, nombre_producto, codigo_producto, cantidad, precio_unitario, costo_unitario, subtotal)'
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

  const itemsValidos = items.every(
    (i) =>
      Number.isInteger(Number(i.producto_id)) &&
      Number.isInteger(Number(i.cantidad)) &&
      Number(i.cantidad) > 0
  )

  if (!Number.isInteger(medioPagoId) || items.length === 0 || !itemsValidos) {
    return new Response(
      JSON.stringify({ error: 'Datos de la venta incompletos o inválidos' }),
      { status: 400 }
    )
  }

  const { data, error } = await supabase.rpc('registrar_venta', {
    p_medio_pago_id: medioPagoId,
    p_items: items.map((i) => ({
      producto_id: Number(i.producto_id),
      cantidad: Number(i.cantidad)
    }))
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }

  return new Response(JSON.stringify(data), { status: 201 })
}
