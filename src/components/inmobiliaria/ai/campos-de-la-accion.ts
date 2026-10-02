import type { CampoDeLaAccion, WorkItemAction } from '@/lib/api/work-item'

/**
 * Los campos que una acción de la cola humana DECLARA (02-10-2026): validar
 * antes de mandar y armar el cuerpo con sus claves.
 *
 * El porqué: «Resolver» una escalación mandaba `{ reason }` —el motivo de
 * siempre— y el micro pide `{ category, resolution_text }`: 400 siempre. Ahora
 * el micro dice qué lleva el cuerpo (`WorkItemAction.campos`) y la cola pinta
 * esos campos (`FormularioDeLaAccion`). Una acción SIN `campos` sigue con el
 * motivo de siempre.
 *
 * Funciones puras: las usan la cola (`ColaHumana`) y el detalle del caso
 * (`AccionSugerida`), y se prueban sin montar nada.
 */

export type ValoresDeLaAccion = Record<string, string>
export type ErroresDeLaAccion = Partial<Record<string, string>>

/** ¿La acción declara su cuerpo? (al menos un campo) */
export function camposDeLaAccion(action: Pick<WorkItemAction, 'campos'>): CampoDeLaAccion[] {
  return Array.isArray(action.campos) ? action.campos.filter((c) => c && typeof c.nombre === 'string' && c.nombre) : []
}

export function tieneCampos(action: Pick<WorkItemAction, 'campos'>): boolean {
  return camposDeLaAccion(action).length > 0
}

/** Todo vacío: ni la primera opción elegida por la persona. */
export function valoresIniciales(campos: readonly CampoDeLaAccion[]): ValoresDeLaAccion {
  return Object.fromEntries(campos.map((c) => [c.nombre, '']))
}

/** El largo que cuenta el micro: sin espacios a los lados (`z.string().trim()`). */
export function largoDelTexto(valor: string | undefined): number {
  return (valor ?? '').trim().length
}

const enMiles = (n: number) => n.toLocaleString('es-CO')

/**
 * El error de UN campo, o `undefined` si está bien. Con las mismas reglas que
 * el micro: obligatorio, la opción entre las que declaró, mínimo y máximo de
 * caracteres contando sin espacios a los lados.
 */
export function errorDelCampo(campo: CampoDeLaAccion, valor: string | undefined): string | undefined {
  const limpio = (valor ?? '').trim()
  if (campo.tipo === 'opcion') {
    if (!limpio) return campo.obligatorio ? `Elige una opción en «${campo.etiqueta}».` : undefined
    const opciones = campo.opciones ?? []
    if (opciones.length > 0 && !opciones.some((o) => o.valor === limpio)) {
      return `Elige una de las opciones de «${campo.etiqueta}».`
    }
    return undefined
  }
  if (!limpio) return campo.obligatorio ? `Completa «${campo.etiqueta}».` : undefined
  if (typeof campo.minimo === 'number' && limpio.length < campo.minimo) {
    return `«${campo.etiqueta}» debe tener al menos ${enMiles(campo.minimo)} ${campo.minimo === 1 ? 'carácter' : 'caracteres'}.`
  }
  if (typeof campo.maximo === 'number' && limpio.length > campo.maximo) {
    return `«${campo.etiqueta}» puede tener hasta ${enMiles(campo.maximo)} caracteres.`
  }
  return undefined
}

/** Los errores de todos los campos, en el orden en que se declararon. */
export function erroresDelCliente(
  campos: readonly CampoDeLaAccion[],
  valores: ValoresDeLaAccion,
): { porCampo: ErroresDeLaAccion; orden: string[] } {
  const porCampo: ErroresDeLaAccion = {}
  const orden: string[] = []
  for (const campo of campos) {
    const error = errorDelCampo(campo, valores[campo.nombre])
    if (error) {
      porCampo[campo.nombre] = error
      orden.push(campo.nombre)
    }
  }
  return { porCampo, orden }
}

/**
 * El cuerpo, con las claves que declaró el micro. El texto va sin espacios a
 * los lados; un campo opcional vacío no viaja.
 */
export function cuerpoDeLaAccion(
  campos: readonly CampoDeLaAccion[],
  valores: ValoresDeLaAccion,
): Record<string, string> {
  const cuerpo: Record<string, string> = {}
  for (const campo of campos) {
    const limpio = (valores[campo.nombre] ?? '').trim()
    if (!limpio && !campo.obligatorio) continue
    cuerpo[campo.nombre] = limpio
  }
  return cuerpo
}
