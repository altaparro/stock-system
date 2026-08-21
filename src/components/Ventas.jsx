import { Fragment, useEffect, useMemo, useState } from 'react'
import Nav from './Nav'
import { fmtPrecio, fmtFecha } from '../lib/format'

function IconoCarrito() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-8 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
    </svg>
  )
}

function IconoBuscar() {
  return (
    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
    </svg>
  )
}

export default function Ventas() {
  const [productos, setProductos] = useState([])
  const [medios, setMedios] = useState([])
  const [ventas, setVentas] = useState([])
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [medioPagoId, setMedioPagoId] = useState('')
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [ventaExitosa, setVentaExitosa] = useState(null)
  const [ventaAbierta, setVentaAbierta] = useState(null)

  async function obtenerDatos() {
    try {
      setLoading(true)
      setError('')

      const [resProd, resMedios, resVentas] = await Promise.all([
        fetch('/api/productos'),
        fetch('/api/medios-pago'),
        fetch('/api/ventas')
      ])

      if (!resProd.ok) throw new Error('Error al obtener productos')
      if (!resMedios.ok) throw new Error('Error al obtener medios de pago')
      if (!resVentas.ok) throw new Error('Error al obtener ventas')

      const dataProd = await resProd.json()
      const dataMedios = await resMedios.json()
      const dataVentas = await resVentas.json()

      setProductos(Array.isArray(dataProd) ? dataProd : [])
      setMedios(Array.isArray(dataMedios) ? dataMedios : [])
      setVentas(Array.isArray(dataVentas) ? dataVentas : [])

      setMedioPagoId((prev) => {
        if (prev) return prev
        return dataMedios?.[0]?.id ? String(dataMedios[0].id) : ''
      })
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function agregarAlCarrito(producto) {
    setVentaExitosa(null)

    setCarrito((prev) => {
      const existente = prev.find((i) => i.id === producto.id)
      if (existente) {
        if (existente.cantidad >= (producto.stock || 0)) return prev
        return prev.map((i) =>
          i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      if ((producto.stock || 0) <= 0) return prev
      return [...prev, { ...producto, cantidad: 1 }]
    })
  }

  function cambiarCantidad(id, delta) {
    setCarrito((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const nueva = Math.min(Math.max(i.cantidad + delta, 1), i.stock || 1)
        return { ...i, cantidad: nueva }
      })
    )
  }

  function quitarDelCarrito(id) {
    setCarrito((prev) => prev.filter((i) => i.id !== id))
  }

  async function finalizarVenta() {
    try {
      setProcesando(true)
      setError('')
      setVentaExitosa(null)

      if (carrito.length === 0) return

      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medio_pago_id: Number(medioPagoId),
          items: carrito.map((i) => ({ producto_id: i.id, cantidad: i.cantidad }))
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar la venta')
      }

      setVentaExitosa(data)
      setCarrito([])
      await obtenerDatos()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setProcesando(false)
    }
  }

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return productos

    return productos.filter((p) => {
      const nombre = p.nombre?.toLowerCase() ?? ''
      const codigo = p.codigo?.toLowerCase() ?? ''
      const tipo = p.tipo?.nombre?.toLowerCase() ?? ''
      return nombre.includes(q) || codigo.includes(q) || tipo.includes(q)
    })
  }, [productos, busqueda])

  const subtotal = useMemo(
    () =>
      carrito.reduce(
        (acc, i) => acc + (i.precio_venta || 0) * i.cantidad,
        0
      ),
    [carrito]
  )

  const medioSeleccionado = medios.find((m) => String(m.id) === String(medioPagoId))
  const interesPct = Number(medioSeleccionado?.interes || 0)
  const montoInteres = (subtotal * interesPct) / 100
  const total = subtotal + montoInteres

  useEffect(() => {
    obtenerDatos()
  }, [])

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-8">
          <Nav activo="ventas" />
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <IconoCarrito />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Nueva venta
              </h1>
              <p className="text-sm text-slate-500">
                Seleccioná productos, medio de pago y finalizá la venta
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {ventaExitosa && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span>
              Venta <strong>#{ventaExitosa.venta_id}</strong> registrada por{' '}
              <strong>{fmtPrecio.format(ventaExitosa.total)}</strong>. Stock actualizado.
            </span>
            <button
              type="button"
              onClick={() => setVentaExitosa(null)}
              className="text-emerald-600 hover:text-emerald-800"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Productos */}
          <section className="lg:col-span-2">
            <div className="relative mb-4">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <IconoBuscar />
              </span>
              <input
                type="search"
                placeholder="Buscar por nombre, código o tipo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="max-h-[560px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                ))
              ) : productosFiltrados.length === 0 ? (
                <p className="py-12 text-center text-sm font-medium text-slate-500">
                  No se encontraron productos.
                </p>
              ) : (
                productosFiltrados.map((p) => {
                  const sinStock = (p.stock || 0) <= 0
                  const enCarrito = carrito.find((i) => i.id === p.id)

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition ${
                        enCarrito
                          ? 'border-indigo-300 bg-indigo-50/60'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {p.nombre}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">
                            {p.codigo}
                          </span>
                          {p.tipo && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700 ring-1 ring-inset ring-indigo-200">
                              {p.tipo.nombre}
                            </span>
                          )}
                          <span
                            className={
                              sinStock ? 'font-semibold text-red-600' : 'text-slate-500'
                            }
                          >
                            Stock: {p.stock}
                          </span>
                        </div>
                      </div>

                      <span className="shrink-0 tabular-nums text-sm font-semibold text-slate-800">
                        {fmtPrecio.format(p.precio_venta || 0)}
                      </span>

                      <button
                        type="button"
                        onClick={() => agregarAlCarrito(p)}
                        disabled={sinStock}
                        className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {sinStock ? 'Sin stock' : '+ Agregar'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Carrito */}
          <section>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
                Carrito ({carrito.length})
              </h2>

              {carrito.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Todavía no agregaste productos.
                </p>
              ) : (
                <ul className="mb-4 max-h-64 space-y-3 overflow-y-auto">
                  {carrito.map((i) => (
                    <li key={i.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {i.nombre}
                        </p>
                        <p className="text-xs text-slate-500">
                          {fmtPrecio.format(i.precio_venta || 0)} c/u
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(i.id, -1)}
                          className="px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-100"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums">
                          {i.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(i.id, 1)}
                          disabled={i.cantidad >= (i.stock || 0)}
                          className="px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-800">
                        {fmtPrecio.format((i.precio_venta || 0) * i.cantidad)}
                      </span>

                      <button
                        type="button"
                        onClick={() => quitarDelCarrito(i.id)}
                        className="shrink-0 text-slate-400 transition hover:text-red-600"
                        aria-label={`Quitar ${i.nombre}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mb-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Medio de pago
                </label>
                <select
                  value={medioPagoId}
                  onChange={(e) => setMedioPagoId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                >
                  {medios.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                      {Number(m.interes) > 0 ? ` (+${m.interes}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <dl className="space-y-1.5 border-t border-slate-200 pt-4 text-sm">
                <div className="flex justify-between text-slate-600">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{fmtPrecio.format(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-slate-600">
                  <dt>
                    Interés {medioSeleccionado ? `(${interesPct}%)` : ''}
                  </dt>
                  <dd className="tabular-nums">{fmtPrecio.format(montoInteres)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{fmtPrecio.format(total)}</dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={finalizarVenta}
                disabled={carrito.length === 0 || procesando || !medioPagoId}
                className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {procesando ? 'Procesando...' : 'Finalizar venta'}
              </button>
            </div>
          </section>
        </div>

        {/* Historial */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold tracking-tight text-slate-900">
            Ventas realizadas
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Venta</th>
                  <th className="px-4 py-3">Medio de pago</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">Subtotal</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">Interés</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-slate-200" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : ventas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center font-medium text-slate-500">
                      Todavía no hay ventas registradas.
                    </td>
                  </tr>
                ) : (
                  ventas.map((v) => {
                    const abierta = ventaAbierta === v.id

                    return (
                      <Fragment key={v.id}>
                        <tr
                          onClick={() => setVentaAbierta(abierta ? null : v.id)}
                          className={`cursor-pointer transition ${abierta ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {fmtFecha(v.created_at)}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            #{v.id}
                            <span className="ml-2 text-xs text-slate-400">
                              {v.detalle?.length ?? 0} ítems {abierta ? '▲' : '▼'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                              {v.medio?.nombre ?? '—'}
                              {Number(v.interes_pct) > 0 ? ` +${v.interes_pct}%` : ''}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 sm:table-cell">
                            {fmtPrecio.format(v.total_base || 0)}
                          </td>
                          <td className="hidden px-4 py-3 text-right tabular-nums text-amber-600 sm:table-cell">
                            {fmtPrecio.format((v.total || 0) - (v.total_base || 0))}
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                            {fmtPrecio.format(v.total || 0)}
                          </td>
                        </tr>

                        {abierta && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={6} className="px-4 py-3">
                              <ul className="space-y-1 text-sm text-slate-600">
                                {(v.detalle ?? []).map((d) => (
                                  <li key={d.id} className="flex justify-between gap-4">
                                    <span>
                                      <strong className="text-slate-800">
                                        {d.cantidad}×
                                      </strong>{' '}
                                      {d.nombre_producto}
                                      {d.codigo_producto && (
                                        <span className="ml-2 font-mono text-xs text-slate-400">
                                          {d.codigo_producto}
                                        </span>
                                      )}
                                    </span>
                                    <span className="tabular-nums">
                                      {fmtPrecio.format(d.subtotal || 0)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
