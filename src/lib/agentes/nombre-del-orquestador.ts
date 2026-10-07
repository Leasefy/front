import type { AgentOrbPaletteName } from '@leasefy/cadence'

/**
 * EL nombre del orquestador — el que contesta en el chat y le pasa el trabajo
 * a los especialistas. Es PROVISIONAL: Nico elige entre las tres propuestas de
 * abajo (02-10-2026). Se cambia AQUÍ y en ningún otro lado: el registro del
 * equipo, el modal y los textos con `{{orquestador}}` lo leen de esta
 * constante.
 *
 * 🔴 «Chat» y «piloto automático» son cosas distintas: el orquestador es el
 * que responde en el CHAT. El piloto automático es el modo en que los agentes
 * trabajan solos; no se llama así al chat ni al orquestador.
 */
export const NOMBRE_DEL_ORQUESTADOR = 'Ori'

/** La paleta y la semilla de su orbe (se cambian junto con el nombre). */
export const ORBE_DEL_ORQUESTADOR: { paleta: AgentOrbPaletteName; semilla: string } = {
  paleta: 'aurora',
  semilla: 'ori',
}

export interface PropuestaDeNombre {
  nombre: string
  paleta: AgentOrbPaletteName
  semilla: string
  /** Por qué ese nombre, en una frase. */
  porQue: string
}

/**
 * Las tres propuestas, con su orbe. Cortas, fáciles de decir en español y sin
 * chocar con los nombres que ya existen en el código (Laura, Cobri/Payu,
 * Vinci, Niti/Gaby, Imana, Avali, Fixi, Vidi, Naira y los sub-agentes de
 * pagos: Nicolás, Valentina, Samuel, Sofía).
 */
export const PROPUESTAS_DE_NOMBRE: readonly PropuestaDeNombre[] = [
  {
    nombre: 'Ori',
    paleta: 'aurora',
    semilla: 'ori',
    porQue: 'De «orquesta» y «orienta». Dos sílabas, sin género, y suena de la misma familia que Cobri, Niti y Fixi.',
  },
  {
    nombre: 'Tino',
    paleta: 'dusk',
    semilla: 'tino',
    porQue: 'De «tener buen tino»: criterio para decidir a quién llamar. Muy nuestro y fácil de decir.',
  },
  {
    nombre: 'Alma',
    paleta: 'bloom',
    semilla: 'alma',
    porQue: 'El alma del equipo: quien habla contigo y une a los demás. Cálido y conocido por todos.',
  },
]
