/**
 * Correr algo largo EN EL CENTRO DE PROCESOS — la base común (01-10-2026).
 *
 * Nico (22-09): «creemos un CENTRO DE PROCESOS para esas cargas y descargas
 * de todos los documentos que tenemos en la plataforma». Cada pantalla que
 * lanzaba algo largo se inventaba su propia espera; acá hay dos formas, y
 * sólo dos, de mandar un trabajo al centro:
 *
 * 1. `lanzarEnElCentro` — el trabajo lo hace el SERVIDOR. Un endpoint del
 *    back que usa `procesos.lanzar(...)` responde 202 `{ procesoId }` de una;
 *    acá se anuncia, se abre el centro con ese proceso arriba y se lo SIGUE
 *    hasta que termina para refrescar las pantallas.
 *
 * 2. `correrEnElNavegador` — el trabajo lo hace la PESTAÑA: un xlsx que arma
 *    el navegador, un bucle que aprueba 40 dispersiones de a 4. El navegador
 *    abre su propio proceso (`POST /inmobiliaria/procesos`), cuenta el avance,
 *    ofrece «Detener», sube el archivo al terminar o dice que falló.
 *
 * Las dos se pueden llamar desde un `onClick` y olvidarse: el seguimiento no
 * depende de que el componente siga montado.
 */

import { invalidar } from '@/lib/api/refresco-de-datos'
import {
  RECURSO_DE_PROCESOS,
  abrirCentroDeProcesos,
  anunciarProceso,
  procesosApi,
  type TipoDelNavegador,
} from '@/lib/api/procesos.service'
import type { Proceso, TipoDeProceso } from '@/lib/api/procesos.types'
import { descargarBlob } from '@/lib/reportes/exportables'
import { mapWithConcurrency } from '@/lib/utils/concurrency'
import { registrarDetenerEnElNavegador } from '@/components/procesos/detener-en-el-navegador'

/** Cada cuánto se mira un proceso que se está siguiendo. */
export const MS_ENTRE_CONSULTAS = 2500
/**
 * Hasta cuándo se lo sigue. Generoso a propósito: una emisión del mes puede
 * tardar. Pasado esto el centro lo sigue mostrando; sólo se deja de refrescar
 * la pantalla cuando termine.
 */
export const MS_MAXIMOS_DE_SEGUIMIENTO = 2 * 60 * 60 * 1000
/** Errores seguidos al consultar antes de rendirse (la red se cayó, un 404). */
const ERRORES_SEGUIDOS_MAXIMOS = 5
/** Como mucho un avance por segundo: el centro consulta cada pocos segundos. */
export const MS_ENTRE_AVANCES = 1000

const ESTADOS_FINALES: ReadonlySet<Proceso['estado']> = new Set(['TERMINADO', 'FALLO', 'CANCELADO'])

const esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms))

/** El mensaje de un error, en el texto que ya leía la pantalla. */
function mensajeDelError(err: unknown): string {
  const m = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  return m.trim() || 'El proceso falló sin decir por qué.'
}

function invalidarTodos(recursos: readonly string[] | undefined): void {
  for (const r of recursos ?? []) {
    try {
      invalidar(r)
    } catch {
      /* un oyente roto no frena a los demás */
    }
  }
}

// ══ 1. Lo que corre en el SERVIDOR ═════════════════════════════════════════

export interface OpcionesDeSeguimiento {
  /** Los recursos de `refresco-de-datos` a invalidar cuando termine (`'cobros'`…). */
  recursos?: readonly string[]
  /** Cuando llega a TERMINADO, FALLO o CANCELADO, con la vista final. */
  alTerminar?: (proceso: Proceso) => void
}

/** Los que ya se están siguiendo: lanzar dos veces el mismo id no consulta doble. */
const siguiendo = new Map<string, Promise<Proceso | null>>()

