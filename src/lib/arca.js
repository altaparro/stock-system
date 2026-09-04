import {
  Arca,
  CbteTipo,
  Concepto,
  DocTipo,
  CondicionIva
} from '@ramiidv/arca-facturacion'

// ============================================================
// Integración con ARCA (ex AFIP) para facturación electrónica.
//
// Variables de entorno (Vercel):
//   ARCA_CUIT        - CUIT sin guiones (número)
//   ARCA_CERT        - Contenido PEM del certificado X.509
//   ARCA_KEY         - Contenido PEM de la clave privada
//   ARCA_PRODUCTION  - "true" => producción, else homologación
//   ARCA_PTO_VTA     - Punto de venta (número)
// ============================================================

let instancia = null

export function getConfiguracionArca() {
  const cuit = process.env.ARCA_CUIT ? Number(process.env.ARCA_CUIT) : null
  const ptoVta = process.env.ARCA_PTO_VTA ? Number(process.env.ARCA_PTO_VTA) : null
  return {
    cuit,
    cert: process.env.ARCA_CERT,
    key: process.env.ARCA_KEY,
    production: process.env.ARCA_PRODUCTION === 'true',
    ptoVta
  }
}

export function arcaConfigurada() {
  const c = getConfiguracionArca()
  return Boolean(
    Number.isInteger(c.cuit) && c.cert && c.key && Number.isInteger(c.ptoVta)
  )
}

export function getArca() {
  if (!arcaConfigurada()) {
    throw new Error(
      'ARCA no está configurado. Definí ARCA_CUIT, ARCA_CERT, ARCA_KEY y ARCA_PTO_VTA en las variables de entorno.'
    )
  }

  const config = getConfiguracionArca()

  if (!instancia) {
    instancia = new Arca({
      cuit: config.cuit,
      cert: config.cert,
      key: config.key,
      production: config.production,
      requestTimeoutMs: 30000
    })
  }

  return instancia
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

// Traduce el tipo de documento guardado en clientes a DocTipo de ARCA.
export function docTipoDeCliente(tipo) {
  switch (String(tipo || '').toUpperCase()) {
    case 'CUIT':
      return DocTipo.CUIT
    case 'CUIL':
      return DocTipo.CUIL
    case 'PASAPORTE':
      return DocTipo.PASAPORTE
    case 'CI':
      return DocTipo.CI_EXTRANJERA
    case 'DNI':
    default:
      return DocTipo.DNI
  }
}

// Devuelve el número de documento limpio o 0 si no es válido.
export function normalizarDocNro(numero) {
  const n = String(numero || '').replace(/\D/g, '')
  return n && Number.isFinite(Number(n)) ? Number(n) : 0
}

// Convierte YYYYMMDD a YYYY-MM-DD (para la columna date de Postgres).
export function yyyymmddToIso(ymd) {
  const s = String(ymd || '')
  if (!/^\d{8}$/.test(s)) return null
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

// Fecha actual (timezone Argentina) formateada como YYYY-MM-DD.
export function fechaComprobanteHoy() {
  const hoy = Arca.formatDate(new Date())
  return yyyymmddToIso(hoy)
}

// Factura una venta ya registrada (Factura C para Monotributo).
// venta debe incluir: total, mano_obra_monto, detalle y cliente.
export async function facturarVenta(venta) {
  const arca = getArca()
  const { ptoVta } = getConfiguracionArca()

  const detalle = Array.isArray(venta.detalle) ? venta.detalle : []
  const tieneProductos = detalle.length > 0
  const tieneManoObra = Number(venta.mano_obra_monto) > 0

  const concepto =
    tieneProductos && tieneManoObra
      ? Concepto.PRODUCTOS_Y_SERVICIOS
      : tieneManoObra
        ? Concepto.SERVICIOS
        : Concepto.PRODUCTOS

  const cliente = venta.cliente
  const tieneDoc = Boolean(
    cliente?.documento_numero && normalizarDocNro(cliente.documento_numero) > 0
  )
  const docTipo = tieneDoc ? docTipoDeCliente(cliente.documento_tipo) : DocTipo.CONSUMIDOR_FINAL
  const docNro = tieneDoc ? normalizarDocNro(cliente.documento_numero) : 0

  // Factura C no discrimina IVA: el neto es el total que paga el cliente.
  const total = round2(venta.total || 0)

  const result = await arca.facturar({
    ptoVta,
    cbteTipo: CbteTipo.FACTURA_C,
    concepto,
    docTipo,
    docNro,
    condicionIva: CondicionIva.CONSUMIDOR_FINAL,
    items: [{ neto: total }]
  })

  return { result, docTipo, docNro }
}

// Genera la URL del QR oficial de ARCA para el comprobante emitido.
export function generarQR({ result, docTipo, docNro, cuit, fecha }) {
  return Arca.generateQRUrl({
    fecha,
    cuit,
    ptoVta: result.ptoVta,
    tipoCmp: result.cbteTipo,
    nroCmp: result.cbteNro,
    importe: result.importes.total,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: docTipo || DocTipo.CONSUMIDOR_FINAL,
    nroDocRec: docNro || 0,
    codAut: Number(result.cae)
  })
}