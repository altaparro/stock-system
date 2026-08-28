import { supabase } from '../../lib/supabase'

export const prerender = false

export async function GET({ request }) {
  const url = new URL(request.url)
  const desde = url.searchParams.get('desde')
  const hasta = url.searchParams.get('hasta')

  let query = supabase
    .from('ventas')
    .select(
      '*, medio:medio_pago(nombre), detalle:venta_detalle(id, nombre_producto, codigo_producto, cantidad, precio_unitario, costo_unitario, subtotal)'
    )

  if (desde) query = query.gte('created_at', desde)
  if (hasta) query = query.lte('created_at', hasta)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify(data), { status: 200 })
}
