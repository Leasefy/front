/**
 * Clasifica lo que falló al cargar una pantalla.
 *
 * El problema que resuelve: hoy todo error termina en el mismo cartel, con el
 * mensaje crudo del backend —en inglés— y un botón «Intentar de nuevo».
 * Sobre un 404 ese botón es una promesa falsa: por más que reintentes, la
 * propiedad no va a aparecer.
 *
 * Cuatro situaciones distintas, cuatro respuestas:
 *
 * | Situación        | Qué decimos                    | ¿Reintentar? |
 * |------------------|--------------------------------|--------------|
 * | Cargando         | esqueleto o spinner            | —            |
 * | No existe (404)  | «Eso ya no está» + volver      | **no**       |
 * | Sin permiso (403)| «No tienes acceso»              | **no**       |
 * | Falló (red, 5xx) | «No pudimos cargar»            | sí           |
 * | Existe y vacío   | el estado vacío                | —            |
 *
 * El estado vacío no se clasifica acá: no es un error, es una respuesta
 * correcta con cero elementos. Va con <EmptyState>.
 */

import { ApiError, getAccessToken } from '@/lib/api/client'

export type TipoDeFallo = 'noExiste' | 'sinPermiso' | 'sinSesion' | 'red' | 'servidor'

export interface FalloDeCarga {
  tipo: TipoDeFallo
  titulo: string
  descripcion: string
  /** Sólo lo que puede cambiar si volvés a pedirlo. */
  sePuedeReintentar: boolean
  /** El status HTTP, si lo hubo. 0 = ni siquiera salió el pedido. */
  status: number | null
  /** El mensaje original, para diagnóstico. Nunca se muestra tal cual. */
  mensajeOriginal: string | null
}

/** El nombre de lo que se estaba cargando, para que el cartel no sea genérico. */
export interface Contexto {
  /** «la propiedad», «el contrato», «la postulación»… con artículo. */
  queEs?: string
}

/** ¿Hay sesión viva? El token en memoria es la única prueba que tenemos acá. */
function hayToken(): boolean {
  return Boolean(getAccessToken())
}

function statusDe(error: unknown): number | null {
  if (error instanceof ApiError) return error.status
  // Algunos servicios reenvían el error sin conservar la clase.
  if (error && typeof error === 'object' && 'status' in error) {
    const s = (error as { status: unknown }).status
    if (typeof s === 'number') return s
  }
  return null
}

export function clasificarFallo(error: unknown, ctx: Contexto = {}): FalloDeCarga {
  const status = statusDe(error)
  const mensajeOriginal = error instanceof Error ? error.message : null
  const eso = ctx.queEs ?? 'esto'

  if (status === 404) {
    return {
      tipo: 'noExiste',
      titulo: `No encontramos ${eso}`,
      descripcion:
        'Puede que se haya eliminado, o que el enlace esté mal. Revisá la dirección o volvé al listado.',
      sePuedeReintentar: false,
      status,
      mensajeOriginal,
    }
  }

  if (status === 403) {
    return {
      tipo: 'sinPermiso',
      titulo: 'No tenés acceso a esto',
      descripcion:
        'Tu rol en la inmobiliaria no incluye esta sección. Pedile a un administrador que te lo habilite.',
      sePuedeReintentar: false,
      status,
      mensajeOriginal,
    }
  }

  if (status === 401) {
    // Un 401 en UNA llamada no prueba que la sesión murió, y decirlo cuando no
    // es cierto queda absurdo: el panel entero está renderizado alrededor del
    // cartel. Pasó en /postulaciones — `/users/me` daba 200 y la lista 401 en
    // la misma carga, por la carrera del token (ver src/lib/api/client.ts).
    //
    // Lo único que prueba que no hay sesión es que NO HAYA sesión. Y ese caso
    // ya lo maneja ProtectedRoute mandando al login: no llega hasta acá.
    if (hayToken()) {
      return {
        tipo: 'servidor',
        titulo: 'No pudimos cargar esto',
        descripcion:
          'Tu sesión sigue abierta; fue esta consulta la que no pasó. Probá de nuevo.',
        sePuedeReintentar: true,
        status,
        mensajeOriginal,
      }
    }
    return {
      tipo: 'sinSesion',
      titulo: 'Tu sesión se venció',
      descripcion: 'Volvé a entrar para seguir donde estabas.',
      sePuedeReintentar: false,
      status,
      mensajeOriginal,
    }
  }

  // status 0 = fetch ni siquiera salió: sin red, servidor caído, CORS.
  if (status === 0) {
    return {
      tipo: 'red',
      titulo: 'No pudimos conectarnos',
      descripcion:
        'Revisá tu conexión. Los datos siguen ahí; apenas vuelva la red los traemos.',
      sePuedeReintentar: true,
      status,
      mensajeOriginal,
    }
  }

  return {
    tipo: 'servidor',
    titulo: 'No pudimos cargar esto',
    descripcion:
      'Fue un problema nuestro, no tuyo. Probá de nuevo en un momento; si sigue igual, escribinos con la referencia de abajo.',
    sePuedeReintentar: true,
    status,
    mensajeOriginal,
  }
}

/** Atajo para el caso más común: ¿esto es un 404? */
export function esNoExiste(error: unknown): boolean {
  return statusDe(error) === 404
}

/**
 * ¿Esto es «no te corresponde»? (403)
 *
 * Sirve para las llamadas de apoyo: una pantalla puede pedir algo que sólo el
 * admin ve —las invitaciones pendientes, por ejemplo— y para el resto del
 * equipo ese 403 NO es un fallo, es la respuesta correcta. Cualquier otro
 * error sí lo es y hay que decirlo.
 */
export function esSinPermiso(error: unknown): boolean {
  return statusDe(error) === 403
}
