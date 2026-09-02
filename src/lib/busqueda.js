// Búsqueda por tokens: divide la búsqueda en palabras y exige que TODAS
// coincidan (en al menos uno de los campos). Así "coca 500" encuentra
// productos cuyo nombre/código contengan "coca" Y "500".
// Los campos deben pasarse ya en minúsculas.
export function coincideBusqueda(query, campos) {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  if (tokens.length === 0) return true

  return tokens.every((token) =>
    campos.some((campo) => campo.includes(token))
  )
}
