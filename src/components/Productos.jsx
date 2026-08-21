import { useEffect, useMemo, useState } from 'react'
import Nav from './Nav'
import { fmtPrecio } from '../lib/format'

function IconoBuscar() {
  return (
    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
    </svg>
  )
}

function IconoCaja() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7 12 3 4 7v10l8 4 8-4V7Z M4 7l8 4 8-4 M12 11v10" />
    </svg>
  )
}

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [tipos, setTipos] = useState([])
  const [busqueda, setBusqueda] = useState('')

  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [stock, setStock] = useState('')
  const [precio, setPrecio] = useState('')
  const [precioCompra, setPrecioCompra] = useState('')
  const [tipoId, setTipoId] = useState('')

  const [nuevoTipoVisible, setNuevoTipoVisible] = useState(false)
  const [nuevoTipoNombre, setNuevoTipoNombre] = useState('')
  const [guardandoTipo, setGuardandoTipo] = useState(false)

  const [editandoId, setEditandoId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function obtenerDatos() {
    try {
      setLoading(true)
      setError('')

      const [resProd, resTipos] = await Promise.all([
        fetch('/api/productos'),
        fetch('/api/tipos')
      ])

      if (!resProd.ok) throw new Error('Error al obtener productos')
      if (!resTipos.ok) throw new Error('Error al obtener tipos de producto')

      const dataProd = await resProd.json()
      const dataTipos = await resTipos.json()

      setProductos(Array.isArray(dataProd) ? dataProd : [])
      setTipos(Array.isArray(dataTipos) ? dataTipos : [])
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function guardarTipo(e) {
    e.preventDefault()
    if (guardandoTipo) return

    const nombreTipo = nuevoTipoNombre.trim()
    if (!nombreTipo) return

    try {
      setGuardandoTipo(true)

      const res = await fetch('/api/tipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreTipo })
      })

      if (!res.ok) throw new Error('Error al crear el tipo')

      const creado = await res.json()

      setTipos((prev) =>
        [...prev, creado[0]].sort((a, b) => a.nombre.localeCompare(b.nombre))
      )
      setTipoId(creado[0].id)
      setNuevoTipoNombre('')
      setNuevoTipoVisible(false)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setGuardandoTipo(false)
    }
  }

  async function guardarProducto(e) {
    e.preventDefault()

    try {
      setGuardando(true)
      setError('')

      if (!nombre || !codigo) {
        setError('Nombre y código son obligatorios')
        return
      }

      const body = {
        nombre,
        codigo,
        stock: Number(stock || 0),
        precio_venta: Number(precio || 0),
        precio_compra: Number(precioCompra || 0),
        tipo_producto_id: tipoId || null
      }

      const res = await fetch('/api/productos', {
        method: editandoId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editandoId ? { id: editandoId, ...body } : body)
      })

      if (!res.ok) throw new Error('Error al guardar producto')

      limpiarFormulario()
      await obtenerDatos()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarProducto(id) {
    try {
      const res = await fetch(`/api/productos?id=${id}`, { method: 'DELETE' })

      if (!res.ok) throw new Error('Error al eliminar producto')

      await obtenerDatos()
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  function editarProducto(producto) {
    setEditandoId(producto.id)
    setNombre(producto.nombre)
    setCodigo(producto.codigo)
    setStock(producto.stock)
    setPrecio(producto.precio_venta)
    setPrecioCompra(producto.precio_compra || '')
    setTipoId(producto.tipo_producto_id || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function limpiarFormulario() {
    setEditandoId(null)
    setNombre('')
    setCodigo('')
    setStock('')
    setPrecio('')
    setPrecioCompra('')
    setTipoId('')
    setNuevoTipoVisible(false)
    setNuevoTipoNombre('')
  }

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return productos

    return productos.filter((p) => {
      const nombre = p.nombre?.toLowerCase() ?? ''
      const codigo = p.codigo?.toLowerCase() ?? ''
      const tipo = p.tipo?.nombre?.toLowerCase() ?? ''
      return (
        nombre.includes(q) || codigo.includes(q) || tipo.includes(q)
      )
    })
  }, [productos, busqueda])

  const stats = useMemo(() => {
    return {
      total: productos.length,
      unidades: productos.reduce((acc, p) => acc + (p.stock || 0), 0),
      valor: productos.reduce(
        (acc, p) => acc + (p.stock || 0) * (p.precio_venta || 0),
        0
      ),
      ganancia: productos.reduce(
        (acc, p) =>
          acc + (p.stock || 0) * ((p.precio_venta || 0) - (p.precio_compra || 0)),
        0
      ),
      bajoStock: productos.filter((p) => (p.stock || 0) <= 5).length
    }
  }, [productos])

  useEffect(() => {
    obtenerDatos()
  }, [])

  const claseInput =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
  const claseLabel =
    'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Encabezado */}
        <header className="mb-8">
          <Nav activo="productos" />
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <IconoCaja />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Productos
              </h1>
              <p className="text-sm text-slate-500">
                Administrá tu inventario de forma simple
              </p>
            </div>
          </div>
        </header>

        {/* Métricas */}
        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            { label: 'Productos', value: stats.total, color: 'text-indigo-600' },
            { label: 'Unidades en stock', value: stats.unidades, color: 'text-emerald-600' },
            { label: 'Valor inventario', value: fmtPrecio.format(stats.valor), color: 'text-sky-600' },
            { label: 'Ganancia estimada', value: fmtPrecio.format(stats.ganancia), color: 'text-violet-600' },
            { label: 'Stock bajo (≤5)', value: stats.bajoStock, color: 'text-amber-600' }
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
              <p className={`mt-1 truncate text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </section>

        {/* Buscador */}
        <div className="relative mb-6">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <IconoBuscar />
          </span>
          <input
            type="search"
            placeholder="Buscar por nombre, código o tipo de producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-slate-600"
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* Formulario */}
        <form
          onSubmit={guardarProducto}
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
            {editandoId ? `Editando producto #${editandoId}` : 'Nuevo producto'}
          </h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <label className={claseLabel}>Nombre *</label>
              <input
                placeholder="Ej: Coca-Cola 500ml"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={claseInput}
              />
            </div>

            <div>
              <label className={claseLabel}>Código *</label>
              <input
                placeholder="Ej: CC-0500"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className={claseInput}
              />
            </div>

            <div>
              <label className={claseLabel}>Tipo</label>
              <select
                value={tipoId}
                onChange={(e) => setTipoId(e.target.value)}
                className={claseInput}
              >
                <option value="">Sin tipo</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={claseLabel}>Stock</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className={claseInput}
              />
            </div>

            <div>
              <label className={claseLabel}>Precio venta</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className={claseInput}
              />
            </div>

            <div>
              <label className={claseLabel}>Precio compra</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={precioCompra}
                onChange={(e) => setPrecioCompra(e.target.value)}
                className={claseInput}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {editandoId ? 'Actualizar' : guardando ? 'Guardando...' : 'Agregar'}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
            )}

            {!nuevoTipoVisible ? (
              <button
                type="button"
                onClick={() => setNuevoTipoVisible(true)}
                className="ml-auto text-sm font-medium text-indigo-600 transition hover:text-indigo-800"
              >
                + Crear nuevo tipo
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  placeholder="Nombre del tipo"
                  value={nuevoTipoNombre}
                  onChange={(e) => setNuevoTipoNombre(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && guardarTipo(e)}
                  autoFocus
                  className="w-48 rounded-lg border border-indigo-300 bg-indigo-50/50 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
                <button
                  type="button"
                  onClick={guardarTipo}
                  disabled={guardandoTipo}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {guardandoTipo ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNuevoTipoVisible(false)
                    setNuevoTipoNombre('')
                  }}
                  className="text-sm text-slate-500 transition hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="hidden px-4 py-3 text-right xl:table-cell">P. Compra</th>
                <th className="px-4 py-3 text-right">P. Venta</th>
                <th className="hidden px-4 py-3 text-right lg:table-cell">Ganancia</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <p className="font-medium text-slate-600">
                      {productos.length === 0
                        ? 'No hay productos cargados.'
                        : 'No se encontraron productos con esa búsqueda.'}
                    </p>
                    {productos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setBusqueda('')}
                        className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((p) => {
                  const stockBajo = (p.stock || 0) <= 5

                  return (
                    <tr key={p.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400">{p.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{p.nombre}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                          {p.codigo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.tipo ? (
                          <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
                            {p.tipo.nombre}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex min-w-8 justify-center rounded-md px-2 py-0.5 font-semibold ${
                            p.stock === 0
                              ? 'bg-red-100 text-red-700'
                              : stockBajo
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 xl:table-cell">
                        {fmtPrecio.format(p.precio_compra || 0)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">
                        {fmtPrecio.format(p.precio_venta || 0)}
                      </td>
                      <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">
                        <span
                          className={
                            (p.precio_venta || 0) - (p.precio_compra || 0) >= 0
                              ? 'font-semibold text-emerald-600'
                              : 'font-semibold text-red-600'
                          }
                        >
                          {fmtPrecio.format((p.precio_venta || 0) - (p.precio_compra || 0))}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => editarProducto(p)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarProducto(p.id)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="mt-6 text-center text-xs text-slate-400">
          {productosFiltrados.length} de {productos.length} productos
        </footer>
      </div>
    </div>
  )
}
