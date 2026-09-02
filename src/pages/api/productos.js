import { supabase } from '../../lib/supabase'

export const prerender = false

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

  const { nombre, codigo, marca, stock, precio_venta, precio_compra, tipo_producto_id, proveedor_id } = body

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
        proveedor_id: proveedor_id || null
      }
    ])
    .select()

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify(data), { status: 201 })
}

export async function DELETE({ request }) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id)

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
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

  const { id, nombre, codigo, marca, stock, precio_venta, precio_compra, tipo_producto_id, proveedor_id } = body

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
      proveedor_id: proveedor_id || null
    })
    .eq('id', id)
    .select()

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify(data), { status: 200 })
}
