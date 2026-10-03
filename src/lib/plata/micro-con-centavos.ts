/**
 * ¿El MICRO ya guarda la plata de `agent.*` al centavo? («centavos en todo»,
 * C4, 03-10-2026; Q4 a de C3-FRONT).
 *
 * El micro responde `GET /config/plata` → `{ conCentavos: { agent: boolean } }`
 * (`agent/src/server/routes/config-de-plata.ts`): su interruptor
 * `PLATA_CON_CENTAVOS` y su migración `20261003180000_centavos_agent` ya
 * aplicada. Es el espejo, para los formularios que escriben en el micro, de lo
 * que `con-centavos.ts` hace con el back.
 *
 * Igual que con el back: sólo un `true` literal prende; un micro viejo (404),
 * sin `NEXT_PUBLIC_AGENT_URL` o una falla = sin centavos, EXACTAMENTE como hoy.
 * Se pregunta una vez y la respuesta se recuerda 60 s, compartida.
 */

/** El cuerpo de `GET /config/plata` del micro → ¿guarda centavos? */
export function leerConfigDePlataDelMicro(cuerpo: unknown): boolean {
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return false
  const mapa = (cuerpo as { conCentavos?: unknown }).conCentavos
  if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) return false
  return (mapa as Record<string, unknown>).agent === true
}

const VIGENCIA_MS = 60_000

let estado = false
let venceEn = 0
let enVuelo: Promise<boolean> | null = null
const oyentes = new Set<() => void>()

function fijar(nuevo: boolean, vigenteHasta: number): void {
  venceEn = vigenteHasta
  const cambio = nuevo !== estado
  estado = nuevo
  if (cambio) for (const oyente of oyentes) oyente()
}

export function plataDelMicroConCentavosAhora(): boolean {
  return estado
}

export function suscribirseALaPlataDelMicro(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

/** Pregunta al micro si la respuesta ya venció. Nunca lanza: una falla es «no» por 60 s. */
export function refrescarPlataDelMicro(): Promise<boolean> {
  if (Date.now() < venceEn) return Promise.resolve(estado)
  if (enVuelo) return enVuelo
  const base = process.env.NEXT_PUBLIC_AGENT_URL
  const pregunta = (
    base
      ? globalThis
          .fetch(`${base.replace(/\/+$/, '')}/config/plata`)
          .then((r) => (r.ok ? r.json() : null))
          .then(leerConfigDePlataDelMicro, () => false)
      : Promise.resolve(false)
  )
    .then((nuevo) => {
      fijar(nuevo, Date.now() + VIGENCIA_MS)
      return nuevo
    })
    .finally(() => {
      if (enVuelo === pregunta) enVuelo = null
    })
  enVuelo = pregunta
  return pregunta
}

/** Sólo para pruebas: como si el micro hubiera respondido (`null` = olvidarlo). */
export function fijarPlataDelMicroParaPruebas(cuerpo: unknown | null): void {
  enVuelo = null
  if (cuerpo === null) {
    fijar(false, 0)
    return
  }
  fijar(leerConfigDePlataDelMicro(cuerpo), Date.now() + VIGENCIA_MS)
}
