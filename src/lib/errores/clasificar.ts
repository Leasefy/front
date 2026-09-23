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
import { cuantoEsperar } from '@/lib/api/demasiadas-solicitudes'

export type TipoDeFallo =
  | 'noExiste'
  | 'sinPermiso'
  | 'sinSesion'
  | 'red'
  | 'servidor'
  | 'limitado'
  /** 402: el plan se quedó sin créditos de IA. Reintentar no compra créditos. */
  | 'sinCreditos'
  /**
   * 403 marcado `SEGUNDO_FACTOR_REQUERIDO`: el rol exige segundo factor y esta
   * sesión entró sólo con contraseña. No es «no tienes acceso»: la persona SÍ
   * tiene el permiso, le falta un paso que puede dar ella misma.
   */
  | 'sinSegundoFactor'
  /** El pedido se cortó por tiempo (o se abortó) antes de que hubiera respuesta. */
  | 'tardo'
  /**
   * 503 marcado `FALTA_UNA_MIGRACION`: esta base está atrás del código. No es
   * un fallo del servidor ni algo que la persona pueda resolver — es un
   * despliegue a medias.
   */
  | 'baseAtrasada'

export interface FalloDeCarga {
  tipo: TipoDeFallo
  titulo: string
  descripcion: string
  /** Sólo lo que puede cambiar si vuelves a pedirlo. */
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
  /**
   * ¿El FRONT cree que esta persona sí tiene acceso? Lo sabe por
   * `my-permissions`, que es otra fuente distinta de la que decide cada
   * llamada. Cuando las dos no coinciden —el panel te deja entrar y el
   * servidor te cierra la puerta— el cartel tiene que decir que el problema
   * es nuestro, no mandarte a pedir un permiso que ya tienes.
   */
  creoQueTengoAcceso?: boolean
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
 * «Prueba de nuevo» para siempre.
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
  // tarjetas decían «Fue un problema nuestro, no tuyo. Prueba de nuevo» con
  // referencia SER-1601 — «SER» porque no había status que poner. Un 403 (no
  // tienes permiso) y un 401 (tu sesión venció) se pintaban idénticos a un 500,
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

/**
 * ¿El fallo es «te falta el segundo factor»?
 *
 * Se mira el `code` en cualquier forma que llegue —instancia de `ApiError`,
 * objeto plano, o el cuerpo del back pegado al error— porque el discriminante
 * es el código, no la clase de JavaScript que lo envuelve.
 */
/**
 * Lo que el back mandó en el cuerpo del «no»: su código y, si lo trae, qué
 * módulo y qué acción negó.
 *
 * Se mira en los tres sitios donde puede aparecer —el `ApiError`, el objeto
 * plano, y el `body` de un error re-envuelto— por la misma razón que lo hacía
 * `esSegundoFactor`: un error que cruzó un servicio que lo re-empaqueta deja
 * de ser `ApiError` aunque traiga el mismo código, y el 20-09 eso dejó MUERTO
 * en media aplicación el aviso del segundo factor.
 */
export interface CuerpoDelNo {
  code?: string
  module?: string
  action?: string
  role?: string
}

export function cuerpoDelNo(error: unknown): CuerpoDelNo {
  const leer = (o: unknown): CuerpoDelNo => {
    if (!o || typeof o !== 'object') return {}
    const e = o as Record<string, unknown>
    const texto = (v: unknown) => (typeof v === 'string' ? v : undefined)
    return {
      code: texto(e.code),
      module: texto(e.module),
      action: texto(e.action),
      role: texto(e.role),
    }
  }
  /*
   * Los dos sitios se MEZCLAN, no se elige uno. `ApiError` sube el `code` a una
   * propiedad suya y deja el resto del cuerpo en `body`, así que quedarse con
   * el primero que tuviera código perdía el `module` — y sin módulo el cartel
   * no puede nombrar la sección, que es justo lo que se agregó hoy.
   */
  const directo = leer(error)
  const otros =
    error && typeof error === 'object'
      ? [
          // `body` es como viene un error re-envuelto por un servicio…
          leer((error as { body?: unknown }).body),
          // …y `detalle` es como lo guarda `ApiError`, que sube `code` a una
          // propiedad suya y deja el resto del cuerpo acá. Los dos nombres
          // existen de verdad en este repo; leer sólo uno pierde el módulo.
          leer((error as { detalle?: unknown }).detalle),
        ]
      : []
  const primero = (campo: keyof CuerpoDelNo) =>
    directo[campo] ?? otros.map((o) => o[campo]).find((v) => v !== undefined)
  return {
    code: primero('code'),
    module: primero('module'),
    action: primero('action'),
    role: primero('role'),
  }
}

export function esSegundoFactor(error: unknown): boolean {
  const CODIGO = 'SEGUNDO_FACTOR_REQUERIDO'
  if (error instanceof ApiError && error.code === CODIGO) return true
  return cuerpoDelNo(error).code === CODIGO
}

/**
 * Cómo se llama en pantalla el módulo que el back nombró. Sin esto el cartel
 * diría «pipeline» —una llave interna— o, peor, no diría cuál.
 */
const NOMBRE_DEL_MODULO: Record<string, string> = {
  pipeline: 'Pipeline',
  inmuebles: 'Inmuebles',
  propietarios: 'Propietarios',
  contratos: 'Contratos',
  cobros: 'Cobros',
  dispersiones: 'Dispersiones',
  conciliacion: 'Conciliación',
  contabilidad: 'Contabilidad',
  portafolio: 'Portafolio',
  documentos: 'Documentos',
  postulaciones: 'Postulaciones',
  mantenimiento: 'Mantenimientos',
  agentes: 'Equipo',
  analytics: 'Reportes',
  operaciones: 'Operación',
  // QA 22-09 (P2): el cartel decía «No tienes acceso a configuracion», la llave
  // interna. Son los módulos que el back nombra y faltaban acá.
  configuracion: 'Configuración',
  reportes: 'Reportes',
  clientes: 'Clientes',
  dashboard: 'Inicio',
  subscription: 'Suscripción',
  avaluos: 'Avalúos',
  nomina: 'Nómina',
}

/**
 * ¿El pedido se cortó por tiempo antes de tener respuesta?
 *
 * `AbortSignal.timeout()` rechaza con un `TimeoutError`; un `AbortController`
 * con un `AbortError`; algunos clientes tiran un `Error` que dice «timeout».
 * Sólo se consulta cuando NO hubo status: un 404 cuyo texto menciona
 * «timeout» sigue siendo un 404.
 */
function esCorteDeTiempo(error: unknown): boolean {
  if (error && typeof error === 'object' && 'name' in error) {
    const nombre = (error as { name: unknown }).name
    if (nombre === 'TimeoutError' || nombre === 'AbortError') return true
  }
  const texto = textoDe(error)
  return Boolean(texto && /timed?[\s-]?out/i.test(texto))
}

export function clasificarFallo(error: unknown, ctx: Contexto = {}): FalloDeCarga {
  const status = statusDe(error)
  const mensajeOriginal = textoDe(error)
  const eso = ctx.queEs ?? 'esto'

  /*
   * 🔴 La base atrasada va PRIMERO, antes de cualquier status (21-09-2026).
   *
   * Llega como 503 y sin esta rama caería en «servidor» — «fue un problema
   * nuestro, prueba de nuevo en un momento»—, que es exactamente lo que no
   * hay que decir: reintentar no aplica una migración, y el cartel genérico
   * hizo que veinte pantallas rotas por LA MISMA columna se vieran como
   * veinte problemas distintos.
   */
  if (cuerpoDelNo(error).code === 'FALTA_UNA_MIGRACION') {
    return {
      tipo: 'baseAtrasada',
      titulo: `No podemos mostrar ${eso} ahora mismo`,
      descripcion:
        'Es algo nuestro y ya sabemos qué es: quedó una actualización del sistema a medio terminar. No se arregla reintentando; se resuelve del lado nuestro.',
      // Reintentar no cambia nada hasta que alguien aplique la migración.
      sePuedeReintentar: false,
      status,
      mensajeOriginal,
    }
  }

  if (status === 404) {
    return {
      tipo: 'noExiste',
      titulo: `No encontramos ${eso}`,
      descripcion:
        'Puede que se haya eliminado, o que el enlace esté mal. Revisa la dirección o vuelve al listado.',
      sePuedeReintentar: false,
      status,
      mensajeOriginal,
    }
  }

  // Un 402 no es un tropiezo: el plan se quedó sin créditos de IA. Ofrecer
  // «Intentar de nuevo» ahí es la misma promesa falsa que sobre un 404 — la
  // consulta no va a pasar hasta que alguien recargue.
  if (status === 402) {
    return {
      tipo: 'sinCreditos',
      titulo: 'Tu plan se quedó sin créditos de IA',
      descripcion:
        'Pídele a quien administra la cuenta que recargue o cambie de plan. Hasta entonces, reintentar no va a cambiar nada.',
      sePuedeReintentar: false,
      status,
      mensajeOriginal,
    }
  }

  if (status === 403) {
    // 🔴 El asesor comercial abriendo un inmueble ARRENDADO (17-09-2026): no es
    // «no tienes acceso a esto» en general, es que la operación de ese
    // inmueble no es de su rol. El back lo marca con su propio código.
    if (error instanceof ApiError && error.code === 'INMUEBLE_ARRENDADO') {
      return {
        tipo: 'sinPermiso',
        titulo: 'Este inmueble está arrendado',
        descripcion:
          'Su operación —el contrato, los cobros, el inventario de la entrega— no hace parte de tu rol. Si la necesitas, pídele a un administrador el permiso de ver contratos.',
        sePuedeReintentar: false,
        status,
        mensajeOriginal,
      }
    }
    // 🔴 EL ADMINISTRADOR AL QUE LE DECÍAMOS QUE LE PIDIERA A UN ADMINISTRADOR
    // (18-09-2026). Cuando el back exige segundo factor, el 403 cubre TODO el
    // panel menos `users/me`, `auth/`, `health` y `config/`. Pintado como el
    // 403 genérico de abajo, la pantalla le dice a quien manda en la
    // inmobiliaria que le pida permiso a alguien más — y no hay a quién: el
    // permiso lo tiene, lo que le falta es activar el TOTP, que es algo que
    // hace él mismo en dos minutos. Un cartel sin salida repetido en las 25
    // secciones del panel.
    /* 🔴 20-09 · Este arreglo del 18-09 estaba MUERTO en la mitad de las
       pantallas. Exigía `instanceof ApiError`, y un error que cruzó un
       servicio que lo re-envuelve —o que llegó como objeto plano— deja de
       serlo aunque traiga el mismo `code`. Medido con «Deterioro de cartera»
       abierta: arriba salía «No tienes acceso a esto · Pídele a un
       administrador que te lo habilite» y ABAJO, en letra chica, el motivo de
       verdad. El administrador leía primero que le pidiera permiso a alguien
       que es él mismo.

       Se reconoce por el `code`, venga en lo que venga. */
    if (esSegundoFactor(error)) {
      return {
        tipo: 'sinSegundoFactor',
        titulo: 'Activa tu segundo factor para seguir',
        descripcion:
          'Tu rol maneja la plata de propietarios e inquilinos, así que entrar con contraseña no alcanza. Actívalo una vez en Configuración → Seguridad y vuelve a entrar: son dos minutos.',
        // Reintentar no cambia nada: el token de esta sesión ya nació sin el
        // segundo factor. Hay que activarlo y volver a entrar.
        sePuedeReintentar: false,
        status,
        mensajeOriginal,
      }
    }
    /*
     * 🔴 Los otros tres «no» del panel (21-09-2026). Hasta hoy los tres caían
     * en el cartel genérico de abajo, que le echa la culpa a tu ROL. Nico lo
     * preguntó mirando el Pipeline: «¿por qué no me das acceso a todo?» — y la
     * respuesta no era su rol.
     */
    const cuerpo = cuerpoDelNo(error)

    if (cuerpo.code === 'SIN_MEMBRESIA_ACTIVA') {
      return {
        tipo: 'sinPermiso',
        titulo: 'Tu cuenta no está activa en ninguna inmobiliaria',
        descripcion:
          'No es un permiso que falte: es la membresía. Si te acaban de invitar, acepta la invitación desde el correo; si trabajabas acá, pídele a un administrador que te reactive.',
        sePuedeReintentar: false,
        status,
        mensajeOriginal,
      }
    }

    if (cuerpo.code === 'INMOBILIARIA_NO_ES_TUYA') {
      return {
        tipo: 'sinPermiso',
        titulo: 'Esa inmobiliaria no es tuya',
        descripcion:
          'Estás pidiendo datos de una inmobiliaria en la que no eres miembro. Vuelve a entrar y elige la tuya en el selector de arriba.',
        sePuedeReintentar: false,
        status,
        mensajeOriginal,
      }
    }

    if (cuerpo.code === 'SIN_PERMISO_DE_MODULO') {
      const seccion = cuerpo.module
        ? (NOMBRE_DEL_MODULO[cuerpo.module] ?? cuerpo.module)
        : null
      /*
       * El desacuerdo. El panel te dejó entrar porque `my-permissions` dijo
       * que sí, y la llamada la negó el servidor. Echarle la culpa al rol acá
       * es mandar a alguien —muchas veces al administrador mismo— a pedirle
       * un permiso que ya tiene, y a no encontrarlo nunca.
       */
      if (ctx.creoQueTengoAcceso) {
        return {
          tipo: 'sinPermiso',
          titulo: seccion
            ? `No pudimos abrir ${seccion}, y no es por tus permisos`
            : 'No pudimos abrir esto, y no es por tus permisos',
          descripcion:
            'Tu cuenta figura con acceso a esta sección y aun así el servidor la negó. Es un problema nuestro, no tuyo: escríbenos con la referencia de abajo y lo miramos.',
          sePuedeReintentar: false,
          status,
          mensajeOriginal,
        }
      }
      return {
        tipo: 'sinPermiso',
        titulo: seccion ? `No tienes acceso a ${seccion}` : 'No tienes acceso a esto',
        descripcion: seccion
          ? `Tu rol en la inmobiliaria no incluye ${seccion}. Pídele a un administrador que te lo habilite.`
          : 'Tu rol en la inmobiliaria no incluye esta sección. Pídele a un administrador que te lo habilite.',
        sePuedeReintentar: false,
        status,
        mensajeOriginal,
      }
    }

    return {
      tipo: 'sinPermiso',
      titulo: 'No tienes acceso a esto',
      descripcion:
        'Tu rol en la inmobiliaria no incluye esta sección. Pídele a un administrador que te lo habilite.',
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
    // «Prueba de nuevo» en ese hueco es exactamente el bug que se está
    // arreglando.
    if (error instanceof ApiError && esCodigoDeSesionMuerta(error.code)) {
      return {
        tipo: 'sinSesion',
        titulo: 'Tu sesión se venció',
        descripcion: 'Vuelve a entrar para seguir donde estabas.',
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
          'Tu sesión sigue abierta; fue esta consulta la que no pasó. Prueba de nuevo.',
        sePuedeReintentar: true,
        status,
        mensajeOriginal,
      }
    }
    return {
      tipo: 'sinSesion',
      titulo: 'Tu sesión se venció',
      descripcion: 'Vuelve a entrar para seguir donde estabas.',
      sePuedeReintentar: false,
      status,
      mensajeOriginal,
    }
  }

  // T-0076: un 429 (rate limit del gateway, `agents_limit` en NGINX) NO es
  // «un problema nuestro» — es el sistema protegiéndose de un pico. Decirlo
  // como un 500 genérico invita a machacar «Intentar de nuevo», que es
  // exactamente lo que agravó el burst original (ver ledger de la tarea).
  if (status === 429) {
    // 23-09: el limitador del back dice cuánto falta (`reintentarEnSegundos`,
    // lo pone `client.ts`). Con el número, la persona sabe cuándo volver en
    // vez de machacar «Intentar de nuevo».
    const espera =
      error instanceof ApiError &&
      typeof error.detalle?.reintentarEnSegundos === 'number'
        ? (error.detalle.reintentarEnSegundos as number)
        : null
    return {
      tipo: 'limitado',
      titulo: 'Estamos recibiendo muchas solicitudes',
      descripcion: espera
        ? `Espera ${cuantoEsperar(espera)} y vuelve a intentar — no es un error, es el sistema protegiéndose de una ráfaga.`
        : 'Dale un momento y vuelve a intentar — no es un error, es el sistema poniéndose al día.',
      sePuedeReintentar: true,
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
        'Revisa tu conexión. Los datos siguen ahí; apenas vuelva la red los traemos.',
      sePuedeReintentar: true,
      status,
      mensajeOriginal,
    }
  }

  if (status === null && esCorteDeTiempo(error)) {
    return {
      tipo: 'tardo',
      titulo: 'Tardó demasiado en responder',
      descripcion:
        'La consulta se cortó antes de terminar. Prueba de nuevo en un momento.',
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
        'Falta una pieza de nuestro lado, no algo que puedas resolver desde acá. Escríbenos con la referencia de abajo y lo habilitamos.',
      sePuedeReintentar: false,
      status,
      mensajeOriginal,
    }
  }

  return {
    tipo: 'servidor',
    titulo: 'No pudimos cargar esto',
    descripcion:
      'Fue un problema nuestro, no tuyo. Prueba de nuevo en un momento; si sigue igual, escríbenos con la referencia de abajo.',
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
