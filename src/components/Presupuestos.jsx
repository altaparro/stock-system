import { useEffect, useMemo, useState } from 'react'
import Nav from './Nav'
import { PaginaProtegida } from './Auth'
import { fmtPrecio } from '../lib/format'

const DATOS_EMPRESA = {
  nombre: 'Lexus autoradio',
  direccion: 'Dirección 10 N° 1745, La Plata, Buenos Aires',
  telefono: 'Tel: 221-4535452',
  horarios: 'Lunes a Viernes de 9 a 16 hs · Sábados de 9 a 13 hs'
}

const claseInput =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
const claseLabel =
  'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'

function PresupuestoVacio() {
  return {
    cliente: '',
    cliente_dni: '',
    telefono: '',
    vehiculo: '',
    patente: '',
    items: [{ descripcion: '', cantidad: 1, precio: '' }],
    manobra_obra: ''
  }
}

export default function Presupuestos() {
  return (
    <PaginaProtegida>
      <ContenidoPresupuestos />
    </PaginaProtegida>
  )
}

function ContenidoPresupuestos() {
  const [form, setForm] = useState(PresupuestoVacio())
  const [presupuestos, setPresupuestos] = useState([])
  const [productos, setProductos] = useState([])
  const [busquedaProd, setBusquedaProd] = useState('')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [imprimir, setImprimir] = useState(null)

  useEffect(() => {
    obtenerPresupuestos()
    obtenerProductos()
  }, [])

  async function obtenerProductos() {
    try {
      const res = await fetch('/api/productos')
      if (!res.ok) return
      const data = await res.json()
      setProductos(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    }
  }

  async function obtenerPresupuestos() {
    try {
      setLoading(true)
      const res = await fetch('/api/presupuestos')
      if (!res.ok) throw new Error('Error al obtener presupuestos')
      const data = await res.json()
      setPresupuestos(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function actualizarForm(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  function actualizarItem(idx, campo, valor) {
    setForm((f) => {
      const items = f.items.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it))
      return { ...f, items }
    })
  }

  function agregarItem() {
    setForm((f) => ({
      ...f,
      items: [...f.items, { descripcion: '', cantidad: 1, precio: '' }]
    }))
  }

  function quitarItem(idx) {
    setForm((f) => {
      const items = f.items.filter((_, i) => i !== idx)
      return { ...f, items: items.length ? items : [PresupuestoVacio().items[0]] }
    })
  }

  function agregarProductoDesdeBase(prod) {
    setForm((f) => {
      const existente = f.items.find(
        (it) => it.producto_id === prod.id && it.descripcion === prod.nombre
      )
      if (existente) {
        return {
          ...f,
          items: f.items.map((it) =>
            it === existente
              ? { ...it, cantidad: (Number(it.cantidad) || 0) + 1 }
              : it
          )
        }
      }
      const detalle = prod.marca ? `${prod.marca} ${prod.nombre}` : prod.nombre
      const descripcion = prod.codigo ? `${detalle} (${prod.codigo})` : detalle
      return {
        ...f,
        items: [...f.items, { descripcion, cantidad: 1, precio: String(prod.precio_venta ?? '') }]
      }
    })
  }

  const productosFiltrados = useMemo(() => {
    const q = busquedaProd.trim().toLowerCase()
    if (!q) return []
    return productos
      .filter((p) => {
        const nombre = p.nombre?.toLowerCase() ?? ''
        const codigo = p.codigo?.toLowerCase() ?? ''
        const marca = p.marca?.toLowerCase() ?? ''
        const tipo = p.tipo?.nombre?.toLowerCase() ?? ''
        return (
          nombre.includes(q) || codigo.includes(q) || marca.includes(q) || tipo.includes(q)
        )
      })
      .slice(0, 8)
  }, [productos, busquedaProd])

  const subtotal = useMemo(
    () =>
      form.items.reduce((acc, it) => {
        const cant = Number(it.cantidad) || 0
        const precio = Number(it.precio) || 0
        return acc + cant * precio
      }, 0),
    [form.items]
  )

  const manobraObra = Number(form.manobra_obra) || 0
  const total = subtotal + manobraObra

  async function guardar() {
    try {
      setGuardando(true)
      setError('')

      if (!form.cliente && !form.vehiculo) return

      const res = await fetch('/api/presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: form.cliente,
          cliente_dni: form.cliente_dni,
          telefono: form.telefono,
          vehiculo: form.vehiculo,
          patente: form.patente,
          manobra_obra: manobraObra,
          items: form.items.filter((it) => it.descripcion.trim()),
          subtotal
        })
      })

      if (!res.ok) throw new Error('Error al guardar el presupuesto')

      const creado = await res.json()
      setForm(PresupuestoVacio())
      await obtenerPresupuestos()
      setImprimir(creado)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id) {
    try {
      const res = await fetch(`/api/presupuestos?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      await obtenerPresupuestos()
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <Nav activo="presupuestos" />
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-12 w-12 rounded-xl object-contain shadow-sm ring-1 ring-orange-200"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Presupuestos
              </h1>
              <p className="text-sm text-slate-500">
                {DATOS_EMPRESA.nombre} — creá, guardá e imprimí presupuestos
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            guardar()
          }}
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
            Nuevo presupuesto
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={claseLabel}>Cliente</label>
              <input
                placeholder="Nombre y apellido"
                value={form.cliente}
                onChange={(e) => actualizarForm('cliente', e.target.value)}
                className={claseInput}
              />
            </div>
            <div>
              <label className={claseLabel}>DNI</label>
              <input
                placeholder="Documento"
                value={form.cliente_dni}
                onChange={(e) => actualizarForm('cliente_dni', e.target.value)}
                className={claseInput}
              />
            </div>
            <div>
              <label className={claseLabel}>Teléfono</label>
              <input
                placeholder="Teléfono"
                value={form.telefono}
                onChange={(e) => actualizarForm('telefono', e.target.value)}
                className={claseInput}
              />
            </div>
            <div className="hidden lg:block" />
            <div>
              <label className={claseLabel}>Vehículo</label>
              <input
                placeholder="Marca y modelo"
                value={form.vehiculo}
                onChange={(e) => actualizarForm('vehiculo', e.target.value)}
                className={claseInput}
              />
            </div>
            <div>
              <label className={claseLabel}>Patente</label>
              <input
                placeholder="Patente"
                value={form.patente}
                onChange={(e) => actualizarForm('patente', e.target.value)}
                className={claseInput}
              />
            </div>
          </div>

          {/* Ítems */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                Ítems
              </h3>
              <button
                type="button"
                onClick={agregarItem}
                className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
              >
                + Agregar renglón
              </button>
            </div>

            {/* Buscador de productos de la base */}
            <div className="relative mb-3">
              <input
                type="search"
                placeholder="Buscar producto del stock para agregar..."
                value={busquedaProd}
                onChange={(e) => setBusquedaProd(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
              {busquedaProd && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  {productosFiltrados.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-slate-400">
                      Sin resultados.
                    </p>
                  ) : (
                    productosFiltrados.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          agregarProductoDesdeBase(p)
                          setBusquedaProd('')
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-orange-50"
                      >
                        <span className="min-w-0 truncate">
                          {p.marca && (
                            <span className="text-xs font-semibold text-orange-700">{p.marca} </span>
                          )}
                          <span className="font-medium text-slate-800">{p.nombre}</span>
                        </span>
                        <span className="shrink-0 tabular-nums font-semibold text-slate-700">
                          {fmtPrecio.format(p.precio_venta || 0)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {form.items.map((it, idx) => (
                <div key={idx} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2">
                  <div className="min-w-40 flex-1">
                    <label className={claseLabel}>Descripción</label>
                    <input
                      placeholder="Descripción del trabajo/producto"
                      value={it.descripcion}
                      onChange={(e) => actualizarItem(idx, 'descripcion', e.target.value)}
                      className={claseInput}
                    />
                  </div>
                  <div className="w-24">
                    <label className={claseLabel}>Cant.</label>
                    <input
                      type="number"
                      min="0"
                      value={it.cantidad}
                      onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)}
                      className={claseInput}
                    />
                  </div>
                  <div className="w-32">
                    <label className={claseLabel}>Precio</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={it.precio}
                      onChange={(e) => actualizarItem(idx, 'precio', e.target.value)}
                      className={claseInput}
                    />
                  </div>
                  <div className="flex w-24 items-center gap-1 pb-1">
                    <span className="w-full text-right text-sm font-semibold tabular-nums text-slate-700">
                      {fmtPrecio.format((Number(it.cantidad) || 0) * (Number(it.precio) || 0))}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitarItem(idx)}
                    className="mb-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Quitar renglón"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Subtotales */}
          <div className="mt-6 flex flex-col items-end gap-3">
            <div className="w-full max-w-xs space-y-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium">{fmtPrecio.format(subtotal)}</span>
              </div>
              <div>
                <label className={claseLabel}>Mano de obra</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.manobra_obra}
                  onChange={(e) => actualizarForm('manobra_obra', e.target.value)}
                  className={claseInput}
                />
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <span>Total</span>
                <span className="tabular-nums">{fmtPrecio.format(total)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar presupuesto'}
              </button>
              <button
                type="button"
                onClick={() => setImprimir({ ...form, items: form.items.filter((it) => it.descripcion.trim()), subtotal, total, manobra_obra: manobraObra })}
                className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Imprimir borrador
              </button>
            </div>
          </div>
        </form>

        {/* Listado */}
        <section>
          <h2 className="mb-4 text-lg font-bold tracking-tight text-slate-900">
            Presupuestos guardados ({presupuestos.length})
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">N°</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Vehículo</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
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
                ) : presupuestos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center font-medium text-slate-500">
                      Todavía no hay presupuestos guardados.
                    </td>
                  </tr>
                ) : (
                  presupuestos.map((p) => (
                    <tr key={p.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-500">#{p.numero}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(p.fecha).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {p.cliente || '—'}
                        {p.telefono && <span className="ml-2 text-xs text-slate-400">{p.telefono}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.vehiculo || '—'}
                        {p.patente && <span className="ml-2 font-mono text-xs text-slate-400">{p.patente}</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                        {fmtPrecio.format(p.total || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setImprimir(p)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                          >
                            Imprimir
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminar(p.id)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {imprimir && (
        <PresupuestoImpresion presupuesto={imprimir} onCerrar={() => setImprimir(null)} />
      )}
    </div>
  )
}

function PresupuestoImpresion({ presupuesto, onCerrar }) {
  const items = Array.isArray(presupuesto.items) ? presupuesto.items : []
  const subtotal = Number(presupuesto.subtotal) || 0
  const manoObra = Number(presupuesto.manobra_obra) || 0
  const total = Number(presupuesto.total) || subtotal + manoObra
  const numero = presupuesto.numero || ''
  const fecha = new Date(presupuesto.fecha || Date.now()).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="presupuesto-impresion w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        {/* Encabezado de la empresa */}
        <div className="flex items-center gap-4 border-b-2 border-orange-600 pb-4">
          <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">{DATOS_EMPRESA.nombre}</h2>
            <p className="text-sm text-slate-600">{DATOS_EMPRESA.direccion}</p>
            <p className="text-sm text-slate-600">{DATOS_EMPRESA.telefono}</p>
            <p className="text-xs text-slate-500">{DATOS_EMPRESA.horarios}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Fecha</p>
            <p className="font-semibold text-slate-800">{fecha}</p>
            <p className="mt-2 text-xs text-slate-500">Presupuesto N°</p>
            <p className="font-mono text-lg font-bold text-orange-600">{numero}</p>
          </div>
        </div>

        {/* Datos cliente y vehículo */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Cliente</p>
            <p className="font-medium text-slate-800">{presupuesto.cliente || '—'}</p>
            {presupuesto.cliente_dni && (
              <p className="text-slate-600">DNI: {presupuesto.cliente_dni}</p>
            )}
            {presupuesto.telefono && <p className="text-slate-600">Tel: {presupuesto.telefono}</p>}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Vehículo</p>
            <p className="font-medium text-slate-800">{presupuesto.vehiculo || '—'}</p>
            {presupuesto.patente && (
              <p className="font-mono text-slate-600">Patente: {presupuesto.patente}</p>
            )}
          </div>
        </div>

        {/* Ítems */}
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-2">Descripción</th>
              <th className="w-16 py-2 pr-2 text-right">Cant.</th>
              <th className="w-28 py-2 pr-2 text-right">Precio</th>
              <th className="w-32 py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it, i) => (
              <tr key={i}>
                <td className="py-2 pr-2 text-slate-800">{it.descripcion}</td>
                <td className="py-2 pr-2 text-right tabular-nums text-slate-600">{it.cantidad}</td>
                <td className="py-2 pr-2 text-right tabular-nums text-slate-600">
                  {fmtPrecio.format(Number(it.precio) || 0)}
                </td>
                <td className="py-2 text-right font-medium tabular-nums text-slate-800">
                  {fmtPrecio.format((Number(it.cantidad) || 0) * (Number(it.precio) || 0))}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">
                  Sin renglones
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totales */}
        <div className="mt-5 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmtPrecio.format(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Mano de obra</span>
              <span className="tabular-nums">{fmtPrecio.format(manoObra)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold text-slate-900">
              <span>TOTAL</span>
              <span className="tabular-nums">{fmtPrecio.format(total)}</span>
            </div>
          </div>
        </div>

        {/* Pie */}
        <div className="mt-8 border-t border-slate-200 pt-3 text-center text-xs text-slate-400">
          Gracias por confiar en {DATOS_EMPRESA.nombre}.
        </div>

        {/* Acciones */}
        <div className="presupuesto-noimprimir mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}
