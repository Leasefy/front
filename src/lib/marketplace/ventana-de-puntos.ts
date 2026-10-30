/**
 * Los puntos del carrusel cuando hay muchas fotos (Nico, 27-10-2026: «si hay muchas, ¿cómo se vería? pueden haber
 * miles»). Como Instagram: a lo sumo `maximo` puntos, una ventana que se corre con la foto activa, y los de las
 * orillas más chicos cuando hay más fotos de ese lado. Puro.
 */
export interface PuntoDelCarrusel {
  indice: number
  chico: boolean
}

export function ventanaDePuntos(total: number, activa: number, maximo = 5): PuntoDelCarrusel[] {
  if (total <= 0) return []
  const n = Math.min(total, maximo)
  const mitad = (n - (n % 2)) / 2
  let desde = Math.min(Math.max(0, activa - mitad), total - n)
  if (desde < 0) desde = 0
  return Array.from({ length: n }, (_, k) => {
    const indice = desde + k
    const hayMasAntes = desde > 0 && k === 0
    const hayMasDespues = desde + n < total && k === n - 1
    return { indice, chico: hayMasAntes || hayMasDespues }
  })
}