/**
 * Sigue un proceso hasta que termina (o hasta `MS_MAXIMOS_DE_SEGUIMIENTO`) y
 * entonces invalida `recursos` y llama `alTerminar`. Resuelve con la vista
 * final, o `null` si no se pudo saber (se rindió o llegó al tope: igual
 * invalida, por si algo alcanzó a cambiar). Nunca rechaza.
 */
export function seguirProceso(procesoId: string, opciones: OpcionesDeSeguimiento = {}): Promise<Proceso | null> {
  const ya = siguiendo.get(procesoId)
  const seguimiento = (ya ?? consultarHastaQueTermine(procesoId)).then((proceso) => {
    invalidarTodos(opciones.recursos)
    if (proceso && opciones.alTerminar) {
      try {
        opciones.alTerminar(proceso)
      } catch {
        /* lo que haga la pantalla no tumba el seguimiento */
      }
    }
    return proceso
  })
  return seguimiento
}

function consultarHastaQueTermine(procesoId: string): Promise<Proceso | null> {
  const promesa = (async () => {
    const tope = Date.now() + MS_MAXIMOS_DE_SEGUIMIENTO
    let errores = 0
    while (Date.now() < tope) {
      await esperar(MS_ENTRE_CONSULTAS)
      try {
        const proceso = await procesosApi.ver(procesoId)
        errores = 0
        if (ESTADOS_FINALES.has(proceso.estado)) {
          invalidar(RECURSO_DE_PROCESOS)
          return proceso
        }
      } catch {
        errores += 1
        if (errores >= ERRORES_SEGUIDOS_MAXIMOS) return null
      }
    }
    return null
  })()
  siguiendo.set(procesoId, promesa)
  void promesa.finally(() => siguiendo.delete(procesoId))
  return promesa
}

export interface LanzarEnElCentro extends OpcionesDeSeguimiento {
  /** Cómo se lee en el aviso: «Generando los cobros de octubre». */
  titulo: string
  /** El tipo que va a abrir el back (`GENERACION`…): apaga el «Arrancando…» del centro. */
  tipoDeProceso: TipoDeProceso
  /** La llamada al back que usa `procesos.lanzar` y responde 202 `{ procesoId }`. */
  pedir: () => Promise<{ procesoId: string }>
}

/**
 * Lanza un trabajo del SERVIDOR en el centro: anuncia, pide, abre el centro
 * con el proceso arriba y lo sigue en segundo plano.
 *
 * Devuelve `{ procesoId }` en cuanto el back responde — el seguimiento sigue
 * solo, aunque la pantalla se desmonte. Si `pedir()` falla (un 400, un 503 sin
 * la migración), el error le llega a quien llamó, tal cual: la pantalla lo
 * muestra como siempre.
 */
export async function lanzarEnElCentro({
  titulo,
  tipoDeProceso,
  pedir,
  recursos,
  alTerminar,
}: LanzarEnElCentro): Promise<{ procesoId: string }> {
  anunciarProceso({ titulo, tipoDeProceso })
  const { procesoId } = await pedir()
  abrirCentroDeProcesos({ procesoId, titulo, tipoDeProceso })
  void seguirProceso(procesoId, { recursos, alTerminar })
  return { procesoId }
}

// ══ 2. Lo que corre en el NAVEGADOR ════════════════════════════════════════

/** Lo que recibe el trabajo para contar su avance y saber si tiene que parar. */
export interface ContextoDelTrabajo {
  /** El proceso del centro, o `null` si corre sin él (el back no lo tiene). */
  readonly procesoId: string | null
  /**
   * Cuenta lo hecho. Devuelve `false` si hay que PARAR (la persona tocó
   * «Detener», o alguien lo canceló desde el centro): el trabajo decide dónde
   * cortar, entre dos pasos. Manda como mucho un avance por segundo.
   */
  avanzar(hechos: number, extra?: { total?: number; mensaje?: string }): Promise<boolean>
  /** Lo último que se supo, sin ir al back: para mirar entre pasos. */
  debeParar(): boolean
}

