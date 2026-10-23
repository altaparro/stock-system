import { obtenerConfig, setSetting } from '../../../lib/metaCatalog'

export const prerender = false

export async function GET() {
  try {
    const config = await obtenerConfig()
    return new Response(JSON.stringify(config), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function PUT({ request }) {
  let body

  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo de la petición inválido o vacío' }), {
      status: 400
    })
  }

  try {
    await setSetting('wa_token', body?.token ?? '')
    await setSetting('wa_catalog_id', body?.catalog_id ?? '')
    await setSetting('wa_sync_auto', body?.sync_auto ? '1' : '0')
    if (body?.nombre_negocio !== undefined) {
      await setSetting('nombre_negocio', body.nombre_negocio)
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
