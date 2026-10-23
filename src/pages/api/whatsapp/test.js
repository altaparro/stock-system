import { probarConexion } from '../../../lib/metaCatalog'

export const prerender = false

export async function POST({ request }) {
  let body

  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo de la petición inválido o vacío' }), {
      status: 400
    })
  }

  try {
    const catalogo = await probarConexion(body?.token, body?.catalog_id)
    return new Response(JSON.stringify({ ok: true, catalogo }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
}
