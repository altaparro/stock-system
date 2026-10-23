import { supabase } from './supabase'

const GRAPH = 'https://graph.facebook.com'
const VERSION = 'v25.0'
const MAX_INTENTOS = 5
const LOTE = 20

let procesando = false

function retailerId(productoId) {
  return `prod-${productoId}`
}

function ahora() {
  return new Date().toISOString()
}

async function pedirMeta(url) {
  const res = await fetch(url)
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error?.message || `Error ${res.status} al consultar Meta`)
  }
  return data
}

export async function obtenerConfig() {
  const { data, error } = await supabase
    .from('settings')
    .select('clave, valor')
    .in('clave', ['wa_token', 'wa_catalog_id', 'wa_sync_auto', 'nombre_negocio'])

  if (error) {
    throw new Error(error.message)
  }

  const mapa = Object.fromEntries((data || []).map((f) => [f.clave, f.valor]))

  return {
    token: mapa.wa_token || '',
    catalog_id: mapa.wa_catalog_id || '',
    sync_auto: mapa.wa_sync_auto === '1',
    nombre_negocio: mapa.nombre_negocio || ''
  }
}

export async function setSetting(clave, valor) {
  const { error } = await supabase
    .from('settings')
    .upsert({ clave, valor: String(valor ?? '') }, { onConflict: 'clave' })

  if (error) {
    throw new Error(error.message)
  }
}

function armarDatos(producto, nombreNegocio) {
  const nombre = String(producto.nombre || '').trim().slice(0, 140)
  const variante = [producto.talle, producto.color].filter(Boolean).join(' ')
  const title = variante ? `${nombre} — ${variante}`.slice(0, 190) : nombre

  const partes = []
  if (producto.tipo?.nombre) partes.push(producto.tipo.nombre)
  if (producto.talle) partes.push(`Talle ${producto.talle}`)
  if (producto.color) partes.push(`Color ${producto.color}`)
  if (producto.marca) partes.push(`Marca ${producto.marca}`)
  if (producto.codigo) partes.push(`Código ${producto.codigo}`)
  const description = (partes.join(' · ') || nombre).slice(0, 999)

  const marca = String(producto.marca || nombreNegocio || 'Indumentaria').slice(0, 99)
  const precio = Number(producto.precio_venta || 0)

  const datos = {
    id: retailerId(producto.id),
    title,
    description,
    brand: marca,
    price: `${precio.toFixed(2)} ARS`,
    availability: Number(producto.stock || 0) > 0 ? 'in stock' : 'out of stock',
    condition: 'new'
  }

  const imagen = String(producto.imagen || '').trim()
  if (imagen.startsWith('http')) datos.image_link = imagen

  return datos
}

export async function encolar(productoId, accion) {
  const cfg = await obtenerConfig()

  await supabase
    .from('sync_cola')
    .delete()
    .eq('producto_id', productoId)
    .in('estado', ['pendiente', 'error'])

  if (!cfg.sync_auto) return

  if (accion === 'DELETE') {
    const { data } = await supabase
      .from('productos')
      .select('wa_sincronizado')
      .eq('id', productoId)
      .maybeSingle()

    if (!data?.wa_sincronizado) return
  }

  const { error } = await supabase
    .from('sync_cola')
    .insert({ producto_id: productoId, accion })

  if (error) {
    throw new Error(error.message)
  }
}

async function marcarError(item, mensaje) {
  const intentos = item.intentos + 1
  const estado = intentos >= MAX_INTENTOS ? 'error' : 'pendiente'

  await supabase
    .from('sync_cola')
    .update({
      estado,
      intentos,
      ultimo_error: String(mensaje || 'Error desconocido').slice(0, 500),
      updated_at: ahora()
    })
    .eq('id', item.id)
}

