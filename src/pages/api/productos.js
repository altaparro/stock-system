import { supabase } from '../../lib/supabase'
import { encolar, procesarCola } from '../../lib/metaCatalog'

export const prerender = false

async function sincronizarWhatsApp(productoId, accion) {
  try {
    await encolar(productoId, accion)
    await procesarCola()
  } catch (err) {
    console.error('[whatsapp] sincronización de producto:', err.message)
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from('productos')
    .select('*, tipo:tipo_producto(id, nombre), proveedor:proveedores(id, nombre)')
    .order('id')

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

  const { nombre, codigo, marca, stock, precio_venta, precio_compra, tipo_producto_id, proveedor_id, imagen, visible_tienda } = body

  const { data, error } = await supabase
    .from('productos')
    .insert([
      {
        nombre,
        codigo,
        marca: marca || null,
        stock,
        precio_venta,
        precio_compra: Number(precio_compra || 0),
        tipo_producto_id: tipo_producto_id || null,
        proveedor_id: proveedor_id || null,
        imagen: imagen || null,
        visible_tienda: !!visible_tienda
      }
    ])
    .select()

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  if (data?.[0]?.id) {
    await sincronizarWhatsApp(data[0].id, 'CREATE')
  }

  return new Response(JSON.stringify(data), { status: 201 })
}

export async function DELETE({ request }) {
  const url = new URL(request.url)
  const id = Number(url.searchParams.get('id'))

  // Se encola antes de borrar: encolar() lee wa_sincronizado de la fila
  // para decidir si corresponde enviar el DELETE al catálogo de Meta.
  try {
    await encolar(id, 'DELETE')
  } catch (err) {
    console.error('[whatsapp] encolar DELETE:', err.message)
  }

  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id)

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  try {
    await procesarCola()
  } catch (err) {
    console.error('[whatsapp] procesar cola:', err.message)
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
}

export async function PUT({ request }) {
  let body

  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Cuerpo de la petición inválido o vacío' }),
      { status: 400 }
    )
  }

  const { id, nombre, codigo, marca, stock, precio_venta, precio_compra, tipo_producto_id, proveedor_id, imagen, visible_tienda } = body

  const { data, error } = await supabase
    .from('productos')
    .update({
      nombre,
      codigo,
      marca: marca || null,
      stock,
      precio_venta,
      precio_compra: Number(precio_compra || 0),
      tipo_producto_id: tipo_producto_id || null,
      proveedor_id: proveedor_id || null,
      imagen: imagen || null,
      visible_tienda: !!visible_tienda
    })
    .eq('id', id)
    .select()

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  if (data?.[0]?.id) {
    await sincronizarWhatsApp(data[0].id, 'UPDATE')
  }

  return new Response(JSON.stringify(data), { status: 200 })
}
