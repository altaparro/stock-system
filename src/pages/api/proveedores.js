import { supabase } from '../../lib/supabase'

export const prerender = false

export async function GET() {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .order('nombre')

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

  const { nombre, telefono, email, direccion, notas } = body

  if (!nombre || !nombre.trim()) {
    return new Response(
      JSON.stringify({ error: 'El nombre del proveedor es obligatorio' }),
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('proveedores')
    .insert([
      {
        nombre: nombre.trim(),
        telefono: telefono || null,
        email: email || null,
        direccion: direccion || null,
        notas: notas || null
      }
    ])
    .select()

  if (error) {
    if (error.code === '23505') {
      return new Response(
        JSON.stringify({ error: 'Ya existe un proveedor con ese nombre' }),
        { status: 409 }
      )
    }
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify(data), { status: 201 })
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

  const { id, nombre, telefono, email, direccion, notas } = body

  if (!id) {
    return new Response(
      JSON.stringify({ error: 'Falta el ID del proveedor' }),
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('proveedores')
    .update({
      nombre: nombre?.trim(),
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null,
      notas: notas || null
    })
    .eq('id', id)
    .select()

  if (error) {
    if (error.code === '23505') {
      return new Response(
        JSON.stringify({ error: 'Ya existe un proveedor con ese nombre' }),
        { status: 409 }
      )
    }
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify(data), { status: 200 })
}

export async function DELETE({ request }) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  const { error } = await supabase
    .from('proveedores')
    .delete()
    .eq('id', id)

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
}
