import { useAuth, cerrarSesion } from '../lib/auth'

const paginas = [
  { key: 'inicio', href: '/', label: 'Inicio' },
  { key: 'productos', href: '/productos', label: 'Productos' },
  { key: 'ventas', href: '/ventas', label: 'Ventas' },
  { key: 'presupuestos', href: '/presupuestos', label: 'Presupuestos' },
  { key: 'proveedores', href: '/proveedores', label: 'Proveedores' },
  { key: 'contaduria', href: '/contaduria', label: 'Contaduría' }
]

export default function Nav({ activo }) {
  return (
    <nav className="mb-8 flex w-fit flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <a
        href="/"
        className={`flex items-center rounded-lg px-2 py-1 ${activo === 'inicio' ? 'bg-orange-50' : ''}`}
        aria-label="Ir al inicio"
      >
        <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
      </a>

      {paginas.map((p) => (
        <a
          key={p.key}
          href={p.href}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
            activo === p.key
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {p.label}
        </a>
      ))}

      <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-2">
        <span className="hidden max-w-40 truncate text-xs text-slate-500 sm:block">
          <LogoutLabel />
        </span>
        <LogoutButton />
      </div>
    </nav>
  )
}

function LogoutLabel() {
  const { usuario } = useAuth()
  if (!usuario) return null
  return usuario.email
}

function LogoutButton() {
  const { usuario } = useAuth()
  if (!usuario) return null
  return (
    <button
      type="button"
      onClick={() => cerrarSesion()}
      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
    >
      Salir
    </button>
  )
}
