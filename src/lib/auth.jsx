import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null)
      setCargando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user ?? null)
      setCargando(false)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo(() => ({ usuario, cargando }), [usuario, cargando])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

export async function iniciarSesion({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
}

export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}
