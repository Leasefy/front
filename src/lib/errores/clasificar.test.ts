import { describe, it, expect, afterEach } from 'vitest'
import { resetSessionTerminal, terminarSesion } from '@/lib/auth/session-terminal'
import { ApiError, setAccessToken } from '@/lib/api/client'
import { clasificarFallo, esNoExiste } from './clasificar'

describe('clasificarFallo', () => {
  afterEach(() => {
    setAccessToken(null)
    resetSessionTerminal()
  })

  it('un 404 no se puede reintentar: por más que insistas no va a aparecer', () => {
    const fallo = clasificarFallo(new ApiError(404, 'Property with ID abc not found'))
    expect(fallo.tipo).toBe('noExiste')
    expect(fallo.sePuedeReintentar).toBe(false)
  })

  it('un fallo de red sí se puede reintentar: la red vuelve', () => {
    const fallo = clasificarFallo(new ApiError(0, 'Failed to fetch'))
    expect(fallo.tipo).toBe('red')
    expect(fallo.sePuedeReintentar).toBe(true)
  })

  it('un 500 se puede reintentar: el servidor puede recuperarse', () => {
    const fallo = clasificarFallo(new ApiError(500, 'Internal server error'))
    expect(fallo.tipo).toBe('servidor')
    expect(fallo.sePuedeReintentar).toBe(true)
  })

  it('un 403 no se reintenta: el permiso no cambia por volver a pedirlo', () => {
    const fallo = clasificarFallo(new ApiError(403, 'Forbidden'))
    expect(fallo.tipo).toBe('sinPermiso')
    expect(fallo.sePuedeReintentar).toBe(false)
  })

  it('un 401 CON sesión viva no dice que la sesión se venció', () => {
    // Lo cazó Nico mirando la pantalla: el panel entero renderizado alrededor
    // de un cartel que decía «tu sesión se venció». `/users/me` daba 200 y la
    // lista 401 en la misma carga — era la carrera del token, no la sesión.
    setAccessToken('token-vivo')
    const fallo = clasificarFallo(new ApiError(401, 'Unauthorized'))
    expect(fallo.tipo).not.toBe('sinSesion')
    expect(fallo.titulo).not.toContain('sesión se venció')
    expect(fallo.sePuedeReintentar).toBe(true)
  })

  it('un 401 SIN sesión sí manda a entrar de nuevo, y no a reintentar', () => {
    setAccessToken(null)
    const fallo = clasificarFallo(new ApiError(401, 'Unauthorized'))
    expect(fallo.tipo).toBe('sinSesion')
    expect(fallo.sePuedeReintentar).toBe(false)
  })

  it('el mensaje del backend nunca es lo que se muestra', () => {
    const crudo = 'Property with ID 1111-2222 not found'
    const fallo = clasificarFallo(new ApiError(404, crudo), { queEs: 'esa propiedad' })
    expect(fallo.titulo).not.toContain(crudo)
    expect(fallo.descripcion).not.toContain(crudo)
    // pero se conserva, porque sin él no se puede diagnosticar
    expect(fallo.mensajeOriginal).toBe(crudo)
  })

  it('nombra lo que se estaba cargando en vez de decir «esto»', () => {
    expect(clasificarFallo(new ApiError(404, 'x'), { queEs: 'esa propiedad' }).titulo)
      .toBe('No encontramos esa propiedad')
    expect(clasificarFallo(new ApiError(404, 'x')).titulo).toBe('No encontramos esto')
  })

  it('lee el status aunque el servicio haya perdido la clase ApiError', () => {
    // Varios servicios reenvían un objeto plano; si sólo confiáramos en
    // `instanceof` un 404 se degradaría a «error de servidor» y volvería a
    // aparecer el botón de reintentar.
    const fallo = clasificarFallo({ status: 404, message: 'not found' })
    expect(fallo.tipo).toBe('noExiste')
  })

  it('un error sin status es de servidor, que es el supuesto seguro', () => {
    // Seguro porque ofrecer reintentar de más molesta; no ofrecerlo cuando
    // habría funcionado deja a la persona sin salida.
    const fallo = clasificarFallo(new Error('boom'))
    expect(fallo.tipo).toBe('servidor')
    expect(fallo.sePuedeReintentar).toBe(true)
  })

  it('esNoExiste distingue el 404 de todo lo demás', () => {
    expect(esNoExiste(new ApiError(404, 'x'))).toBe(true)
    expect(esNoExiste(new ApiError(500, 'x'))).toBe(false)
    expect(esNoExiste(new Error('x'))).toBe(false)
    expect(esNoExiste(null)).toBe(false)
  })
})

/**
 * El caso que este archivo existía para NO cubrir: un 401 que sí prueba que la
 * sesión murió. Antes todos caían en «Tu sesión sigue abierta; probá de nuevo»
 * porque `_accessToken` conserva el último token —vencido, pero presente— así
 * que el chequeo por token respondía "hay sesión" justo cuando ya no la había.
 */
