import { useEffect, useState } from 'react'
import Nav from './Nav'
import { PaginaProtegida } from './Auth'

export default function Configuracion() {
  return (
    <PaginaProtegida>
      <ContenidoConfiguracion />
    </PaginaProtegida>
  )
}

async function pedir(ruta, opciones = {}) {
  const res = await fetch(ruta, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error || `Error al consultar ${ruta}`)
  }
  return data
}

function ContenidoConfiguracion() {
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [negocio, setNegocio] = useState('')
  const [guardandoNegocio, setGuardandoNegocio] = useState(false)

  const [medios, setMedios] = useState([])
  const [guardandoMedios, setGuardandoMedios] = useState(false)

  const [waConfig, setWaConfig] = useState({
    token: '',
    catalog_id: '',
    sync_auto: true
  })
  const [waEstado, setWaEstado] = useState(null)
  const [guardandoWa, setGuardandoWa] = useState(false)
  const [probandoWa, setProbandoWa] = useState(false)
  const [sincronizandoWa, setSincronizandoWa] = useState(false)
  const [mensajeWa, setMensajeWa] = useState('')
  const [errorWa, setErrorWa] = useState('')

  async function obtenerMedios() {
    try {
      const data = await pedir('/api/medios-pago')
      setMedios(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    }
  }

  async function obtenerWaConfig() {
    try {
      const data = await pedir('/api/whatsapp/config')
      setWaConfig({
        token: data.token || '',
        catalog_id: data.catalog_id || '',
        sync_auto: Boolean(data.sync_auto)
      })
      setNegocio(data.nombre_negocio || '')
    } catch (err) {
      setErrorWa(err.message)
    }
  }

  async function obtenerWaEstado() {
    try {
      const data = await pedir('/api/whatsapp/status')
      setWaEstado(data)
    } catch (err) {
      setErrorWa(err.message)
    }
  }

  useEffect(() => {
    obtenerMedios()
    obtenerWaConfig()
    obtenerWaEstado()
  }, [])

  useEffect(() => {
    if (!waEstado || (waEstado.pendientes === 0 && waEstado.errores === 0)) return
    const id = setInterval(obtenerWaEstado, 5000)
    return () => clearInterval(id)
  }, [waEstado?.pendientes, waEstado?.errores])

  async function guardarNegocio(e) {
    e.preventDefault()
    setError('')
    setMensaje('')
    try {
      setGuardandoNegocio(true)
      await pedir('/api/whatsapp/config', {
        method: 'PUT',
        body: JSON.stringify({ ...waConfig, nombre_negocio: negocio })
      })
      setMensaje('Datos del negocio guardados')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardandoNegocio(false)
    }
  }

  function cambiarWaConfig(campo, valor) {
    setWaConfig((c) => ({ ...c, [campo]: valor }))
  }

  async function guardarWaConfig(e) {
    e.preventDefault()
    setErrorWa('')
    setMensajeWa('')
    try {
      setGuardandoWa(true)
      await pedir('/api/whatsapp/config', {
        method: 'PUT',
        body: JSON.stringify(waConfig)
      })
      setMensajeWa('Configuración de WhatsApp guardada')
      await obtenerWaEstado()
    } catch (err) {
      setErrorWa(err.message)
    } finally {
      setGuardandoWa(false)
    }
  }

  async function probarConexionWa() {
    setErrorWa('')
    setMensajeWa('')
    try {
      setProbandoWa(true)
      const data = await pedir('/api/whatsapp/test', {
        method: 'POST',
        body: JSON.stringify({ token: waConfig.token, catalog_id: waConfig.catalog_id })
      })
      setMensajeWa(`Conexión exitosa con el catálogo «${data.catalogo?.name || data.catalogo?.id}»`)
    } catch (err) {
      setErrorWa(err.message)
    } finally {
      setProbandoWa(false)
    }
  }

  async function sincronizarTodoWa() {
    setErrorWa('')
    setMensajeWa('')
    try {
      setSincronizandoWa(true)
      const data = await pedir('/api/whatsapp/sync-all', { method: 'POST' })
      setMensajeWa(`${data.encolados} productos encolados para sincronizar`)
      await obtenerWaEstado()
    } catch (err) {
      setErrorWa(err.message)
    } finally {
      setSincronizandoWa(false)
    }
  }

  async function reintentarWa() {
    setErrorWa('')
    setMensajeWa('')
    try {
      await pedir('/api/whatsapp/retry', { method: 'POST' })
      setMensajeWa('Reintentando sincronizar los productos con error')
      await obtenerWaEstado()
    } catch (err) {
      setErrorWa(err.message)
    }
  }

  function cambiarInteres(id, valor) {
    setMedios((ms) => ms.map((m) => (m.id === id ? { ...m, interes: valor } : m)))
  }

  async function guardarIntereses(e) {
    e.preventDefault()
    setError('')
    setMensaje('')
    try {
      setGuardandoMedios(true)
      const items = medios.map((m) => ({
        id: m.id,
        interes: m.interes === '' ? 0 : Number(m.interes)
      }))
      const data = await pedir('/api/medios-pago', {
        method: 'PUT',
        body: JSON.stringify({ items })
      })
      setMedios(Array.isArray(data) ? data : [])
      setMensaje('Intereses guardados correctamente')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardandoMedios(false)
    }
  }

  const claseInput =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
  const claseLabel =
    'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <Nav activo="configuracion" />
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-12 w-12 rounded-xl object-contain shadow-sm ring-1 ring-orange-200"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configuración</h1>
              <p className="text-sm text-slate-500">
                Datos del negocio, intereses de medios de pago y catálogo de WhatsApp
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {mensaje}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-700">
              Datos del negocio
            </h2>
            <p className="mb-5 text-sm text-slate-500">
              El nombre se usa como marca de los productos en el catálogo de WhatsApp.
            </p>

            <form onSubmit={guardarNegocio} className="space-y-3">
              <div>
                <label className={claseLabel}>Nombre del negocio</label>
                <input
                  placeholder="Ej: Lexus autoradio"
                  value={negocio}
                  onChange={(e) => setNegocio(e.target.value)}
                  className={claseInput}
                />
              </div>
              <button
                type="submit"
                disabled={guardandoNegocio || !negocio.trim()}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
              >
                {guardandoNegocio ? 'Guardando...' : 'Guardar'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-700">
              Intereses de medios de pago
            </h2>
            <p className="mb-5 text-sm text-slate-500">
              El porcentaje se suma al total de la venta al cobrar. Un valor negativo aplica un
              descuento (por ejemplo, -20 en efectivo). Efectivo, transferencia y débito suelen
              quedar en 0%.
            </p>

            {medios.length === 0 ? (
              <p className="text-sm text-slate-500">Cargando medios de pago...</p>
            ) : (
              <form onSubmit={guardarIntereses}>
                <ul className="mb-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {medios.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <span className="text-sm font-medium text-slate-800">{m.nombre}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="-100"
                          max="1000"
                          step="0.1"
                          value={m.interes}
                          onChange={(e) => cambiarInteres(m.id, e.target.value)}
                          aria-label={`Interés de ${m.nombre} en porcentaje`}
                          className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-right text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                        />
                        <span className="text-sm text-slate-500">%</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  type="submit"
                  disabled={guardandoMedios}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
                >
                  {guardandoMedios ? 'Guardando...' : 'Guardar intereses'}
                </button>
              </form>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-700">
            Catálogo de WhatsApp
          </h2>
          <p className="mb-5 text-sm text-slate-500">
            Sincronizá tus productos con el catálogo que se ve en WhatsApp Business. Cuando se
            activa la sincronización automática, cada alta, edición o baja de un producto se
            envía al catálogo de Meta.
          </p>

          {errorWa && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorWa}
            </div>
          )}
          {mensajeWa && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {mensajeWa}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <form onSubmit={guardarWaConfig} className="space-y-3">
              <div>
                <label className={claseLabel}>Token de acceso de Meta</label>
                <input
                  type="password"
                  placeholder="EAAB..."
                  value={waConfig.token}
                  onChange={(e) => cambiarWaConfig('token', e.target.value)}
                  className={claseInput}
                />
              </div>
              <div>
                <label className={claseLabel}>ID del catálogo</label>
                <input
                  placeholder="1234567890"
                  value={waConfig.catalog_id}
                  onChange={(e) => cambiarWaConfig('catalog_id', e.target.value)}
                  className={claseInput}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={waConfig.sync_auto}
                  onChange={(e) => cambiarWaConfig('sync_auto', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Sincronizar automáticamente al cargar productos
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={guardandoWa}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
                >
                  {guardandoWa ? 'Guardando...' : 'Guardar configuración'}
                </button>
                <button
                  type="button"
                  onClick={probarConexionWa}
                  disabled={probandoWa || !waConfig.token || !waConfig.catalog_id}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-500 hover:bg-orange-50 disabled:opacity-50"
                >
                  {probandoWa ? 'Probando...' : 'Probar conexión'}
                </button>
              </div>
            </form>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="mb-2 font-semibold text-slate-700">Estado de la sincronización</p>
                {waEstado ? (
                  <ul className="space-y-1 text-slate-600">
                    <li>
                      Configuración:{' '}
                      {waEstado.config.token && waEstado.config.catalog_id
                        ? 'completa'
                        : 'incompleta (falta token o catálogo)'}
                    </li>
                    <li>
                      Sincronización automática:{' '}
                      <span className="font-medium">
                        {waEstado.config.sync_auto ? 'activada' : 'desactivada'}
                      </span>
                    </li>
                    <li>
                      Productos sincronizados:{' '}
                      <span className="font-medium">
                        {waEstado.sincronizados} / {waEstado.total_productos}
                      </span>
                    </li>
                    <li>
                      En cola: <span className="font-medium">{waEstado.pendientes}</span> ·
                      Errores: <span className="font-medium">{waEstado.errores}</span>
                    </li>
                    {waEstado.ultimo_error?.ultimo_error && (
                      <li className="text-red-600">
                        Último error ({waEstado.ultimo_error.producto || 'producto'}):{' '}
                        {waEstado.ultimo_error.ultimo_error}
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="text-slate-500">Cargando estado...</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={sincronizarTodoWa}
                    disabled={
                      sincronizandoWa || !waEstado?.config?.token || !waEstado?.config?.catalog_id
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-orange-500 hover:bg-orange-50 disabled:opacity-50"
                  >
                    {sincronizandoWa ? 'Encolando...' : 'Sincronizar catálogo completo'}
                  </button>
                  <button
                    type="button"
                    onClick={reintentarWa}
                    disabled={!waEstado || waEstado.errores === 0}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-orange-500 hover:bg-orange-50 disabled:opacity-50"
                  >
                    Reintentar errores
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                <p className="mb-1 font-semibold text-slate-600">Cómo configurarlo (una sola vez)</p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>
                    Creá una cuenta de negocio gratis en business.facebook.com y un catálogo en
                    Commerce Manager (vertical Comercio).
                  </li>
                  <li>
                    En Business Settings, creá un Usuario del sistema, asignale el catálogo como
                    administrador y generá un token permanente con permisos de catálogo.
                  </li>
                  <li>
                    Copiá el ID del catálogo (aparece en la URL de Commerce Manager) y pegálo acá.
                  </li>
                  <li>
                    En los productos, cargá la foto con una URL pública (https://...): se usa
                    directo como imagen del catálogo.
                  </li>
                  <li>
                    En la app WhatsApp Business: Ajustes de negocio → Catálogo → conectá el catálogo
                    de Meta.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
