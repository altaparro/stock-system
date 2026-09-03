import { supabase } from '../../lib/supabase'

export const prerender = false

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

  const { cliente_id, patente, marca, modelo, anio, color } = body

  if (!cliente_id) {
    return new Response(
      JSON.stringify({ error: 'Falta el cliente del auto' }),
      { status: 400 }
    )
  }

  if (!patente || !patente.trim()) {
    return new Response(
      JSON.stringify({ error: 'La patente es obligatoria' }),
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('autos')
    .insert([
      {
        cliente_id,
        patente: patente.trim(),
        marca: marca || null,
        modelo: modelo || null,
        anio: anio || null,
        color: color || null
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

  const { error } = await supabase.from('autos').delete().eq('id', id)

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
}
