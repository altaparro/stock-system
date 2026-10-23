import { sincronizarTodo, procesarCola } from '../../../lib/metaCatalog'

export const prerender = false

export async function POST() {
  try {
    const encolados = await sincronizarTodo()
    await procesarCola().catch(() => {})
    return new Response(JSON.stringify({ ok: true, encolados }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
}
