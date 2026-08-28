import { supabase } from '../../lib/supabase'

export const prerender = false

export async function GET() {
  const { data, error } = await supabase
    .from('presupuestos')
    .select('*')
    .order('fecha', { ascending: false })

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

  const items = Array.isArray(body?.items) ? body.items : []
  const subtotal = Number(body?.subtotal || 0)
  const manobraObra = Number(body?.manobra_obra || 0)
  const total = subtotal + manobraObra

  const { data, error } = await supabase
    .from('presupuestos')
    .insert([
      {
        cliente: body.cliente || '',
        cliente_dni: body.cliente_dni || null,
        telefono: body.telefono || null,
        vehiculo: body.vehiculo || '',
        patente: body.patente || null,
        manobra_obra: manobraObra,
        items,
        subtotal,
        total
      }
    ])
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify(data), { status: 201 })
}

export async function DELETE({ request }) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  const { error } = await supabase.from('presupuestos').delete().eq('id', id)

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
}
