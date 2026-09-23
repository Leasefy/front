'use client'

/**
 * La lógica del cierre por inactividad, sin React.
 *
 * Vive separada del hook porque es donde están todas las decisiones difíciles
 * —cross-tab, suspensión de la máquina, la pestaña de fondo— y ninguna de ellas
 * necesita un componente para probarse.
 *
 * ── El reloj es un timestamp, no un contador ────────────────────────────────
 *
 * Nada acá cuenta segundos. Todo compara `Date.now()` contra la marca de la
 * última actividad. Es deliberado: `setInterval` en una pestaña de fondo lo
 * estrangula el navegador a ~1/minuto, y si la notebook se suspende dos horas
 * el intervalo simplemente no corre. Un contador de ticks creería que pasaron
 * dos minutos; la resta de timestamps sabe que pasaron dos horas y cierra, que
 * es justo lo que un cierre por inactividad tiene que hacer.
 *
 * ── Por qué la marca vive en localStorage ───────────────────────────────────
 *
 * Porque si no, cada pestaña cuenta su propia inactividad y la que quedó de
 * fondo cierra la sesión mientras trabajas en otra. `localStorage` es del
 * origen, no de la pestaña: escribir ahí es lo que hace que "estoy activo" en
 * una valga para todas.
 */

/** Marca compartida entre pestañas con el instante de la última actividad. */
export const CLAVE_ULTIMA_ACTIVIDAD = 'leasefy:auth:ultima-actividad'

/** Cuánto dura el aviso previo con la cuenta regresiva. */
export const AVISO_MS = 60_000

/**
 * Cada cuánto se persiste la marca, como mucho.
 *
 * Sin este freno, mover el mouse escribiría en localStorage cientos de veces
 * por segundo — y cada escritura despierta el evento `storage` en TODAS las
 * otras pestañas. El tope no pierde precisión que importe: la unidad de medida
 * son minutos.
 */
const PERIODO_DE_ESCRITURA_MS = 5_000

/**
 * Si nadie configuró nada, la sesión inactiva se cierra a las 4 horas.
 *
 * Antes la variable ausente APAGABA la función (endurecimiento de la sesión,
 * 23-09): un despliegue que se olvidara de `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES`
 * dejaba abierta para siempre la sesión de un equipo compartido en una oficina
 * — con acceso a giros y cuentas bancarias de propietarios—. Ahora apagarla es
 * una decisión explícita (`0`), no un olvido. 240 es lo que ya usaba el entorno
 * local: una jornada de medio día sin tocar nada.
 */
export const MINUTOS_DE_INACTIVIDAD_POR_DEFECTO = 240

/**
 * Minutos de inactividad configurados. `0` = apagado A PROPÓSITO.
 *
 * Ausente, vacío o ilegible → el valor por defecto, nunca «apagado» y nunca
 * «tope de 0 minutos»: un typo en el `.env` no puede ni convertirse en una
 * expulsión masiva (igual que `AUTH_MAX_SESSION_AGE_DAYS` en el backend) ni
 * dejar sesiones abiertas para siempre.
 *
 * Se lee de `process.env` en cada llamada —y no en una constante de módulo—
 * porque Next inlinea las `NEXT_PUBLIC_*` en build y los tests necesitan poder
 * cambiarla.
 */
export function minutosDeInactividad(): number {
  const crudo = process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES?.trim()
  if (crudo === '0') return 0
  const min = Number(crudo)
  if (!crudo || !Number.isFinite(min) || min <= 0) return MINUTOS_DE_INACTIVIDAD_POR_DEFECTO
  return min
}

/** El tope en milisegundos, o 0 si la función está apagada. */
export function topeDeInactividadMs(): number {
  return minutosDeInactividad() * 60_000
}

/** ¿Está activada la función? */
export function hayCierrePorInactividad(): boolean {
  return topeDeInactividadMs() > 0
}

let ultimaEscritura = 0

/**
 * Registrar actividad del usuario.
 *
 * @param forzar - saltea el freno de escritura. Lo usa el botón "Continuar" del
 *   aviso, donde la marca DEBE quedar escrita ya mismo: si cae dentro de la
 *   ventana del freno no se persiste, las otras pestañas nunca se enteran y el
 *   aviso reaparece en todas al segundo siguiente.
 */
export function registrarActividad(forzar = false): void {
  if (typeof window === 'undefined') return

  const ahora = Date.now()
  if (!forzar && ahora - ultimaEscritura < PERIODO_DE_ESCRITURA_MS) return

  ultimaEscritura = ahora
  try {
    window.localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(ahora))
  } catch {
    // localStorage puede fallar en modo privado. Sin marca compartida el hook
    // cae a su reloj en memoria: peor entre pestañas, pero nunca cierra de más.
  }
}

/**
 * El instante de la última actividad conocida.
 *
 * Sin marca todavía (primera carga) devuelve "ahora": recién llegado NO es lo
 * mismo que inactivo hace horas, y arrancar en 0 cerraría la sesión apenas
 * carga la app.
 */
export function ultimaActividad(): number {
  if (typeof window === 'undefined') return Date.now()
  try {
    const crudo = window.localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)
    const marca = Number(crudo)
    if (!Number.isFinite(marca) || marca <= 0) return Date.now()
    // Una marca del futuro sólo sale de un reloj que se movió hacia atrás.
    // Tratarla como "ahora" evita quedar inactivo por horas sin motivo.
    return Math.min(marca, Date.now())
  } catch {
    return Date.now()
  }
}

/** Olvida la marca. Para el arranque de sesión y para los tests. */
export function limpiarActividad(): void {
  ultimaEscritura = 0
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CLAVE_ULTIMA_ACTIVIDAD)
  } catch {
    // Nada que hacer: la próxima escritura la pisa igual.
  }
}

/** En qué punto está la sesión respecto del tope de inactividad. */
export type EstadoDeInactividad =
  /** Hay actividad reciente: no mostrar nada. */
  | { fase: 'activa' }
  /** Falta poco: mostrar el aviso con la cuenta regresiva. */
  | { fase: 'aviso'; segundosRestantes: number }
  /** Se acabó: cerrar la sesión. */
  | { fase: 'vencida' }

/**
 * Evaluar el estado en un instante dado.
 *
 * Función pura sobre `(ahora, ultimaActividad, tope)` — sin timers, sin
 * storage, sin React. Es la única regla del módulo y por eso es la que se
 * prueba en serio.
 */
export function evaluarInactividad(
  ahora: number,
  marca: number,
  topeMs: number,
  avisoMs: number = AVISO_MS,
): EstadoDeInactividad {
  if (topeMs <= 0) return { fase: 'activa' }

  const inactivoHace = ahora - marca
  if (inactivoHace >= topeMs) return { fase: 'vencida' }

  const faltaMs = topeMs - inactivoHace
  if (faltaMs > avisoMs) return { fase: 'activa' }

  // Se redondea hacia arriba para que la cuenta empiece en 60 y no en 59: un
  // aviso que arranca en 59 se lee como si ya hubiera empezado a correr antes
  // de aparecer.
  return { fase: 'aviso', segundosRestantes: Math.ceil(faltaMs / 1000) }
}
