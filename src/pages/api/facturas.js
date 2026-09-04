import { supabase } from '../../lib/supabase'
import {
  arcaConfigurada,
  getConfiguracionArca,
  facturarVenta,
  generarQR,
  fechaComprobanteHoy,
  yyyymmddToIso
} from '../../lib/arca'

export const prerender = false

export async function GET() {
  const config = getConfiguracionArca()
  return new Response(
    JSON.stringify({
      configurado: arcaConfigurada(),
      cuit: config.cuit,
      produccion: config.production,
      puntoVenta: config.ptoVta
    }),
    { status: 200 }
  )
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

  const ventaId = Number(body?.venta_id)
  if (!Number.isInteger(ventaId)) {
    return new Response(JSON.stringify({ error: 'ID de venta inválido' }), {
      status: 400
    })
  }

  if (!arcaConfigurada()) {
    return new Response(
      JSON.stringify({
        error:
          'ARCA no está configurado en el servidor. Revisá las variables de entorno.'
      }),
      { status: 500 }
    )
  }

  const { data: venta, error: errVenta } = await supabase
    .from('ventas')
    .select(
      '*, cliente:clientes(id, nombre, documento_tipo, documento_numero), detalle:venta_detalle(producto_id, cantidad)'
    )
    .eq('id', ventaId)
    .maybeSingle()

  if (errVenta) {
    return new Response(JSON.stringify({ error: errVenta.message }), {
      status: 500
    })
  }

  if (!venta) {
    return new Response(JSON.stringify({ error: 'Venta no encontrada' }), {
      status: 404
    })
  }

  if (venta.facturada) {
    return new Response(
      JSON.stringify({ error: 'Esta venta ya fue facturada' }),
      { status: 400 }
    )
  }

  try {
    const { result, docTipo, docNro } = await facturarVenta(venta)

    if (!result.aprobada) {
      const msg =
        result.observaciones
          ?.map((o) => `[${o.code}] ${o.msg}`)
          .join(' ') || 'ARCA rechazó la comprobación'
      return new Response(JSON.stringify({ error: msg }), { status: 400 })
    }

    const cuit = getConfiguracionArca().cuit
    const qrUrl = generarQR({
      result,
      docTipo,
      docNro,
      cuit,
      fecha: fechaComprobanteHoy()
    })

    const { error: errUpd } = await supabase
      .from('ventas')
      .update({
        facturada: true,
        cae: result.cae,
        cae_fecha_vto: yyyymmddToIso(result.caeVencimiento),
        comprobante_tipo: result.cbteTipo,
        comprobante_punto_venta: result.ptoVta,
        comprobante_numero: result.cbteNro,
        factura_qr_url: qrUrl
      })
      .eq('id', ventaId)

    if (errUpd) {
      return new Response(JSON.stringify({ error: errUpd.message }), {
        status: 500
      })
    }

    return new Response(
      JSON.stringify({
        venta_id: ventaId,
        cae: result.cae,
        caeVencimiento: result.caeVencimiento,
        cbteNro: result.cbteNro,
        ptoVta: result.ptoVta,
        total: result.importes.total,
        qrUrl
      }),
      { status: 200 }
    )
  } catch (err) {
    console.error('Error al facturar la venta', ventaId, err)
    const msg =
      err?.message || err?.errors?.map((e) => e.msg).join(', ') || 'Error al facturar con ARCA'
    return new Response(JSON.stringify({ error: msg }), { status: 400 })
  }
}