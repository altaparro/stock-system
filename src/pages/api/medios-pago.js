import { supabase } from '../../lib/supabase'

export const prerender = false

export async function GET() {
  const { data, error } = await supabase
    .from('medio_pago')
    .select('*')
    .order('interes')
    .order('nombre')

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify(data), { status: 200 })
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

  const items = Array.isArray(body?.items) ? body.items : null

  if (!items || !items.every((i) => Number.isInteger(Number(i.id)))) {
    return new Response(JSON.stringify({ error: 'Datos de interés inválidos' }), { status: 400 })
  }

  const filas = items.map((i) => ({
    id: Number(i.id),
    interes: Number(i.interes) || 0
  }))

  const { error } = await supabase
    .from('medio_pago')
    .upsert(filas, { onConflict: 'id' })

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  const { data, error: errListar } = await supabase
    .from('medio_pago')
    .select('*')
    .order('interes')
    .order('nombre')

  if (errListar) {
    return new Response(JSON.stringify({ error: errListar }), { status: 500 })
  }

  return new Response(JSON.stringify(data), { status: 200 })
}
