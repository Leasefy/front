/**
 * Quién cerró la sesión. Diagnóstico de producción (30-10-2026): una sesión
 * recién abierta se cerraba al segundo y los logs sólo mostraban el `/logout`,
 * no al que lo pidió. Cada camino de cierre llama acá con su nombre; la pila
 * dice el resto. No cambia ningún comportamiento.
 */
const CLAVE = 'leasefy:auth:ultima-traza-de-cierre'

export interface TrazaDeCierre {
  origen: string
  en: string
  pila: string
}

export function trazarCierre(origen: string): void {
  const pila = new Error('trazarCierre').stack ?? ''
  try {
    console.warn(`[auth] cierre (${origen})`, pila)
  } catch {
    // la consola nunca impide cerrar
  }
  try {
    const traza: TrazaDeCierre = { origen, en: new Date().toISOString(), pila: pila.slice(0, 1500) }
    sessionStorage.setItem(CLAVE, JSON.stringify(traza))
  } catch {
    // sin almacenamiento no hay traza guardada
  }
}

export function ultimaTrazaDeCierre(): TrazaDeCierre | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    return crudo ? (JSON.parse(crudo) as TrazaDeCierre) : null
  } catch {
    return null
  }
}
