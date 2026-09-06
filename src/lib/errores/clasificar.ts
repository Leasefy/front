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

import { ApiError, getAccessToken, esCodigoDeSesionMuerta } from '@/lib/api/client'
import { sesionTerminada } from '@/lib/auth/session-terminal'

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

/**
 * ¿Hay sesión viva?
 *
 * Dos preguntas, no una. `sesionTerminada()` es la respuesta AUTORITATIVA:
 * cuando el backend contestó con un código de sesión muerta, ya no hay nada que
 * deducir. El token en memoria es el indicio de segunda mano para todo lo demás.
 *
 * El orden importa: al morir el refresh token, `_accessToken` sigue teniendo el
 * último valor —vencido, pero presente— así que preguntar sólo por el token
 * daba "sesión viva" justo cuando ya no la había, y la pantalla ofrecía
 * «Probá de nuevo» para siempre.
 */
function haySesionViva(): boolean {
  if (sesionTerminada()) return false
  return Boolean(getAccessToken())
}

/** Un mensaje que ES el status y nada más: lo que tiran los hooks del micro. */
const SOLO_EL_STATUS = /^[1-5]\d\d$/

/**
 * Lo que dice cada navegador cuando el pedido NO llegó a salir.
 * Chrome, Firefox, Safari y React Native, en ese orden.
 */
const ASI_SUENA_LA_RED_CAIDA = [
  'failed to fetch',
  'networkerror',
  'load failed',
  'network request failed',
]

/** El texto del error, venga como Error o como string ya aplanado. */
function textoDe(error: unknown): string | null {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return null
}

function statusDe(error: unknown): number | null {
  if (error instanceof ApiError) return error.status
  // Algunos servicios reenvían el error sin conservar la clase.
  if (error && typeof error === 'object' && 'status' in error) {
    const s = (error as { status: unknown }).status
    if (typeof s === 'number') return s
  }

  // 🔴 Acá se recupera un status que el transporte tira a la basura.
  //
  // Las 82 llamadas del panel al microservicio de agentes hacen, todas, lo
  // mismo:  `if (!res.ok) throw new Error(\`${res.status}\`)`  y después el
  // hook guarda `err.message` en un `useState<string | null>`. Para cuando el
  // error llega hasta acá ya no es un `ApiError` ni tiene `.status`: es el
  // string «403».
  //
  // El resultado se vio en producción, en el Piloto automático: las dos
  // tarjetas decían «Fue un problema nuestro, no tuyo. Probá de nuevo» con
  // referencia SER-1601 — «SER» porque no había status que poner. Un 403 (no
  // tenés permiso) y un 401 (tu sesión venció) se pintaban idénticos a un 500,
  // los tres con un botón «Intentar de nuevo» que no podía funcionar nunca.
  // Que es exactamente el bug que esta tabla de cuatro estados existe para
  // evitar, derrotado un piso más abajo.
  //
  // Se acepta SÓLO cuando el mensaje entero es el número, para que un
  // «Se cayeron 404 registros» no se lea como un 404.
  const texto = textoDe(error)?.trim()
  if (!texto) return null
  if (SOLO_EL_STATUS.test(texto)) return Number(texto)

  // `fetch` no rechaza con un status: tira un TypeError cuyo texto depende del
  // navegador. Sin esto, quedarse sin red se anunciaba como «fue un problema
  // nuestro» — y la rama `status === 0` de acá abajo era código muerto para
  // todo el panel.
  const enMinuscula = texto.toLowerCase()
  if (ASI_SUENA_LA_RED_CAIDA.some((senal) => enMinuscula.includes(senal))) return 0

  return null
}

export function clasificarFallo(error: unknown, ctx: Contexto = {}): FalloDeCarga {
  const status = statusDe(error)
  const mensajeOriginal = textoDe(error)
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
    // La EXCEPCIÓN es un 401 que viene marcado: ahí el servidor no está
    // reportando un tropiezo, está diciendo que la sesión no vuelve. Se chequea
    // antes que nada porque el cierre global es asíncrono —esta pantalla puede
    // clasificar su error antes de que la bandera se levante— y mostrar
    // «Probá de nuevo» en ese hueco es exactamente el bug que se está
    // arreglando.
    if (error instanceof ApiError && esCodigoDeSesionMuerta(error.code)) {
      return {
        tipo: 'sinSesion',
        titulo: 'Tu sesión se venció',
        descripcion: 'Volvé a entrar para seguir donde estabas.',
        sePuedeReintentar: false,
        status,
        mensajeOriginal,
      }
    }

    if (haySesionViva()) {
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

  // `not_configured` = a este build le falta la URL del microservicio de
  // agentes. No es un tropiezo del servidor: es una pieza que nunca se
  // enchufó, y ninguna cantidad de reintentos la va a enchufar. Ofrecer
  // «Intentar de nuevo» ahí es el mismo botón falso que un reintento sobre un
  // 404.
  if (mensajeOriginal?.trim() === 'not_configured') {
    return {
      tipo: 'servidor',
      titulo: 'Esto todavía no está conectado',
      descripcion:
        'Falta una pieza de nuestro lado, no algo que puedas resolver desde acá. Escribinos con la referencia de abajo y lo habilitamos.',
      sePuedeReintentar: false,
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