describe('clasificarFallo — 401 de sesión muerta', () => {
  afterEach(() => {
    setAccessToken(null)
    resetSessionTerminal()
  })

  it.each(['AUTH_TOKEN_EXPIRED', 'AUTH_TOKEN_INVALID', 'SESSION_SUPERSEDED'])(
    'un 401 con %s dice que la sesión se venció y NO ofrece reintentar',
    (code) => {
      // El token vencido sigue en memoria: es exactamente el escenario del bug.
      setAccessToken('token-vencido-pero-presente')

      const fallo = clasificarFallo(new ApiError(401, 'sesión muerta', code))

      expect(fallo.tipo).toBe('sinSesion')
      expect(fallo.sePuedeReintentar).toBe(false)
    },
  )

  it('con la sesión ya declarada muerta, cualquier 401 deja de ofrecer reintento', () => {
    setAccessToken('token-vencido-pero-presente')
    terminarSesion('expirada')

    const fallo = clasificarFallo(new ApiError(401, 'lo que sea'))

    expect(fallo.tipo).toBe('sinSesion')
    expect(fallo.sePuedeReintentar).toBe(false)
  })

  /**
   * La contraparte que no se puede romper: un 401 suelto durante la carrera de
   * la renovación NO es una sesión muerta. Decirlo cuando no es cierto queda
   * absurdo — el panel entero está renderizado alrededor del cartel.
   */
  it('un 401 sin código y con sesión viva sigue siendo un tropiezo reintentable', () => {
    setAccessToken('token-vivo')

    const fallo = clasificarFallo(new ApiError(401, 'Unauthorized'))

    expect(fallo.tipo).toBe('servidor')
    expect(fallo.sePuedeReintentar).toBe(true)
  })

  it('AUTH_TOKEN_MISSING no es sesión muerta (carrera del arranque)', () => {
    setAccessToken('token-vivo')

    const fallo = clasificarFallo(new ApiError(401, 'No autorizado', 'AUTH_TOKEN_MISSING'))

    expect(fallo.tipo).toBe('servidor')
    expect(fallo.sePuedeReintentar).toBe(true)
  })
  /**
   * ── El status que el transporte tiraba a la basura ────────────────────────
   *
   * Nico lo vio EN PRODUCCIÓN, en el Piloto automático: las dos tarjetas con
   * «No pudimos cargar esto — fue un problema nuestro, no tuyo», referencia
   * `SER-1601`, y un botón «Intentar de nuevo». El «SER» es la pista: la
   * referencia es `status ?? tipo.slice(0,3)`, así que no había status.
   *
   * Las 82 llamadas del panel al micro hacen todas
   * `throw new Error(\`${res.status}\`)` y el hook guarda `err.message` en un
   * `useState<string | null>`. Lo que llega acá es el string «403».
   */
  it('«403» como string sigue siendo un 403, no un problema nuestro', () => {
    const fallo = clasificarFallo('403')

    expect(fallo.status).toBe(403)
    expect(fallo.tipo).toBe('sinPermiso')
    // Lo que de verdad importa: el botón que no podía funcionar nunca.
    expect(fallo.sePuedeReintentar).toBe(false)
  })

  it('«404» como string no ofrece reintentar', () => {
    const fallo = clasificarFallo('404')

    expect(fallo.status).toBe(404)
    expect(fallo.tipo).toBe('noExiste')
    expect(fallo.sePuedeReintentar).toBe(false)
  })

  it('«401» como string sin sesión manda a entrar de nuevo, no a reintentar', () => {
    const fallo = clasificarFallo('401')

    expect(fallo.tipo).toBe('sinSesion')
    expect(fallo.sePuedeReintentar).toBe(false)
  })

  it('un Error cuyo mensaje ES el status también cuenta', () => {
    // La forma exacta que tiran los hooks antes de aplanarse a string.
    const fallo = clasificarFallo(new Error('500'))

    expect(fallo.status).toBe(500)
    expect(fallo.tipo).toBe('servidor')
    expect(fallo.sePuedeReintentar).toBe(true)
  })

  it('un número suelto DENTRO de una frase no se confunde con un status', () => {
    // El guardián de la regla: si esto se relajara, «404 registros sin
    // procesar» mandaría a la persona a un cartel de «no existe».
    const fallo = clasificarFallo('Se cayeron 404 registros')

    expect(fallo.status).toBeNull()
    expect(fallo.tipo).toBe('servidor')
  })

  it('un status fuera del rango HTTP no se inventa', () => {
    const fallo = clasificarFallo('900')

    expect(fallo.status).toBeNull()
  })

  /**
   * `fetch` no rechaza con un status: tira un TypeError cuyo texto cambia con
   * el navegador. Sin esto, quedarse sin red se anunciaba como «fue un
   * problema nuestro, no tuyo» — y la rama `status === 0` del clasificador era
   * código muerto para todo el panel.
   */
  it.each([
    ['Chrome', 'Failed to fetch'],
    ['Firefox', 'NetworkError when attempting to fetch resource.'],
    ['Safari', 'Load failed'],
  ])('quedarse sin red se dice como red, no como culpa nuestra (%s)', (_navegador, mensaje) => {
    const fallo = clasificarFallo(new TypeError(mensaje))

    expect(fallo.status).toBe(0)
    expect(fallo.tipo).toBe('red')
    expect(fallo.sePuedeReintentar).toBe(true)
  })

  it('el mensaje crudo sobrevive aunque el error venga aplanado a string', () => {
    // Es el único rastro técnico que le queda a soporte: vive en el nodo
    // `sr-only` del cartel.
    expect(clasificarFallo('503').mensajeOriginal).toBe('503')
  })

  it('sin la URL del micro no se ofrece un reintento que no puede funcionar', () => {
    const fallo = clasificarFallo('not_configured')

    expect(fallo.sePuedeReintentar).toBe(false)
  })
})