async function itemsBatch(catalogId, token, requests) {
  const url = `${GRAPH}/${VERSION}/${catalogId}/items_batch?access_token=${encodeURIComponent(token)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allow_upsert: true, item_type: 'PRODUCT_ITEM', requests })
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error?.message || `Error ${res.status} de Meta`)
  }
  return data
}

export async function procesarCola() {
  if (procesando) return
  procesando = true

  try {
    const cfg = await obtenerConfig()
    if (!cfg.token || !cfg.catalog_id) return

    const { data: pendientes, error } = await supabase
      .from('sync_cola')
      .select('*')
      .in('estado', ['pendiente', 'error'])
      .lt('intentos', MAX_INTENTOS)
      .order('id')
      .limit(LOTE)

    if (error || !pendientes?.length) return

    const requests = []
    const listos = []

    for (const item of pendientes) {
      try {
        if (item.accion === 'DELETE') {
          requests.push({ method: 'DELETE', data: { id: retailerId(item.producto_id) } })
          listos.push({ colaId: item.id, productoId: item.producto_id, accion: 'DELETE' })
          continue
        }

        const { data: producto } = await supabase
          .from('productos')
          .select('*, tipo:tipo_producto(nombre)')
          .eq('id', item.producto_id)
          .maybeSingle()

        if (!producto) {
          requests.push({ method: 'DELETE', data: { id: retailerId(item.producto_id) } })
          listos.push({ colaId: item.id, productoId: item.producto_id, accion: 'DELETE' })
          continue
        }

        requests.push({ method: 'UPDATE', data: armarDatos(producto, cfg.nombre_negocio) })
        listos.push({ colaId: item.id, productoId: item.producto_id, accion: item.accion })
      } catch (err) {
        await marcarError(item, err.message)
      }
    }

    if (requests.length === 0) return

    try {
      await itemsBatch(cfg.catalog_id, cfg.token, requests)
    } catch (err) {
      for (const item of pendientes) {
        const { data: actual } = await supabase
          .from('sync_cola')
          .select('intentos')
          .eq('id', item.id)
          .maybeSingle()

        if (actual && actual.intentos === item.intentos) {
          await marcarError(item, err.message)
        }
      }
      return
    }

    const listosIds = listos.map((l) => l.colaId)
    await supabase
      .from('sync_cola')
      .update({ estado: 'listo', ultimo_error: null, updated_at: ahora() })
      .in('id', listosIds)

    const borrados = listos.filter((l) => l.accion === 'DELETE').map((l) => l.productoId)
    const sincronizados = listos.filter((l) => l.accion !== 'DELETE').map((l) => l.productoId)

    if (borrados.length) {
      await supabase.from('productos').update({ wa_sincronizado: 0 }).in('id', borrados)
    }
    if (sincronizados.length) {
      await supabase.from('productos').update({ wa_sincronizado: 1 }).in('id', sincronizados)
    }
  } finally {
    procesando = false
  }
}

export async function probarConexion(token, catalogId) {
  const t = String(token || '').trim()
  const c = String(catalogId || '').trim()
  if (!t || !c) throw new Error('Falta el token de acceso o el ID del catálogo')
  return pedirMeta(`${GRAPH}/${VERSION}/${c}?fields=id,name&access_token=${encodeURIComponent(t)}`)
}

export async function sincronizarTodo() {
  const cfg = await obtenerConfig()
  if (!cfg.token || !cfg.catalog_id) {
    throw new Error('Configurá primero el token de Meta y el ID del catálogo')
  }

  await supabase
    .from('sync_cola')
    .delete()
    .eq('estado', 'pendiente')
    .neq('accion', 'DELETE')

  const { data: productos, error } = await supabase.from('productos').select('id')
  if (error) throw new Error(error.message)

  if (productos?.length) {
    const { error: errInsert } = await supabase
      .from('sync_cola')
      .insert(productos.map((p) => ({ producto_id: p.id, accion: 'UPDATE' })))

    if (errInsert) throw new Error(errInsert.message)
  }

  return productos?.length ?? 0
}

export async function reintentarErrores() {
  const { data, error } = await supabase
    .from('sync_cola')
    .update({ estado: 'pendiente', intentos: 0, updated_at: ahora() })
    .eq('estado', 'error')
    .select('id')

  if (error) throw new Error(error.message)

  return data?.length ?? 0
}

export async function estadoCola() {
  const cfg = await obtenerConfig()

  const conteo = async (estado) => {
    const { count } = await supabase
      .from('sync_cola')
      .select('id', { count: 'exact', head: true })
      .eq('estado', estado)
    return count ?? 0
  }

  const [pendientes, listos, errores, totalProductos, sincronizados, ultimoError] =
    await Promise.all([
      conteo('pendiente'),
      conteo('listo'),
      conteo('error'),
      supabase
        .from('productos')
        .select('id', { count: 'exact', head: true })
        .then((r) => r.count ?? 0),
      supabase
        .from('productos')
        .select('id', { count: 'exact', head: true })
        .eq('wa_sincronizado', 1)
        .then((r) => r.count ?? 0),
      supabase
        .from('sync_cola')
        .select('ultimo_error, updated_at, producto:productos(nombre)')
        .not('ultimo_error', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ])

  return {
    pendientes,
    listos,
    errores,
    total_productos: totalProductos,
    sincronizados,
    ultimo_error: ultimoError?.data ?? null,
    config: {
      token: Boolean(cfg.token),
      catalog_id: Boolean(cfg.catalog_id),
      sync_auto: cfg.sync_auto
    }
  }
}
