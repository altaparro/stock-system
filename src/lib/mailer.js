import nodemailer from 'nodemailer'
import QRCode from 'qrcode'

// ============================================================
// Envío de la factura por email al cliente (Nodemailer + SMTP).
//
// Variables de entorno (Vercel):
//   SMTP_HOST  - Servidor SMTP (ej: smtp.gmail.com)
//   SMTP_PORT  - Puerto (587 por defecto, STARTTLS)
//   SMTP_USER  - Usuario / email de la cuenta
//   SMTP_PASS  - Contraseña o Clave de aplicación
//   SMTP_FROM  - Remitente visible (por defecto SMTP_USER)
// ============================================================

let configCache = null
let transporte = null

export function getConfigMail() {
  if (!configCache) {
    configCache = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM || process.env.SMTP_USER
    }
  }
  return configCache
}

export function mailConfigurado() {
  const c = getConfigMail()
  return Boolean(c.host && c.user && c.pass)
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (m) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[m]
  })
}

function fmtPesos(n) {
  return Number(n ?? 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  })
}

export function fmtComprobanteMail(ptoVta, numero) {
  const pv = String(ptoVta || 0).padStart(4, '0')
  const n = String(numero || 0).padStart(8, '0')
  return `${pv}-${n}`
}

function fmtCaeVto(ymd) {
  const s = String(ymd || '')
  if (s.length !== 8) return s
  return `${s.slice(6)}/${s.slice(4, 6)}/${s.slice(0, 4)}`
}

export function armarHtmlFactura({ venta, factura, qrDataUrl }) {
  const cliente = venta.cliente
  const detalle = Array.isArray(venta.detalle) ? venta.detalle : []
  const comprobante = fmtComprobanteMail(factura.ptoVta, factura.cbteNro)

  const filasItems = detalle
    .map((d) => {
      const nombre = esc(d.nombre_producto || 'Producto')
      const cod = d.codigo_producto
        ? `<div style="color:#64748b;font-size:12px">${esc(d.codigo_producto)}</div>`
        : ''
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0">
          ${nombre}${cod}
          <div style="color:#64748b;font-size:12px">Cantidad: ${Number(d.cantidad)}</div>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap">
          ${fmtPesos(d.subtotal ?? d.precio_unitario * d.cantidad)}
        </td>
      </tr>`
    })
    .join('')

  const filaManoObra =
    Number(venta.mano_obra_monto) > 0
      ? `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #e2e8f0">
            Mano de obra
            <div style="color:#64748b;font-size:12px">${esc(venta.mano_obra_descripcion || '')}</div>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap">
            ${fmtPesos(venta.mano_obra_monto)}
          </td>
        </tr>`
      : ''

  const qrHtml = qrDataUrl
    ? `<div style="text-align:center;margin:20px 0">
        <img src="${qrDataUrl}" alt="Código QR AFIP" width="220" height="220" style="width:220px;height:220px" />
      </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.1)">
          <tr>
            <td style="background:#ea580c;color:#ffffff;padding:20px 28px">
              <div style="font-size:18px;font-weight:bold">Comprobante electrónico</div>
              <div style="font-size:13px;opacity:0.9;margin-top:2px">Factura C ${comprobante}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px">
              <div style="font-size:14px;margin-bottom:16px">
                ${esc(cliente?.nombre || 'Consumidor Final')}
                ${
                  cliente?.documento_numero
                    ? `<div style="color:#64748b;font-size:13px;margin-top:2px">${esc(
                        cliente.documento_tipo
                      )} ${esc(cliente.documento_numero)}</div>`
                    : ''
                }
              </div>

              <table cellpadding="0" cellspacing="0" width="100%" style="font-size:14px">
                ${filasItems}
                ${filaManoObra}
                <tr>
                  <td style="padding:10px 0;font-size:16px;font-weight:bold">Total</td>
                  <td style="padding:10px 0;font-size:16px;font-weight:bold;text-align:right;white-space:nowrap">
                    ${fmtPesos(factura.total)}
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" width="100%" style="margin-top:16px;font-size:13px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
                <tr><td style="padding:8px 12px;color:#64748b">CAE</td>
                    <td style="padding:8px 12px;text-align:right;font-family:monospace;font-weight:bold">${esc(factura.cae)}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b">Vencimiento del CAE</td>
                    <td style="padding:8px 12px;text-align:right;font-family:monospace;font-weight:bold">${fmtCaeVto(factura.caeVencimiento)}</td></tr>
              </table>

              ${qrHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;text-align:center">
              Este comprobante fue emitido de manera electrónica y puede validarse escaneando el código QR en el sitio de ARCA/AFIP.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function crearTransporte() {
  if (transporte) return transporte
  const c = getConfigMail()
  transporte = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.port === 465,
    auth: { user: c.user, pass: c.pass }
  })
  return transporte
}

// Envía la factura al email del cliente. Nunca lanza: devuelve el estado.
export async function enviarFacturaPorEmail({ venta, factura }) {
  const cliente = venta?.cliente
  const destino = String(cliente?.email || '').trim()

  if (!destino) {
    return { estado: 'sin_email' }
  }

  if (!mailConfigurado()) {
    return { estado: 'no_configurado' }
  }

  let qrDataUrl = ''
  try {
    qrDataUrl = await QRCode.toDataURL(factura.qrUrl, { width: 220, margin: 1 })
  } catch (qrErr) {
    console.error('Error al generar el QR para el mail', qrErr)
  }

  const html = armarHtmlFactura({ venta, factura, qrDataUrl })

  const c = getConfigMail()

  const info = await crearTransporte().sendMail({
    from: `"Sistema" <${c.from}>`,
    to: destino,
    subject: `Tu factura ${fmtComprobanteMail(factura.ptoVta, factura.cbteNro)}`,
    text: `Adjuntamos tu comprobante ${fmtComprobanteMail(
      factura.ptoVta,
      factura.cbteNro
    )} por ${fmtPesos(factura.total)}. CAE ${factura.cae}.`,
    html
  })

  return { estado: 'enviado', destino, messageId: info.messageId }
}