/** Lo que deja el trabajo al terminar. */
export interface ResultadoDelTrabajo {
  /** El archivo que armó: se sube al centro y se baja desde ahí. */
  archivo?: { blob: Blob; nombre: string }
  /** Cómo terminó, en palabras: «40 aprobadas, 2 con error». */
  mensaje?: string
  /** Un título mejor que el de la salida, si sólo al final se sabe. */
  titulo?: string
}

export interface CorrerEnElNavegador<R extends ResultadoDelTrabajo | void> {
  tipo: TipoDelNavegador
  /** Cómo se lee en el centro: «Aprobar 40 dispersiones». */
  titulo: string
  total?: number
  trabajo: (ctx: ContextoDelTrabajo) => Promise<R>
  /** Los recursos de `refresco-de-datos` a invalidar al final (salga bien o mal). */
  recursos?: readonly string[]
}

export interface ResultadoDeCorrer<R> {
  procesoId: string | null
  /** `false` = corrió sin el centro (el back no lo pudo registrar). */
  enElCentro: boolean
  /** Paró antes de terminar porque lo detuvieron o lo cancelaron. */
  detenido: boolean
  resultado: R
}

/**
 * Corre un trabajo del NAVEGADOR en el centro de procesos.
 *
 * - Abre el proceso, lo anuncia y abre el centro con él arriba.
 * - Registra «Detener» en esta pestaña; desde otra, «Cancelar» llega por el
 *   avance (`cancelado: true`). En los dos casos `avanzar` devuelve `false`.
 * - Si `trabajo` deja un archivo, se sube al centro con `terminar`.
 * - Si `trabajo` lanza, el proceso queda FALLO con el mensaje y el error se
 *   RE-LANZA tal cual: la pantalla lo muestra como siempre.
 *
 * 🔴 Si el back no puede abrir el proceso (503 sin la migración, red caída),
 * el trabajo CORRE IGUAL, sin el centro: el avance no se manda a ningún lado
 * y el archivo, si hay, se descarga directo en el navegador — como se hacía
 * antes de que existiera el centro. Lo que funcionaba no se rompe.
 */
export async function correrEnElNavegador<R extends ResultadoDelTrabajo | void>({
  tipo,
  titulo,
  total,
  trabajo,
  recursos,
}: CorrerEnElNavegador<R>): Promise<ResultadoDeCorrer<R>> {
  let procesoId: string | null = null
  try {
    procesoId = (await procesosApi.crear({ tipo, titulo, ...(total !== undefined ? { total } : {}) })).procesoId
  } catch (err) {
    console.warn(`[centro de procesos] «${titulo}» corre sin el centro: ${mensajeDelError(err)}`)
  }

  try {
    if (!procesoId) return await correrSinElCentro(trabajo)
    return await correrConElCentro(procesoId, { tipo, titulo, trabajo })
  } finally {
    invalidarTodos(recursos)
  }
}

async function correrSinElCentro<R extends ResultadoDelTrabajo | void>(
  trabajo: (ctx: ContextoDelTrabajo) => Promise<R>,
): Promise<ResultadoDeCorrer<R>> {
  const resultado = await trabajo({
    procesoId: null,
    avanzar: async () => true,
    debeParar: () => false,
  })
  const archivo = (resultado as ResultadoDelTrabajo | undefined)?.archivo
  if (archivo) descargarBlob(archivo.blob, archivo.nombre)
  return { procesoId: null, enElCentro: false, detenido: false, resultado }
}

