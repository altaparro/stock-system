import { reintentarErrores, procesarCola } from '../../../lib/metaCatalog'

export const prerender = false

export async function POST() {
  try {
    const reintentados = await reintentarErrores()
    await procesarCola().catch(() => {})
    return new Response(JSON.stringify({ ok: true, reintentados }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
}
