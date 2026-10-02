/**
 * Los errores del servidor, en el campo que corresponde (02-10-2026).
 *
 * El back y el micro mandan `campos: [{ campo, regla, mensaje }]` (ver
 * `traductor-de-errores.ts`). Esto los reparte:
 *
 *   · cada `campo` del servidor va a SU campo del formulario (con un mapa de
 *     nombres cuando difieren: `firstName` → `displayName`);
 *   · el primero con error recibe el foco;
 *   · lo que no tiene dónde ir (un 5xx, la red, un campo que el formulario no
 *     muestra) queda en `sueltos`, y SÓLO eso va a un toast.
 *
 * Dos puertas:
 *   · `repartirErroresDelServidor` — función pura, para formularios con
 *     estado propio (el onboarding del inquilino).
 *   · `aplicarErroresDelServidor` — para react-hook-form: `setError` en cada
 *     campo, `setFocus` en el primero y el toast de lo suelto.
 */

import { toast } from 'sonner'
import {
  camposDelError,
  leerFallo,
  mensajeParaLaPersona,
  type CampoConError,
} from './traductor-de-errores'

export interface OpcionesDelReparto<Campo extends string = string> {
  /**
   * Nombre del servidor → nombre del formulario, cuando difieren. Se busca la
   * ruta completa (`agency.nit`) y, si no está, la hoja (`nit`). Un valor
   * `null` dice «este campo no se muestra»: su error va a `sueltos`.
   */
  mapa?: Partial<Record<string, Campo | null>>
  /**
   * Los campos que el formulario sí muestra. Si se pasa, un campo del
   * servidor que no esté acá (ni en el mapa) va a `sueltos`.
   */
  campos?: readonly Campo[]
  /** Lo que dice el toast si el error no trae nada legible. */
  porDefecto?: string
  /** Lo que se estaba haciendo («guardar tu perfil»), para el texto de un 5xx. */
  accion?: string
}

export interface ErroresRepartidos<Campo extends string = string> {
  /** Un mensaje por campo del formulario (el primero que mandó el servidor). */
  porCampo: Partial<Record<Campo, string>>
  /** El orden en que llegaron: el primero recibe el foco. */
  orden: Campo[]
  /** Lo que no va en ningún campo: va a un toast o al pie del formulario. */
  sueltos: string[]
  /** Los `campos` tal como los mandó el servidor. */
  delServidor: CampoConError[]
}

function campoDelFormulario<Campo extends string>(
  delServidor: string,
  { mapa, campos }: OpcionesDelReparto<Campo>,
): Campo | null {
  const hoja = delServidor.split('.').filter((p) => !/^\d+$/.test(p)).pop() ?? delServidor
  for (const clave of [delServidor, hoja]) {
    if (mapa && Object.prototype.hasOwnProperty.call(mapa, clave)) {
      return mapa[clave] ?? null
    }
  }
  if (!campos) return delServidor as Campo
  if ((campos as readonly string[]).includes(delServidor)) return delServidor as Campo
  if ((campos as readonly string[]).includes(hoja)) return hoja as Campo
  return null
}

export function repartirErroresDelServidor<Campo extends string = string>(
  error: unknown,
  opciones: OpcionesDelReparto<Campo> = {},
): ErroresRepartidos<Campo> {
  const delServidor = camposDelError(error)
  const porCampo: Partial<Record<Campo, string>> = {}
  const orden: Campo[] = []
  const sueltos: string[] = []

  for (const c of delServidor) {
    const destino = campoDelFormulario(c.campo, opciones)
    if (destino === null) {
      sueltos.push(c.mensaje)
      continue
    }
    if (porCampo[destino] === undefined) {
      porCampo[destino] = c.mensaje
      orden.push(destino)
    }
  }

  // Sin campos (un 409 sin campos, un 5xx, la red…): el mensaje general.
  if (delServidor.length === 0) {
    sueltos.push(mensajeParaLaPersona(error, { porDefecto: opciones.porDefecto, accion: opciones.accion }))
  }

  return {
    porCampo,
    orden,
    sueltos: Array.from(new Set(sueltos)),
    delServidor,
  }
}

/** Lo mínimo de `useForm()` que hace falta (así sirve con cualquier formulario). */
export interface FormularioConErrores<Campo extends string> {
  setError: (name: Campo, error: { type: string; message: string }, opciones?: { shouldFocus?: boolean }) => void
  setFocus?: (name: Campo) => void
}

export interface OpcionesDeAplicar<Campo extends string> extends OpcionesDelReparto<Campo> {
  /** `false` para no mostrar el toast de lo suelto (la pantalla lo pinta). */
  toast?: boolean
}

/**
 * react-hook-form: pone los errores del servidor en sus campos, enfoca el
 * primero y deja en un toast SÓLO lo que quedó sin campo. Devuelve el reparto
 * por si la pantalla quiere pintar `sueltos` en otro lado.
 *
 *     } catch (e) {
 *       aplicarErroresDelServidor(e, form, { mapa: { firstName: 'nombre' } })
 *     }
 */
export function aplicarErroresDelServidor<Campo extends string>(
  error: unknown,
  form: FormularioConErrores<Campo>,
  opciones: OpcionesDeAplicar<Campo> = {},
): ErroresRepartidos<Campo> {
  const reparto = repartirErroresDelServidor(error, opciones)
  for (const campo of reparto.orden) {
    const mensaje = reparto.porCampo[campo]
    if (mensaje) form.setError(campo, { type: 'server', message: mensaje })
  }
  const primero = reparto.orden[0]
  if (primero) {
    try {
      form.setFocus?.(primero)
    } catch {
      // Un campo sin `ref` registrado (un Select controlado) no se puede enfocar.
    }
  }
  if (opciones.toast !== false && reparto.sueltos.length > 0) {
    toast.error(reparto.sueltos.join(' · '))
  }
  return reparto
}

/** ¿Trae el error problemas por campo? (para decidir si vale la pena repartir). */
export function traeErroresPorCampo(error: unknown): boolean {
  return leerFallo(error).campos.length > 0
}