async function correrConElCentro<R extends ResultadoDelTrabajo | void>(
  procesoId: string,
  { tipo, titulo, trabajo }: { tipo: TipoDelNavegador; titulo: string; trabajo: (ctx: ContextoDelTrabajo) => Promise<R> },
): Promise<ResultadoDeCorrer<R>> {
  // En un objeto y no en dos `let`: los cambian closures (Detener, el avance)
  // y TypeScript no ve esas asignaciones al estrechar el tipo.
  const estado: { parar: boolean; cancelacion: Promise<unknown> | null } = { parar: false, cancelacion: null }
  /** El «Detener» de esta pestaña también lo pide al back: así queda CANCELADO y no TERMINADO. */
  const detener = () => {
    if (estado.parar) return
    estado.parar = true
    estado.cancelacion = procesosApi.cancelar(procesoId).catch(() => undefined)
  }

  anunciarProceso({ titulo, tipoDeProceso: tipo, procesoId })
  abrirCentroDeProcesos({ procesoId, titulo, tipoDeProceso: tipo })
  const soltarDetener = registrarDetenerEnElNavegador(procesoId, detener)

  // El avance, limitado: el último que se pidió y si ya salió.
  let ultimoEnvio = 0
  let pendiente: { hechos: number; total?: number; mensaje?: string } | null = null
  const enviar = async () => {
    if (!pendiente) return
    const avance = pendiente
    pendiente = null
    ultimoEnvio = Date.now()
    try {
      const { cancelado } = await procesosApi.avance(procesoId, avance)
      if (cancelado) estado.parar = true
    } catch {
      // Registrar nunca tumba el trabajo: un avance perdido sólo deja el anillo quieto.
    }
  }

  const ctx: ContextoDelTrabajo = {
    procesoId,
    async avanzar(hechos, extra = {}) {
      pendiente = { hechos, ...extra }
      if (Date.now() - ultimoEnvio >= MS_ENTRE_AVANCES) await enviar()
      return !estado.parar
    },
    debeParar: () => estado.parar,
  }

  try {
    let resultado: R
    try {
      resultado = await trabajo(ctx)
    } catch (err) {
      await procesosApi.fallar(procesoId, mensajeDelError(err)).catch(() => undefined)
      throw err
    }
    await enviar() // siempre el último avance, aunque no haya pasado el segundo
    if (estado.cancelacion) await estado.cancelacion

    const cierre = (resultado ?? {}) as ResultadoDelTrabajo
    try {
      await procesosApi.terminar(procesoId, {
        ...(cierre.archivo ? { archivo: cierre.archivo.blob, nombreDelArchivo: cierre.archivo.nombre } : {}),
        ...(cierre.mensaje ? { mensaje: cierre.mensaje } : {}),
        ...(cierre.titulo ? { titulo: cierre.titulo } : {}),
      })
    } catch {
      // El trabajo se hizo; lo que falló fue guardar el cierre. El archivo no
      // se pierde: se baja directo acá y el centro dice por qué no lo tiene.
      if (cierre.archivo) {
        descargarBlob(cierre.archivo.blob, cierre.archivo.nombre)
        await procesosApi
          .terminar(procesoId, {
            mensaje: [
              cierre.mensaje,
              'El archivo no se pudo guardar en el centro de procesos: se descargó en este navegador.',
            ]
              .filter(Boolean)
              .join(' '),
          })
          .catch(() => undefined)
      }
    }
    return { procesoId, enElCentro: true, detenido: estado.parar, resultado }
  } finally {
    soltarDetener()
  }
}

/**
 * Corre `tarea` sobre cada ítem con como mucho `n` EN VUELO a la vez — para
 * los bucles que hoy disparan cien peticiones juntas con `Promise.allSettled`.
 * Devuelve lo mismo que `Promise.allSettled`, en el orden de entrada.
 *
 * Dentro de `correrEnElNavegador`, la tarea mira `ctx.debeParar()` y vuelve
 * sin hacer nada: así «Detener» corta lo que falta sin abortar lo que ya va.
 */
export function concurrencia<T, R>(
  items: readonly T[],
  n: number,
  tarea: (item: T, indice: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  return mapWithConcurrency(items, n, tarea)
}
