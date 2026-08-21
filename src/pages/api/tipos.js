import { supabase } from '../../lib/supabase'

export const prerender = false

export async function GET() {
  const { data, error } = await supabase
    .from('tipo_producto')
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

  const nombre = typeof body?.nombre === 'string' ? body.nombre.trim() : ''

  if (!nombre) {
    return new Response(
      JSON.stringify({ error: 'El nombre del tipo es obligatorio' }),
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('tipo_producto')
    .insert([{ nombre }])
    .select()

  if (error) {
    if (error.code === '23505') {
      return new Response(
        JSON.stringify({ error: 'Ese tipo ya existe' }),
        { status: 409 }
      )
    }
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify(data), { status: 201 })
}
