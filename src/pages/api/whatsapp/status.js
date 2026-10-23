import { estadoCola, procesarCola } from '../../../lib/metaCatalog'

export const prerender = false

export async function GET() {
  try {
    // La cola se procesa por disparo (no hay proceso persistente en serverless):
    // mientras la pantalla de Configuración consulté el estado cada pocos
    // segundos, se drenan los pendientes y los reintentos.
    await procesarCola().catch(() => {})
    const estado = await estadoCola()
    return new Response(JSON.stringify(estado), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
