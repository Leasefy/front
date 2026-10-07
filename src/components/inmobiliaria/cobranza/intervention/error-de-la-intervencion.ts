import { leerFallo } from '@/lib/errores/traductor-de-errores'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'

/**
 * Qué decir cuando una intervención manual no salió (02-10-2026, tanda 2 de
 * errores, A6): pausar, forzar etapa, llamada y WhatsApp manuales.
 *
 * Antes cada modal pintaba el status crudo («409», «500») y, si la red caía,
 * «Acción fallida — intenta de nuevo». Ahora:
 *
 *  · una VALLA LEGAL (409 con `valla`: opt-out, horario de la Ley 2300,
 *    frecuencia) dice su explicación. El micro la manda en español en `error`
 *    (contrato `CobranzaManualCallBloqueada`), y `falloDelMicro` no muestra el
 *    `error` del cuerpo viejo: se lee acá, decidiendo por `valla` (un código),
 *    nunca por el texto;
 *  · un 403 dice que el rol no puede intervenir; un 404, que el deudor no está
 *    o no tiene teléfono (el micro lo dice en inglés);
 *  · un 400 con `campos` va a su campo (el motivo);
 *  · lo demás, el traductor: un 5xx «de nuestro lado» con la referencia y
 *    «conexión» SÓLO si el `fetch` no salió.
 */
export interface ErroresDeLaIntervencion<Campo extends string> {
  porCampo: Partial<Record<Campo, string>>
  /** El primero con error (recibe el foco). */
  primero: Campo | undefined
  /** Lo que va abajo, fuera de los campos. `null` = nada. */
  general: string | null
}

export function explicacionDeLaValla(error: unknown): string | null {
  const e = error as { status?: unknown; detalle?: Record<string, unknown> } | null
  if (!e || e.status !== 409 || !e.detalle) return null
  const { valla, error: explicacion } = e.detalle
  if (typeof valla !== 'string' || typeof explicacion !== 'string') return null
  return explicacion.trim() || null
}

export function erroresDeLaIntervencion<Campo extends string>(
  error: unknown,
  opciones: {
    campos: readonly Campo[]
    porDefecto: string
    /** En infinitivo: «pausar la cobranza». */
    accion: string
    /** Lo que se dice con un 404 (el deudor no está, o no tiene teléfono). */
    noEncontrado?: string
  },
): ErroresDeLaIntervencion<Campo> {
  const valla = explicacionDeLaValla(error)
  if (valla) return { porCampo: {}, primero: undefined, general: valla }

  const { status } = leerFallo(error)
  if (status === 403) {
    return {
      porCampo: {},
      primero: undefined,
      general: 'Tu rol no puede intervenir en la cobranza. Pídeselo a un administrador.',
    }
  }
  if (status === 404) {
    return {
      porCampo: {},
      primero: undefined,
      general: opciones.noEncontrado ?? 'No encontramos a este deudor. Puede que ya no esté en la cartera.',
    }
  }

  const reparto = repartirErroresDelServidor<Campo>(error, {
    campos: opciones.campos,
    porDefecto: opciones.porDefecto,
    accion: opciones.accion,
  })
  return {
    porCampo: reparto.porCampo,
    primero: reparto.orden[0],
    general: reparto.sueltos.length > 0 ? reparto.sueltos.join(' · ') : null,
  }
}

/** El tope del motivo de toda intervención (`reason: z.string().min(1).max(500)` en el micro). */
export const LARGO_MAXIMO_DEL_MOTIVO = 500

/** El error del motivo antes de enviar, o `null` si está bien. */
export function errorDelMotivo(motivo: string, minimo: number): string | null {
  const largo = motivo.trim().length
  if (largo < minimo) return `Escribe el motivo: al menos ${minimo} caracteres.`
  if (largo > LARGO_MAXIMO_DEL_MOTIVO) {
    return `El motivo puede tener hasta ${LARGO_MAXIMO_DEL_MOTIVO} caracteres.`
  }
  return null
}
