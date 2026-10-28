import { Fragment, useEffect, useMemo, useState } from 'react'
import Nav from './Nav'
import { PaginaProtegida } from './Auth'
import { fmtPrecio } from '../lib/format'
import { coincideBusqueda } from '../lib/busqueda'

const DATOS_EMPRESA = {
  nombre: 'Lexus autoradio',
  direccion: 'Dirección 10 N° 1745, La Plata, Buenos Aires',
  telefono: 'Tel: 221-4535452',
  horarios: 'Lunes a Viernes de 9 a 16 hs · Sábados de 9 a 13 hs'
}

const claseInput =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200'

const ESTADOS = {
  pendiente: { label: 'Pendiente', clase: 'bg-amber-50 text-amber-700 ring-amber-100' },
  confirmado: { label: 'Confirmado', clase: 'bg-sky-50 text-sky-700 ring-sky-100' },
  entregado: { label: 'Entregado', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  cancelado: { label: 'Cancelado', clase: 'bg-red-50 text-red-600 ring-red-100' }
}

function BadgeEstado({ estado }) {
  const info = ESTADOS[estado] || ESTADOS.pendiente
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${info.clase}`}>
      {info.label}
    </span>
  )
}

export default function Pedidos() {
  return (
    <PaginaProtegida>
      <ContenidoPedidos />
    </PaginaProtegida>
  )
}

function ContenidoPedidos() {
  const [pedidos, setPedidos] = useState([])
  const [mediosPago, setMediosPago] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(null)

  const [confirmando, setConfirmando] = useState(null)
  const [medioPagoId, setMedioPagoId] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [imprimir, setImprimir] = useState(null)

  useEffect(() => {
    obtenerDatos()
  }, [])

  async function obtenerDatos() {
    try {
      setLoading(true)
      setError('')

      const [resPedidos, resMedios] = await Promise.all([
        fetch('/api/pedidos'),
        fetch('/api/medios-pago')
      ])

      if (!resPedidos.ok) throw new Error('Error al obtener pedidos')

      const dataPedidos = await resPedidos.json()
      const dataMedios = resMedios.ok ? await resMedios.json() : []

      setPedidos(Array.isArray(dataPedidos) ? dataPedidos : [])
      setMediosPago(Array.isArray(dataMedios) ? dataMedios : [])

      if (dataMedios.length > 0 && !medioPagoId) {
        setMedioPagoId(String(dataMedios[0].id))
      }
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function aviso(texto) {
    setMensaje(texto)
    setTimeout(() => setMensaje(''), 4000)
  }

  async function ejecutar(body, exito) {
    try {
      setProcesando(true)
      setError('')

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar el pedido')

      setConfirmando(null)
      aviso(exito)
      await obtenerDatos()
    } catch (err) {
      setError(err.message)
    } finally {
      setProcesando(false)
    }
  }

  function confirmarPedido() {
    if (!confirmando || !medioPagoId) return
    ejecutar(
      { id: confirmando.id, accion: 'confirmar', medio_pago_id: Number(medioPagoId) },
      `Pedido #${confirmando.id} confirmado y venta registrada`
    )
  }

  function cambiarEstado(pedido, accion) {
    const textos = {
      entregado: `¿Marcar el pedido #${pedido.id} como entregado?`,
      cancelado: pedido.venta_id
        ? `¿Cancelar el pedido #${pedido.id}? Se anulará la venta y se restaurará el stock.`
        : `¿Cancelar el pedido #${pedido.id}?`
    }
    if (!window.confirm(textos[accion])) return
    ejecutar({ id: pedido.id, accion }, `Pedido #${pedido.id} → ${ESTADOS[accion].label}`)
  }

  async function eliminarPedido(pedido) {
    if (!window.confirm(`¿Eliminar el pedido #${pedido.id}? Esta acción no se puede deshacer.`))
      return

    try {
      setProcesando(true)
      setError('')
      const res = await fetch(`/api/pedidos?id=${pedido.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar el pedido')
      aviso(`Pedido #${pedido.id} eliminado`)
      await obtenerDatos()
    } catch (err) {
      setError(err.message)
    } finally {
      setProcesando(false)
    }
  }

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (filtroEstado && p.estado !== filtroEstado) return false
      if (!busqueda.trim()) return true
      return coincideBusqueda(busqueda, [
        String(p.id),
        p.nombre?.toLowerCase() ?? '',
        p.telefono?.toLowerCase() ?? '',
        p.email?.toLowerCase() ?? '',
        p.notas?.toLowerCase() ?? '',
        p.direccion?.toLowerCase() ?? ''
      ])
    })
  }, [pedidos, filtroEstado, busqueda])

  const conteos = useMemo(() => {
    const c = { pendiente: 0, confirmado: 0, entregado: 0, cancelado: 0 }
    pedidos.forEach((p) => {
      if (c[p.estado] !== undefined) c[p.estado]++
    })
    return c
  }, [pedidos])

  const medioSeleccionado = mediosPago.find((m) => String(m.id) === String(medioPagoId))

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Encabezado */}
        <header className="mb-8">
          <Nav activo="pedidos" />
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-12 w-12 rounded-xl object-contain shadow-sm ring-1 ring-orange-200"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pedidos</h1>
              <p className="text-sm text-slate-500">
                Pedidos recibidos desde la tienda online
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {mensaje && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {mensaje}
          </div>
        )}

        {/* Filtros */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {[{ key: '', label: `Todos (${pedidos.length})` }, ...Object.entries(ESTADOS).map(([key, v]) => ({ key, label: `${v.label} (${conteos[key]})` }))].map(
              (f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFiltroEstado(f.key)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    filtroEstado === f.key
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              )
            )}
          </div>

          <input
            type="search"
            placeholder="Buscar por cliente, teléfono, N°..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200 sm:ml-auto sm:w-64"
          />
        </div>

        {/* Listado */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">N°</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-medium text-slate-500">
                    {pedidos.length === 0
                      ? 'Todavía no hay pedidos de la tienda.'
                      : 'No hay pedidos con esos filtros.'}
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((p) => (
                  <Fragment key={p.id}>
                    <tr className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-500">#{p.id}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(p.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {p.nombre}
                        {p.telefono && (
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            {p.telefono}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                        {fmtPrecio.format(p.total || 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BadgeEstado estado={p.estado} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAbierto(abierto === p.id ? null : p.id)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            {abierto === p.id ? 'Ocultar' : 'Ver'}
                          </button>
                          {p.estado === 'pendiente' && (
                            <button
                              type="button"
                              onClick={() => {
                                setError('')
                                setConfirmando(p)
                              }}
                              disabled={procesando}
                              className="rounded-lg bg-orange-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
                            >
                              Confirmar
                            </button>
                          )}
                          {p.estado === 'confirmado' && (
                            <button
                              type="button"
                              onClick={() => cambiarEstado(p, 'entregado')}
                              disabled={procesando}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Entregado
                            </button>
                          )}
                          {(p.estado === 'pendiente' || p.estado === 'confirmado') && (
                            <button
                              type="button"
                              onClick={() => cambiarEstado(p, 'cancelado')}
                              disabled={procesando}
                              className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setImprimir(p)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            Imprimir
                          </button>
                          {(p.estado === 'pendiente' || p.estado === 'cancelado') && (
                            <button
                              type="button"
                              onClick={() => eliminarPedido(p)}
                              disabled={procesando}
                              className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {abierto === p.id && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={6} className="px-4 py-4">
                          <DetallePedido pedido={p} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmación */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              Confirmar pedido #{confirmando.id}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Se registrará la venta y se descontará el stock de los productos.
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Cliente</span>
                <span className="font-medium text-slate-800">{confirmando.nombre}</span>
              </div>
              <div className="mt-1 flex justify-between text-slate-600">
                <span>Productos</span>
                <span className="font-medium text-slate-800">
                  {(confirmando.detalle || []).reduce((acc, d) => acc + d.cantidad, 0)} unidades
                </span>
              </div>
              <div className="mt-1 flex justify-between font-semibold text-slate-900">
                <span>Total base</span>
                <span className="tabular-nums">{fmtPrecio.format(confirmando.total || 0)}</span>
              </div>
            </div>

            <label className="mb-1 mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Medio de pago
            </label>
            <select
              value={medioPagoId}
              onChange={(e) => setMedioPagoId(e.target.value)}
              className={claseInput}
            >
              {mediosPago.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                  {Number(m.interes) > 0 ? ` (+${m.interes}%)` : ''}
                </option>
              ))}
            </select>

            {medioSeleccionado && Number(medioSeleccionado.interes) > 0 && (
              <div className="mt-3 flex justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                <span>Total con interés ({medioSeleccionado.interes}%)</span>
                <span className="tabular-nums">
                  {fmtPrecio.format(
                    Math.round(
                      (Number(confirmando.total) *
                        (1 + Number(medioSeleccionado.interes) / 100)) *
                        100
                    ) / 100
                  )}
                </span>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmando(null)
                  setError('')
                }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmarPedido}
                disabled={procesando || !medioPagoId}
                className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
              >
                {procesando ? 'Confirmando...' : 'Confirmar y registrar venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de impresión */}
      {imprimir && <PedidoImpresion pedido={imprimir} onCerrar={() => setImprimir(null)} />}
    </div>
  )
}

function DetallePedido({ pedido }) {
  const detalle = Array.isArray(pedido.detalle) ? pedido.detalle : []

  return (
    <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Productos</h3>
        <ul className="mt-2 space-y-1">
          {detalle.map((d) => (
            <li key={d.id} className="flex justify-between gap-3 text-slate-700">
              <span>
                <span className="font-semibold">{d.cantidad}×</span> {d.nombre_producto}
                {d.codigo_producto && (
                  <span className="ml-1 text-xs text-slate-400">[{d.codigo_producto}]</span>
                )}
              </span>
              <span className="shrink-0 tabular-nums text-slate-600">
                {fmtPrecio.format(d.subtotal)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contacto</h3>
        <p className="mt-2 text-slate-700">{pedido.nombre}</p>
        {pedido.telefono && <p className="text-slate-600">Tel: {pedido.telefono}</p>}
        {pedido.email && <p className="text-slate-600">{pedido.email}</p>}
        {pedido.direccion && (
          <p className="mt-1 text-slate-600">Dir: {pedido.direccion}</p>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Detalles</h3>
        {pedido.notas && (
          <p className="mt-2 rounded-lg bg-white px-3 py-2 text-slate-700 ring-1 ring-slate-200">
            “{pedido.notas}”
          </p>
        )}
        {pedido.venta_id && (
          <p className="mt-2 text-slate-600">
            Venta asociada: <span className="font-mono font-semibold">#{pedido.venta_id}</span>
          </p>
        )}
        {pedido.cliente && (
          <p className="mt-1 text-xs text-slate-400">Ficha de cliente vinculada</p>
        )}
      </div>
    </div>
  )
}

function PedidoImpresion({ pedido, onCerrar }) {
  const detalle = Array.isArray(pedido.detalle) ? pedido.detalle : []
  const fecha = new Date(pedido.created_at).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="w-full max-w-lg">
        <div className="presupuesto-noimprimir mb-3 flex justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>

        <div className="presupuesto-impresion rounded-2xl bg-white p-8 shadow-xl">
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{DATOS_EMPRESA.nombre}</h2>
              <p className="text-sm text-slate-600">{DATOS_EMPRESA.direccion}</p>
              <p className="text-sm text-slate-600">{DATOS_EMPRESA.telefono}</p>
              <p className="text-xs text-slate-500">{DATOS_EMPRESA.horarios}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">Pedido #{pedido.id}</p>
              <p className="text-xs text-slate-500">{fecha}</p>
              <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {ESTADOS[pedido.estado]?.label || pedido.estado}
              </span>
            </div>
          </div>

          <div className="mt-4 text-sm">
            <p className="font-semibold text-slate-800">{pedido.nombre}</p>
            {pedido.telefono && <p className="text-slate-600">Tel: {pedido.telefono}</p>}
            {pedido.email && <p className="text-slate-600">{pedido.email}</p>}
            {pedido.direccion && <p className="text-slate-600">Dir: {pedido.direccion}</p>}
          </div>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-2">Cant.</th>
                <th className="py-2">Producto</th>
                <th className="py-2 text-right">P. unit.</th>
                <th className="py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detalle.map((d) => (
                <tr key={d.id}>
                  <td className="py-2 font-semibold text-slate-700">{d.cantidad}</td>
                  <td className="py-2 text-slate-700">
                    {d.nombre_producto}
                    {d.codigo_producto && (
                      <span className="ml-1 text-xs text-slate-400">[{d.codigo_producto}]</span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums text-slate-600">
                    {fmtPrecio.format(d.precio_unitario)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-slate-800">
                    {fmtPrecio.format(d.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-xl font-bold tabular-nums text-slate-900">
                {fmtPrecio.format(pedido.total || 0)}
              </p>
            </div>
          </div>

          {pedido.notas && (
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span className="font-semibold">Comentario:</span> {pedido.notas}
            </p>
          )}

          <p className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
            Pedido recibido desde la tienda online · Gracias por confiar en {DATOS_EMPRESA.nombre}
          </p>
        </div>
      </div>
    </div>
  )
}
