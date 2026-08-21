const paginas = [
  { key: 'inicio', href: '/', label: 'Inicio' },
  { key: 'productos', href: '/productos', label: 'Productos' },
  { key: 'ventas', href: '/ventas', label: 'Ventas' }
]

export default function Nav({ activo }) {
  return (
    <nav className="mb-8 flex w-fit gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {paginas.map((p) => (
        <a
          key={p.key}
          href={p.href}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
            activo === p.key
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {p.label}
        </a>
      ))}
    </nav>
  )
}
