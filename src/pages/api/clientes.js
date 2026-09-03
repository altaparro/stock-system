import { supabase } from '../../lib/supabase'

export const prerender = false

export async function GET() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*, autos(*)')
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

  const { nombre, telefono, email } = body

  if (!nombre || !nombre.trim()) {
    return new Response(
      JSON.stringify({ error: 'El nombre del cliente es obligatorio' }),
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert([
      {
        nombre: nombre.trim(),
        telefono: telefono || null,
        email: email || null
      }
    ])
    .select()

  if (error) {
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

  const { id, nombre, telefono, email } = body

  if (!id) {
    return new Response(
      JSON.stringify({ error: 'Falta el ID del cliente' }),
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('clientes')
    .update({
      nombre: nombre?.trim(),
      telefono: telefono || null,
      email: email || null
    })
    .eq('id', id)
    .select()

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify(data), { status: 200 })
}

export async function DELETE({ request }) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  const { error } = await supabase.from('clientes').delete().eq('id', id)

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
}
